<?php

namespace App\Support;

/**
 * Chuẩn hóa tên trong danh mục xe (hãng / dòng xe / phiên bản).
 */
final class VehicleName
{
    /**
     * UTF-8 dạng NFC, bỏ BOM, gộp khoảng trắng thừa.
     */
    public static function clean(string $value): string
    {
        $value = preg_replace('/^\x{FEFF}/u', '', $value) ?? $value;

        if (class_exists(\Normalizer::class)) {
            $value = \Normalizer::normalize($value, \Normalizer::FORM_C) ?: $value;
        }

        return trim(preg_replace('/\s+/u', ' ', $value) ?? $value);
    }

    /**
     * Khóa so khớp trùng: không phân biệt hoa/thường.
     */
    public static function key(string $value): string
    {
        return mb_strtolower(self::clean($value));
    }

    /**
     * Chuỗi tìm kiếm an toàn cho LIKE (thoát %, _ và \).
     */
    public static function like(string $search): string
    {
        return '%'.addcslashes(self::clean($search), '%_\\').'%';
    }
}
