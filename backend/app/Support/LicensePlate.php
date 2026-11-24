<?php

namespace App\Support;

use Closure;

/**
 * Biển số ô tô dân sự Việt Nam: 2 số tỉnh (11–99) + 1–2 chữ seri + 4 hoặc 5 số.
 * Dạng chuẩn: 30A-123.45, 29LD-1234.
 */
final class LicensePlate
{
    public const INVALID_MESSAGE = 'Biển số chưa đúng định dạng. Ví dụ: 30A-123.45 hoặc 29LD-1234.';

    /** Đưa về dạng chuẩn khi nhận ra đủ thành phần; chuỗi khác chỉ viết hoa để giữ nguyên dữ liệu cũ. */
    public static function normalize(string $plate): string
    {
        $upper = mb_strtoupper(trim($plate));
        $compact = preg_replace('/[^A-Z0-9]/', '', $upper) ?? '';
        if (preg_match('/^(\d{2}[A-Z]{1,2})(\d{4,5})$/', $compact, $parts) !== 1) {
            return $upper;
        }
        $digits = $parts[2];

        return $parts[1].'-'.(strlen($digits) === 5 ? substr($digits, 0, 3).'.'.substr($digits, 3) : $digits);
    }

    public static function isValid(string $plate): bool
    {
        return preg_match('/^(\d{2})[A-Z]{1,2}-(?:\d{4}|\d{3}\.\d{2})$/', $plate, $parts) === 1
            && (int) $parts[1] >= 11;
    }

    /**
     * Rule cho ô biển số đã chuẩn hoá. `$current`: biển số đang lưu, giữ nguyên thì không chặn
     * để xe có dữ liệu cũ sai chuẩn vẫn sửa được ODO, ghi chú.
     */
    public static function rule(?string $current = null): Closure
    {
        return static function (string $attribute, mixed $value, Closure $fail) use ($current): void {
            if (! is_string($value) || ($current !== null && $value === self::normalize($current))) {
                return;
            }
            if (! self::isValid($value)) {
                $fail(self::INVALID_MESSAGE);
            }
        };
    }
}
