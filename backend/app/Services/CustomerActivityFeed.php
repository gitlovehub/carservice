<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\AuditLog;
use Carbon\Carbon;

/**
 * "Cập nhật từ khách" (Tổng quan cố vấn): những gì KHÁCH tự làm với lịch hẹn mà cố vấn cần biết —
 * đặt lịch mới, tự đổi lịch, xác nhận qua email, hủy lịch. Khu nhân viên chưa có chuông thông báo nên đây là chỗ báo.
 *
 * Đặt lịch lấy thẳng từ bảng appointments (lịch không do nhân viên tạo hộ) để có cả dữ liệu cũ;
 * đổi lịch / xác nhận / hủy lấy từ audit_logs.
 */
class CustomerActivityFeed
{
    public const CANCELLED_BY_CUSTOMER = 'appointment.cancelled_by_customer';

    /** action audit → loại hiển thị. */
    private const AUDIT_TYPES = [
        CustomerReschedulePolicy::ACTION => 'RESCHEDULED',
        AppointmentEmailConfirmationService::CONFIRMED_BY_CUSTOMER => 'CONFIRMED',
        self::CANCELLED_BY_CUSTOMER => 'CANCELLED',
    ];

    public static function recordCancel(Appointment $appointment, ?Account $account, string $oldStatus, ?string $reason): void
    {
        AuditLog::query()->create([
            'account_id' => $account?->id,
            'action' => self::CANCELLED_BY_CUSTOMER,
            'auditable_type' => Appointment::class,
            'auditable_id' => $appointment->id,
            'old_values' => ['status' => $oldStatus],
            'new_values' => ['status' => 'CANCELLED'],
            'reason' => $reason,
            'ip_address' => request()->ip(),
            'user_agent' => substr((string) request()->userAgent(), 0, 1000),
        ]);
    }

    /** @return list<array<string, mixed>> mới nhất trước */
    public function latest(int $limit = 10): array
    {
        $with = ['customer:id,full_name', 'vehicle.model.brand'];

        $bookings = Appointment::query()
            ->with($with)
            ->whereDoesntHave('activities', fn ($q) => $q->where('action', AppointmentActivityService::CREATED))
            ->latest('created_at')->latest('id')
            ->limit($limit)->get()
            ->map(fn (Appointment $a) => $this->item('BOOKED', 'booked-'.$a->id, $a->created_at, $a));

        $logs = AuditLog::query()
            ->where('auditable_type', Appointment::class)
            ->whereIn('action', array_keys(self::AUDIT_TYPES))
            ->latest('id')->limit($limit)->get();
        $appointments = Appointment::query()->with($with)->whereKey($logs->pluck('auditable_id')->unique())->get()->keyBy('id');
        $updates = $logs
            ->filter(fn (AuditLog $log) => $appointments->has($log->auditable_id))
            ->map(fn (AuditLog $log) => $this->item(self::AUDIT_TYPES[$log->action], 'log-'.$log->id, $log->created_at, $appointments[$log->auditable_id], $log));

        // Mới nhất trước; cùng thời điểm thì đổi / xác nhận / hủy đứng trước lần đặt (luôn xảy ra sau đặt).
        return $bookings->concat($updates)
            ->sort(fn (array $a, array $b) => [$b['at'], $b['type'] !== 'BOOKED'] <=> [$a['at'], $a['type'] !== 'BOOKED'])
            ->take($limit)->values()->all();
    }

    private function item(string $type, string $key, $at, Appointment $a, ?AuditLog $log = null): array
    {
        $old = $log?->old_values ?? [];
        $vehicle = $a->vehicle;

        return [
            'key' => $key,
            'type' => $type,
            'at' => $at ? Carbon::parse($at)->toIso8601String() : null,
            'customer_name' => $a->customer?->full_name,
            'reason' => $log?->reason,
            // Đổi lịch: giờ cũ để hiện "cũ → mới".
            'old_date' => isset($old['appointment_date']) ? Carbon::parse($old['appointment_date'])->toDateString() : null,
            'old_time' => isset($old['appointment_time']) ? substr((string) $old['appointment_time'], 0, 5) : null,
            'appointment' => [
                'id' => $a->id,
                'appointment_code' => $a->appointment_code,
                'appointment_date' => Carbon::parse($a->appointment_date)->toDateString(),
                'appointment_time' => substr((string) $a->appointment_time, 0, 5),
                'status' => $a->status,
                'vehicle' => trim(implode(' ', array_filter([$vehicle?->model?->brand?->name, $vehicle?->model?->name]))) ?: null,
                'license_plate' => $vehicle?->license_plate,
            ],
        ];
    }
}
