<?php

namespace App\Services;

use App\Models\Appointment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Quy tắc chung cho một khung giờ (giống lúc đặt lịch): ở tương lai, không trùng ngày lễ,
 * trong giờ làm việc, còn slot và xe chưa có lịch khác cùng khung giờ.
 * Dùng chung cho khách đổi lịch và cố vấn đổi lịch giúp khách. Gọi trong transaction (có khóa).
 */
class AppointmentSlotService
{
    public function assertBookable(string $date, string $time, int $vehicleId, ?int $ignoreAppointmentId = null): void
    {
        if (Carbon::parse("$date $time")->lessThanOrEqualTo(now())) {
            throw ValidationException::withMessages(['appointment_time' => 'Giờ hẹn phải ở tương lai.']);
        }

        if (DB::table('holidays')->where('holiday_date', $date)->exists()) {
            throw ValidationException::withMessages(['appointment_date' => 'Garage nghỉ lễ ngày này.']);
        }

        $hours = DB::table('working_hours')
            ->where('day_of_week', Carbon::parse($date)->dayOfWeek)
            ->lockForUpdate()
            ->first();

        if (! $hours || ! $hours->is_active || $time < substr($hours->open_time, 0, 8) || $time >= substr($hours->close_time, 0, 8)) {
            throw ValidationException::withMessages(['appointment_time' => 'Ngoài giờ làm việc của garage.']);
        }

        $activeInSlot = Appointment::query()
            ->where('appointment_date', $date)
            ->where('appointment_time', $time)
            ->whereNotIn('status', ['CANCELLED', 'NO_SHOW'])
            ->when($ignoreAppointmentId, fn ($query) => $query->whereKeyNot($ignoreAppointmentId));

        if ((clone $activeInSlot)->count() >= (int) ($hours->max_slots ?? 5)) {
            throw ValidationException::withMessages(['appointment_time' => 'Khung giờ đã đầy.']);
        }

        if ((clone $activeInSlot)->where('vehicle_id', $vehicleId)->exists()) {
            throw ValidationException::withMessages(['vehicle_id' => 'Xe đã có lịch hẹn tại khung giờ này.']);
        }
    }
}
