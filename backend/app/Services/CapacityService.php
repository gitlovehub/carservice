<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\RepairOrder;
use App\Models\WorkingHour;
use App\Models\WorkItem;
use Carbon\CarbonImmutable;

/**
 * P7 — Công suất gara theo phút / ngày (Q6: chỉ cảnh báo, không chặn).
 * Năng lực = daily_capacity_minutes (admin tự đặt), hoặc (giờ mở cửa × số cầu nâng) nếu khai báo bay_count,
 * hoặc mặc định (giờ mở cửa × số KTV đang hoạt động); không có KTV → null.
 * Tải = Σ phút dự kiến của lịch CONFIRMED / CHECKED_IN trong ngày (+ hôm nay: phút còn lại của phiếu đang mở).
 */
class CapacityService
{
    /** Lịch hẹn chưa có thời lượng dịch vụ: tạm tính 60 phút (T-004). */
    public const DEFAULT_APPOINTMENT_MINUTES = 60;

    /** @return array<string, mixed> */
    public function forDate(CarbonImmutable $date): array
    {
        $capacity = $this->capacityMinutes($date);
        $appointments = Appointment::query()
            ->whereDate('appointment_date', $date->toDateString())
            ->whereIn('status', ['CONFIRMED', 'CHECKED_IN'])
            ->with(['services:id,estimated_minutes', 'packages.services:id,estimated_minutes'])
            ->get();
        $booked = (int) $appointments->sum(fn (Appointment $a) => $this->appointmentMinutes($a));

        $openWork = 0;
        if ($date->isToday()) {
            $openWork = (int) WorkItem::query()
                ->whereIn('status', [WorkItem::PENDING, WorkItem::IN_PROGRESS])
                ->whereHas('repairOrder', fn ($q) => $q->whereNotIn('status', [RepairOrder::COMPLETED, RepairOrder::HANDED_OVER, RepairOrder::CLOSED]))
                ->sum('standard_minutes');
        }
        $load = $booked + $openWork;

        return [
            'date' => $date->toDateString(),
            'capacity_minutes' => $capacity,
            'booked_minutes' => $booked,
            'open_work_minutes' => $openWork,
            'load_minutes' => $load,
            'appointments' => $appointments->count(),
            'utilization' => $capacity ? round($load / $capacity, 2) : null,
            'over_capacity' => $capacity !== null && $load > $capacity,
        ];
    }

    /**
     * Ngày còn năng lực trong N ngày tới (để gợi ý khi ngày đang chọn quá tải).
     *
     * @return list<array<string, mixed>>
     */
    public function suggestions(CarbonImmutable $from, int $days = 7, int $neededMinutes = self::DEFAULT_APPOINTMENT_MINUTES): array
    {
        $result = [];
        for ($i = 1; $i <= $days; $i++) {
            $day = $this->forDate($from->addDays($i));
            if ($day['capacity_minutes'] !== null && $day['capacity_minutes'] >= $day['load_minutes'] + $neededMinutes) {
                $result[] = $day;
            }
        }

        return $result;
    }

    public function appointmentMinutes(Appointment $appointment): int
    {
        $minutes = (int) $appointment->services->sum('estimated_minutes')
            + (int) $appointment->packages->sum(fn ($package) => $package->services->sum('estimated_minutes'));

        return $minutes > 0 ? $minutes : self::DEFAULT_APPOINTMENT_MINUTES;
    }

    private function capacityMinutes(CarbonImmutable $date): ?int
    {
        $hours = WorkingHour::query()->where('day_of_week', $date->dayOfWeek)->first();
        if (! $hours || ! $hours->is_active) {
            return 0;
        }
        if ($hours->daily_capacity_minutes !== null) {
            return (int) $hours->daily_capacity_minutes;
        }
        if ($hours->bay_count) {
            $open = CarbonImmutable::parse($hours->open_time);
            $close = CarbonImmutable::parse($hours->close_time);

            return (int) $open->diffInMinutes($close) * (int) $hours->bay_count;
        }
        // Mặc định: số kỹ thuật viên đang hoạt động × số phút mở cửa trong ngày.
        $technicians = self::activeTechnicians();
        if ($technicians > 0) {
            $open = CarbonImmutable::parse($hours->open_time);
            $close = CarbonImmutable::parse($hours->close_time);

            return (int) $open->diffInMinutes($close) * $technicians;
        }

        return null;
    }

    /** Số kỹ thuật viên có tài khoản đang hoạt động — cơ sở tính công suất tự động. */
    public static function activeTechnicians(): int
    {
        return Account::query()
            ->where('role', Account::ROLE_TECHNICIAN)
            ->where('status', Account::STATUS_ACTIVE)
            ->count();
    }
}
