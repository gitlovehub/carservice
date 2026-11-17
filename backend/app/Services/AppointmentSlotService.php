<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\GarageSetting;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Quy tắc chung cho một khung giờ (giống lúc đặt lịch): ở tương lai, không trùng ngày lễ,
 * trong giờ làm việc, còn slot và xe chưa có lịch khác cùng khung giờ.
 * Dùng chung cho khách đổi lịch và cố vấn đặt / đổi lịch giúp khách. Gọi trong transaction (có khóa).
 */
class AppointmentSlotService
{
    /**
     * @param  bool  $requireConfiguredSlot  ADV-04: giờ hẹn phải là một khung giờ Admin cấu hình (Giờ làm việc → Khung giờ đặt lịch).
     *                                       Bật cho cố vấn đặt / đổi lịch; trang khách vốn chỉ cho chọn các khung này.
     */
    public function assertBookable(string $date, string $time, int $vehicleId, ?int $ignoreAppointmentId = null, bool $requireConfiguredSlot = false): void
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

        if ($requireConfiguredSlot && ! in_array(substr($time, 0, 5), self::configuredSlots(), true)) {
            throw ValidationException::withMessages([
                'appointment_time' => 'Giờ hẹn phải là một khung giờ đặt lịch của gara ('.implode(', ', self::configuredSlots()).').',
            ]);
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

    /** @return list<string> "HH:MM" theo thứ tự trong ngày. */
    public static function configuredSlots(): array
    {
        $slots = GarageSetting::bookingSlots();
        $all = array_values(array_unique([...$slots['morning'], ...$slots['afternoon']]));
        sort($all);

        return $all;
    }

    /**
     * Tình trạng từng khung giờ của một ngày (ADV-04, màn Đặt lịch hộ / Đổi lịch):
     * past (đã qua) · closed (ngoài giờ / ngày nghỉ) · full (hết chỗ) · available.
     *
     * @return array{date: string, holiday: string|null, open: string|null, close: string|null, active: bool, max_slots: int,
     *     slots: list<array{time: string, period: string, booked: int, status: string}>}
     */
    public function availability(string $date): array
    {
        $day = Carbon::parse($date);
        $holidayRow = DB::table('holidays')->where('holiday_date', $day->toDateString())->first();
        $holiday = $holidayRow ? ((string) ($holidayRow->reason ?? '') ?: 'Ngày nghỉ') : null;
        $hours = DB::table('working_hours')->where('day_of_week', $day->dayOfWeek)->first();
        $active = (bool) ($hours?->is_active ?? false) && $holiday === null;
        $max = (int) ($hours->max_slots ?? 5);
        $booked = Appointment::query()
            ->whereDate('appointment_date', $day->toDateString())
            ->whereNotIn('status', ['CANCELLED', 'NO_SHOW'])
            ->selectRaw('appointment_time, COUNT(*) as total')->groupBy('appointment_time')
            ->pluck('total', 'appointment_time')
            ->mapWithKeys(fn ($total, $time) => [substr((string) $time, 0, 5) => (int) $total]);
        $configured = GarageSetting::bookingSlots();

        $slots = [];
        foreach (['morning' => $configured['morning'], 'afternoon' => $configured['afternoon']] as $period => $times) {
            foreach ($times as $time) {
                $count = $booked[$time] ?? 0;
                $status = match (true) {
                    Carbon::parse($day->toDateString().' '.$time)->lessThanOrEqualTo(now()) => 'past',
                    ! $active || $hours === null || "$time:00" < substr($hours->open_time, 0, 8) || "$time:00" >= substr($hours->close_time, 0, 8) => 'closed',
                    $count >= $max => 'full',
                    default => 'available',
                };
                $slots[] = ['time' => $time, 'period' => $period, 'booked' => $count, 'status' => $status];
            }
        }

        return [
            'date' => $day->toDateString(),
            'holiday' => $holiday,
            'open' => $hours ? substr($hours->open_time, 0, 5) : null,
            'close' => $hours ? substr($hours->close_time, 0, 5) : null,
            'active' => $active,
            'max_slots' => $max,
            'slots' => $slots,
        ];
    }
}
