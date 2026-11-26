<?php

namespace App\Support;

/**
 * Chính sách mật khẩu dùng chung cho đăng ký, đặt lại (OTP) và đổi mật khẩu — khớp kiểm tra ở Frontend
 * (PasswordStrengthIndicator): tối thiểu 8 ký tự, có chữ thường, chữ hoa và chữ số.
 */
final class PasswordPolicy
{
    public const MESSAGE = 'Mật khẩu tối thiểu 8 ký tự, gồm chữ thường, chữ hoa và chữ số.';

    /** @return list<string> */
    public static function rules(): array
    {
        return ['string', 'min:8', 'max:255', 'regex:/[a-z]/', 'regex:/[A-Z]/', 'regex:/[0-9]/'];
    }

    /** @return array<string, string> */
    public static function messages(string $field): array
    {
        return [
            "{$field}.min" => self::MESSAGE,
            "{$field}.regex" => self::MESSAGE,
        ];
    }
}
