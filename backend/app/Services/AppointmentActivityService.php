<?php

namespace App\Services;

use App\Mail\AppointmentRescheduledMail;
use App\Models\Account;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Notification;
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

    public function __construct(private readonly AppointmentSlotService $slots) {}

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

    public function reschedule(Appointment $appointment, string $date, string $time, string $reason, Account $actor): Appointment
    {
        if (! in_array($appointment->status, ['PENDING', 'CONFIRMED'], true)) {
            throw ValidationException::withMessages(['status' => 'Chỉ đổi được lịch đang chờ xác nhận hoặc đã xác nhận.']);
        }
        $time = strlen($time) === 5 ? "$time:00" : $time;
        $old = ['appointment_date' => Carbon::parse($appointment->appointment_date)->toDateString(), 'appointment_time' => substr((string) $appointment->appointment_time, 0, 8)];
        if ($old['appointment_date'] === $date && $old['appointment_time'] === $time) {
            throw ValidationException::withMessages(['appointment_time' => 'Ngày giờ mới trùng với lịch hiện tại.']);
        }

        $updated = DB::transaction(function () use ($appointment, $date, $time, $reason, $actor, $old): Appointment {
            $locked = Appointment::query()->lockForUpdate()->findOrFail($appointment->id);
            $this->slots->assertBookable($date, $time, (int) $locked->vehicle_id, (int) $locked->id);
            $locked->update(['appointment_date' => $date, 'appointment_time' => $time]);
            $this->record($locked, self::RESCHEDULED, $actor, $old, ['appointment_date' => $date, 'appointment_time' => $time], $reason);

            $account = $locked->customer?->account;
            if ($account) {
                Notification::query()->create([
                    'account_id' => $account->id,
                    'appointment_id' => $locked->id,
                    'title' => 'Lịch hẹn đã được đổi',
                    'content' => "Lịch {$locked->appointment_code} đổi sang {$time} ngày ".Carbon::parse($date)->format('d/m/Y').". Lý do: {$reason}",
                    'type' => 'APPOINTMENT_RESCHEDULED',
                    'channel' => 'WEB',
                    'status' => 'PENDING',
                ]);
            }

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
}
