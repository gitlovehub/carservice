<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/**
 * Ngày theo giờ gara (Việt Nam). Ứng dụng lưu thời điểm theo UTC, nên lọc "ngày 17/11" hay "hôm nay"
 * phải đổi sang khoảng UTC tương ứng — so sánh ngày UTC trực tiếp lệch 7 tiếng (0h–7h sáng bị tính sang hôm trước).
 */
class GarageDay
{
    public const TIMEZONE = 'Asia/Ho_Chi_Minh';

    /** Ngày hiện tại của gara, dạng Y-m-d. */
    public static function today(): string
    {
        return now(self::TIMEZONE)->toDateString();
    }

    /**
     * Khoảng UTC [đầu ngày, cuối ngày] của một ngày gara.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    public static function bounds(string $day): array
    {
        $start = Carbon::createFromFormat('Y-m-d', $day, self::TIMEZONE)->startOfDay();

        return [$start->copy()->utc(), $start->copy()->endOfDay()->utc()];
    }

    public static function start(string $day): Carbon
    {
        return self::bounds($day)[0];
    }

    public static function end(string $day): Carbon
    {
        return self::bounds($day)[1];
    }
}
