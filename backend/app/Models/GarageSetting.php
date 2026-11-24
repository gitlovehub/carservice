<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/** Thông tin gara — một bản ghi duy nhất. */
#[Fillable(['name', 'phone', 'email', 'address_line', 'ward', 'district', 'province', 'latitude', 'longitude', 'place_provider', 'place_id', 'booking_slots', 'customer_reschedule_limit', 'customer_reschedule_cutoff_hours', 'updated_by_account_id'])]
class GarageSetting extends Model
{
    /** Khung giờ đặt lịch mặc định khi admin chưa cấu hình. */
    public const DEFAULT_BOOKING_SLOTS = [
        'morning' => ['08:00', '09:00', '09:30', '10:30', '11:15'],
        'afternoon' => ['13:30', '14:15', '15:00', '16:00', '16:45'],
    ];

    protected function casts(): array
    {
        return ['latitude' => 'float', 'longitude' => 'float', 'booking_slots' => 'array'];
    }

    public static function current(): ?self
    {
        return self::query()->orderBy('id')->first();
    }

    /** Mặc định giới hạn khách tự đổi lịch (khi chưa có bản ghi cài đặt). */
    public const DEFAULT_RESCHEDULE_LIMIT = 2;

    public const DEFAULT_RESCHEDULE_CUTOFF_HOURS = 12;

    /** @return array{limit: int, cutoff_hours: int} */
    public static function reschedulePolicy(): array
    {
        $setting = self::current();

        return [
            'limit' => (int) ($setting?->customer_reschedule_limit ?? self::DEFAULT_RESCHEDULE_LIMIT),
            'cutoff_hours' => (int) ($setting?->customer_reschedule_cutoff_hours ?? self::DEFAULT_RESCHEDULE_CUTOFF_HOURS),
        ];
    }

    /** @return array{morning: list<string>, afternoon: list<string>} */
    public static function bookingSlots(): array
    {
        $slots = self::current()?->booking_slots;

        return is_array($slots) && isset($slots['morning'], $slots['afternoon'])
            ? ['morning' => array_values($slots['morning']), 'afternoon' => array_values($slots['afternoon'])]
            : self::DEFAULT_BOOKING_SLOTS;
    }
}
