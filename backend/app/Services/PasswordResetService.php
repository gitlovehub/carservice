<?php

namespace App\Services;

use App\Mail\PasswordResetOtpMail;
use App\Models\Account;
use App\Models\PasswordResetOtp;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Phát mã OTP đặt lại mật khẩu (6 số, hạn 5 phút) và gửi email.
 * Dùng cho "Quên mật khẩu" và khi Admin gửi email kích hoạt / đặt lại mật khẩu cho tài khoản.
 */
class PasswordResetService
{
    public const TTL_MINUTES = 5;

    /** @return bool true nếu gửi email thành công */
    public function sendOtp(Account $account): bool
    {
        // Huỷ các OTP cũ chưa dùng.
        PasswordResetOtp::query()->where('account_id', $account->id)->whereNull('used_at')->delete();

        $otp = (string) random_int(100000, 999999);

        PasswordResetOtp::query()->create([
            'account_id' => $account->id,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        Log::info("[OTP QUÊN MẬT KHẨU] Email: {$account->email} | Mã OTP: {$otp}");

        try {
            Mail::to($account->email)->send(new PasswordResetOtpMail($otp));

            return true;
        } catch (\Throwable $e) {
            Log::error('[OTP EMAIL ERROR] '.$e->getMessage());

            return false;
        }
    }
}
