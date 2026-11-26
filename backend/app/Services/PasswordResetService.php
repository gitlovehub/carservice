<?php

namespace App\Services;

use App\Mail\PasswordResetOtpMail;
use App\Models\Account;
use App\Models\PasswordResetOtp;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Phát mã OTP đặt lại mật khẩu (6 số, hạn 5 phút) và gửi email.
 * Dùng cho "Quên mật khẩu" và khi Admin gửi email kích hoạt / đặt lại mật khẩu cho tài khoản.
 */
class PasswordResetService
{
    public const TTL_MINUTES = 5;

    /** Số lần nhập sai tối đa cho một mã; vượt thì mã bị huỷ, phải yêu cầu mã mới (chống dò 6 số). */
    public const MAX_ATTEMPTS = 5;

    /** @return bool true nếu gửi email thành công */
    public function sendOtp(Account $account): bool
    {
        // Huỷ các OTP cũ chưa dùng.
        PasswordResetOtp::query()->where('account_id', $account->id)->whereNull('used_at')->delete();
        RateLimiter::clear($this->attemptsKey($account));

        $otp = (string) random_int(100000, 999999);

        PasswordResetOtp::query()->create([
            'account_id' => $account->id,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        try {
            Mail::to($account->email)->send(new PasswordResetOtpMail($otp));

            return true;
        } catch (\Throwable $e) {
            Log::error('[OTP EMAIL ERROR] '.$e->getMessage());

            return false;
        }
    }

    /**
     * Ghi nhận một lần nhập sai mã. Đủ MAX_ATTEMPTS lần thì huỷ mã.
     *
     * @return bool true nếu mã vừa bị huỷ vì nhập sai quá nhiều lần
     */
    public function registerFailedAttempt(Account $account, PasswordResetOtp $otp): bool
    {
        $key = $this->attemptsKey($account);
        if (RateLimiter::hit($key, self::TTL_MINUTES * 60) < self::MAX_ATTEMPTS) {
            return false;
        }

        $otp->forceFill(['used_at' => now()])->save();
        RateLimiter::clear($key);

        return true;
    }

    public function clearAttempts(Account $account): void
    {
        RateLimiter::clear($this->attemptsKey($account));
    }

    private function attemptsKey(Account $account): string
    {
        return 'password-reset-otp:'.$account->id;
    }
}
