<?php

namespace App\Services;

use App\Mail\AppointmentRescheduledMail;
use App\Models\Account;
use App\Models\Appointment;
use App\Models\AuditLog;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

/**
 * Theo dõi nhân viên xử lý lịch hẹn: mỗi thao tác ghi audit_logs + cập nhật handled_by_account_id.
 * Cố vấn đổi lịch giúp khách: bắt buộc lý do, kiểm khung giờ như khi khách đặt, báo khách (web + email).
 */
class AppointmentActivityService
{
    public const CREATED = 'appointment.created_by_staff';

    public const CONFIRMED = 'appointment.confirmed';

    public const CHECKED_IN = 'appointment.checked_in';

    public const CANCELLED = 'appointment.cancelled';

    public const RESCHEDULED = 'appointment.rescheduled';

    public const NO_SHOW = 'appointment.no_show';

    public function __construct(
        private readonly AppointmentSlotService $slots,
        private readonly CustomerNotifier $notifier,
    ) {}

    public function record(Appointment $appointment, string $action, Account $actor, array $old = [], array $new = [], ?string $reason = null): void
    {
        $appointment->forceFill(['handled_by_account_id' => $actor->id])->save();
        AuditLog::query()->create([
            'account_id' => $actor->id,
            'action' => $action,
            'auditable_type' => Appointment::class,
            'auditable_id' => $appointment->id,
            'old_values' => $old ?: null,
            'new_values' => $new ?: null,
            'reason' => $reason,
            'ip_address' => request()->ip(),
            'user_agent' => substr((string) request()->userAgent(), 0, 1000),
        ]);
    }

    /** Lý do đổi lịch (cố vấn chọn) → nhãn tiếng Việt ghi vào lịch sử / gửi khách. */
    public const RESCHEDULE_REASONS = [
        'CUSTOMER_REQUEST' => 'Khách hàng yêu cầu',
        'GARAGE_ADJUSTMENT' => 'Gara cần điều chỉnh khung giờ',
        'OTHER' => 'Lý do khác',
    ];

    /** Cách cố vấn đã thống nhất giờ mới với khách. */
    public const CONTACT_METHODS = ['PHONE' => 'Điện thoại', 'IN_PERSON' => 'Trực tiếp tại gara', 'OTHER' => 'Kênh khác'];

    /**
     * Cố vấn đổi lịch SAU KHI đã thống nhất với khách (khách không phải xác nhận lại trên web):
     * chỉ lịch Chờ xác nhận / Đã xác nhận, giữ nguyên trạng thái, kiểm khung giờ như khi đặt, khoá dòng chống hai người đổi cùng lúc,
     * ghi lịch sử (giờ cũ → mới, lý do, cách liên hệ, người đổi) và báo khách bằng kênh sẵn có (chuông web + email).
     *
     * @param  array{reason_type?: string, contact_method?: string, expected_date?: string|null, expected_time?: string|null}  $meta
     */
    public function reschedule(Appointment $appointment, string $date, string $time, string $reason, Account $actor, array $meta = []): Appointment
    {
        $this->assertReschedulable($appointment);
        $time = strlen($time) === 5 ? "$time:00" : $time;

        $old = [];
        $updated = DB::transaction(function () use ($appointment, $date, $time, $reason, $actor, $meta, &$old): Appointment {
            $locked = Appointment::query()->lockForUpdate()->findOrFail($appointment->id);
            // Kiểm lại sau khi khoá: người khác có thể vừa tiếp nhận / huỷ / đổi lịch này.
            $this->assertReschedulable($locked);
            $old = ['appointment_date' => Carbon::parse($locked->appointment_date)->toDateString(), 'appointment_time' => substr((string) $locked->appointment_time, 0, 8)];
            $expectedDate = $meta['expected_date'] ?? null;
            $expectedTime = isset($meta['expected_time']) ? substr((string) $meta['expected_time'], 0, 5) : null;
            if (($expectedDate && $expectedDate !== $old['appointment_date']) || ($expectedTime && $expectedTime !== substr($old['appointment_time'], 0, 5))) {
                throw ValidationException::withMessages(['appointment_date' => 'Lịch hẹn vừa được người khác đổi sang '.substr($old['appointment_time'], 0, 5).' ngày '
                    .Carbon::parse($old['appointment_date'])->format('d/m/Y').'. Vui lòng tải lại và kiểm tra trước khi đổi.']);
            }
            if ($old['appointment_date'] === $date && $old['appointment_time'] === $time) {
                throw ValidationException::withMessages(['appointment_time' => 'Ngày giờ mới trùng với lịch hiện tại.']);
            }
            // ADV-04: cố vấn đổi lịch chỉ vào khung giờ đặt lịch đã cấu hình (ngày nghỉ, giờ làm việc, sức chứa, trùng xe).
            $this->slots->assertBookable($date, $time, (int) $locked->vehicle_id, (int) $locked->id, requireConfiguredSlot: true);
            // Chỉ đổi ngày giờ — trạng thái (Chờ xác nhận / Đã xác nhận) giữ nguyên.
            $locked->update(['appointment_date' => $date, 'appointment_time' => $time]);
            $this->record($locked, self::RESCHEDULED, $actor, $old, array_filter([
                'appointment_date' => $date, 'appointment_time' => $time,
                'reason_type' => $meta['reason_type'] ?? null,
                'contact_method' => $meta['contact_method'] ?? null,
                'customer_agreed' => isset($meta['contact_method']) ? true : null,
            ], fn ($v) => $v !== null), $reason);

            $this->notifier->appointmentRescheduled($locked, $reason);

            return $locked;
        });

        // Email sau khi lưu; lỗi gửi mail không làm mất thay đổi (đã có thông báo trong web).
        $email = $updated->customer?->email ?: $updated->customer?->account?->email;
        if ($email) {
            try {
                Mail::to($email)->send(new AppointmentRescheduledMail($updated, $old, $reason));
            } catch (\Throwable $e) {
                Log::warning('Không gửi được email đổi lịch', ['appointment_id' => $updated->id, 'error' => $e->getMessage()]);
            }
        }

        return $updated;
    }

    /** Chỉ lịch Chờ xác nhận / Đã xác nhận mới đổi được ngày giờ; mỗi trạng thái còn lại có thông báo riêng. */
    private function assertReschedulable(Appointment $appointment): void
    {
        $message = match ($appointment->status) {
            'PENDING', 'CONFIRMED' => null,
            'CHECKED_IN' => 'Lịch đã tiếp nhận xe, không thể đổi ngày giờ hẹn.',
            'CANCELLED' => 'Lịch hẹn đã huỷ, không thể đổi.',
            'NO_SHOW' => 'Khách đã không đến lịch này. Vui lòng tạo lịch hẹn mới nếu khách muốn đặt lại.',
            default => 'Trạng thái lịch hẹn hiện tại không cho phép đổi lịch.',
        };
        if ($message) {
            throw ValidationException::withMessages(['status' => $message]);
        }
    }
}
