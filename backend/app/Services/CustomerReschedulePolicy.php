<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\GarageSetting;
use App\Support\GarageDay;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Khách TỰ đổi ngày giờ trên web (chỉ khi lịch còn Chờ xác nhận): tối đa N lần mỗi lịch và phải còn ít nhất H giờ trước
 * giờ hẹn hiện tại (Admin chỉnh trong Giờ làm việc). Quá giới hạn → khách liên hệ gara, cố vấn đổi giúp.
 * Mỗi lần khách tự đổi ghi audit_logs (giờ cũ → mới) để cố vấn thấy trong lịch sử và trên bảng lịch hẹn.
 */
class CustomerReschedulePolicy
{
    public const ACTION = 'appointment.rescheduled_by_customer';

    public function used(Appointment $appointment): int
    {
        return AuditLog::query()->where('auditable_type', Appointment::class)
            ->where('auditable_id', $appointment->id)->where('action', self::ACTION)->count();
    }

    /**
     * Trạng thái cho giao diện khách: còn mấy lần, hạn chót, có được tự đổi không (kèm lý do nếu không).
     *
     * @return array{limit: int, cutoff_hours: int, used: int, left: int, deadline: string, allowed: bool, message: ?string}
     */
    public function state(Appointment $appointment): array
    {
        $policy = GarageSetting::reschedulePolicy();
        $used = $this->used($appointment);
        $deadline = $this->startsAt($appointment)->subHours($policy['cutoff_hours']);
        $message = $this->blockReason($appointment, $policy, $used, $deadline);

        return [
            'limit' => $policy['limit'], 'cutoff_hours' => $policy['cutoff_hours'],
            'used' => $used, 'left' => max(0, $policy['limit'] - $used),
            'deadline' => $deadline->toIso8601String(),
            'allowed' => $message === null, 'message' => $message,
        ];
    }

    /** Gọi khi khách đổi ngày / giờ (sau khi đã khoá dòng lịch hẹn). */
    public function assertAllowed(Appointment $appointment): void
    {
        $policy = GarageSetting::reschedulePolicy();
        $deadline = $this->startsAt($appointment)->subHours($policy['cutoff_hours']);
        $message = $this->blockReason($appointment, $policy, $this->used($appointment), $deadline);
        if ($message !== null) {
            throw ValidationException::withMessages(['appointment_date' => $message]);
        }
    }

    /** @param  array{appointment_date: string, appointment_time: string}  $old */
    public function record(Appointment $appointment, Account $customer, array $old): void
    {
        AuditLog::query()->create([
            'account_id' => $customer->id,
            'action' => self::ACTION,
            'auditable_type' => Appointment::class,
            'auditable_id' => $appointment->id,
            'old_values' => $old,
            'new_values' => [
                'appointment_date' => Carbon::parse($appointment->appointment_date)->toDateString(),
                'appointment_time' => substr((string) $appointment->appointment_time, 0, 8),
            ],
            'reason' => 'Khách tự đổi lịch trên web',
            'ip_address' => request()->ip(),
            'user_agent' => substr((string) request()->userAgent(), 0, 1000),
        ]);
    }

    /** @param  array{limit: int, cutoff_hours: int}  $policy */
    private function blockReason(Appointment $appointment, array $policy, int $used, Carbon $deadline): ?string
    {
        if ($appointment->status !== 'PENDING') {
            return 'Lịch đã được gara xác nhận. Vui lòng liên hệ gara nếu cần đổi lịch.';
        }
        if ($used >= $policy['limit']) {
            return "Bạn đã tự đổi lịch {$policy['limit']} lần. Vui lòng liên hệ gara để được hỗ trợ đổi tiếp.";
        }
        if (now()->greaterThanOrEqualTo($deadline)) {
            return "Chỉ tự đổi lịch trước giờ hẹn ít nhất {$policy['cutoff_hours']} tiếng. Vui lòng liên hệ gara để đổi lịch.";
        }

        return null;
    }

    private function startsAt(Appointment $appointment): Carbon
    {
        return Carbon::parse(Carbon::parse($appointment->appointment_date)->toDateString().' '.substr((string) $appointment->appointment_time, 0, 8), GarageDay::TIMEZONE);
    }
}
