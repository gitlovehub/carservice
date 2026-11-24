<?php

namespace App\Support;

use Closure;

/** Số khung xe: VIN chuẩn 17 ký tự (không có I, O, Q) hoặc số khung xe đời cũ 6–16 chữ và số không dấu. */
final class VehicleVin
{
    public const PATTERN = '/^(?:[A-HJ-NPR-Z0-9]{17}|[A-Z0-9]{6,16})$/';

    public const INVALID_MESSAGE = 'Số VIN gồm 6–17 chữ và số không dấu (đủ 17 ký tự thì không có I, O, Q).';

    public const TAKEN_MESSAGE = 'Số VIN đã thuộc một xe khác trong hệ thống.';

    public static function normalize(string $vin): string
    {
        return mb_strtoupper((string) preg_replace('/\s+/u', '', $vin));
    }

    /**
     * Rule khi sửa xe: VIN cũ giữ nguyên mà chỉ vướng I, O, Q thì vẫn cho lưu để không chặn việc sửa ODO, ghi chú.
     * VIN có dấu hoặc ký tự lạ luôn bị chặn, kể cả khi giữ nguyên.
     */
    public static function rule(?string $current): Closure
    {
        return static function (string $attribute, mixed $value, Closure $fail) use ($current): void {
            if (! is_string($value) || preg_match(self::PATTERN, $value) === 1) {
                return;
            }
            $isKeptLegacy = $current !== null && $value === self::normalize($current) && preg_match('/^[A-Z0-9]{6,17}$/', $value) === 1;
            if (! $isKeptLegacy) {
                $fail(self::INVALID_MESSAGE);
            }
        };
    }
}
