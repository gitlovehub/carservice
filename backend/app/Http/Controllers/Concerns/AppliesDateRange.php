<?php

namespace App\Http\Controllers\Concerns;

use Carbon\CarbonImmutable;
use Illuminate\Contracts\Database\Query\Expression;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Lọc danh sách Admin theo khoảng ngày `?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD` (gồm cả hai đầu, có thể gửi một đầu).
 * Ngày người dùng chọn là ngày giờ Việt Nam; thời gian trong DB lưu UTC nên phải đổi mốc đầu / cuối ngày trước khi so sánh.
 */
trait AppliesDateRange
{
    private const BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh';

    /** @return array<string, list<string>> */
    protected function dateRangeRules(Request $request): array
    {
        return [
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => array_merge(['nullable', 'date_format:Y-m-d'], $request->filled('date_from') ? ['after_or_equal:date_from'] : []),
        ];
    }

    /** @param array<string, mixed> $filters */
    protected function applyDateRange(Builder $query, array $filters, string|Expression $column): Builder
    {
        if (! empty($filters['date_from'])) {
            $query->where($column, '>=', $this->businessDayStart($filters['date_from']));
        }
        if (! empty($filters['date_to'])) {
            $query->where($column, '<=', $this->businessDayEnd($filters['date_to']));
        }

        return $query;
    }

    protected function businessDayStart(string $day): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('Y-m-d', $day, self::BUSINESS_TIMEZONE)->startOfDay()->utc();
    }

    protected function businessDayEnd(string $day): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('Y-m-d', $day, self::BUSINESS_TIMEZONE)->endOfDay()->utc();
    }
}
