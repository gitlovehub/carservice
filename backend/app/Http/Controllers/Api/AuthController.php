<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Account;
use App\Models\Customer;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;
use App\Mail\EmailVerificationOtpMail;
use App\Models\EmailVerificationOtp;
use Illuminate\Support\Facades\Mail;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['email'] = strtolower(trim((string) $data['email']));
        $data['full_name'] = trim((string) $data['full_name']);
        $data['phone'] = trim((string) $data['phone']);

        $account = DB::transaction(function () use ($data) {
            $account = Account::query()->create([
                'email' => $data['email'],
                'password_hash' => Hash::make($data['password']),
                'role' => Account::ROLE_CUSTOMER,
                'status' => Account::STATUS_PENDING,
            ]);

            $existingCustomer = Customer::query()
                ->whereNull('account_id')
                ->where(function ($query) use ($data) {
                    $query->where('phone', $data['phone'])
                        ->orWhere('email', $data['email']);
                })
                ->first();

            if ($existingCustomer) {
                $existingCustomer->update([
                    'account_id' => $account->id,
                    'full_name' => $data['full_name'],
                    'phone' => $data['phone'],
                    'email' => $data['email'],
                ]);
            } else {
                Customer::query()->create([
                    'account_id' => $account->id,
                    'full_name' => $data['full_name'],
                    'phone' => $data['phone'],
                    'email' => $data['email'],
                ]);
            }

            return $account;
        });

        $otp = (string) random_int(100000, 999999);

        EmailVerificationOtp::query()
            ->where('account_id', $account->id)
            ->whereNull('used_at')
            ->delete();

        EmailVerificationOtp::query()->create([
            'account_id' => $account->id,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(5),
        ]);

        Mail::to($account->email)->send(new EmailVerificationOtpMail($otp));

        return response()->json([
            'message' => 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.',
            'email' => $account->email,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $email = strtolower(trim((string) $data['email']));
        $account = Account::query()->whereRaw('LOWER(email) = ?', [$email])->first();

        if (! $account || ! Hash::check($data['password'], $account->getAuthPassword())) {
            throw ValidationException::withMessages([
                'email' => ['Email hoặc mật khẩu không đúng.'],
            ]);
        }

        if ($account->status === Account::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'email' => [
                    'Tài khoản chưa xác thực email. Vui lòng nhập mã OTP.'
                ],
            ]);
        }

        if (! $account->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['Tài khoản đang bị khóa hoặc ngừng hoạt động.'],
            ]);
        }

        $token = null;

        if ($request->hasSession()) {
            Auth::guard('web')->login($account);
            $request->session()->regenerate();
        } else {
            $token = $account->createToken($data['device_name'] ?? 'default')->plainTextToken;
        }

        return response()->json([
            'token' => $token,
            'account' => $this->formatAccount($account),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'account' => $this->formatAccount($this->authenticatedAccount($request)),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $account = $this->authenticatedAccount($request);
        $accessToken = $account->currentAccessToken();

        if ($accessToken instanceof PersonalAccessToken) {
            $accessToken->delete();
        }

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Đã đăng xuất.']);
    }

    private function authenticatedAccount(Request $request): Account
    {
        $account = $request->user();

        if (! ($account instanceof Account)) {
            throw new AuthenticationException;
        }

        return $account;
    }

    /**
     * @return array<string, mixed>
     */
    private function formatAccount(Account $account): array
    {
        $account->loadMissing(['employee.technicianProfile', 'customer']);

        return [
            'id' => $account->id,
            'email' => $account->email,
            'role' => $account->role,
            'status' => $account->status,
            'employee' => $account->employee ? [
                'id' => $account->employee->id,
                'full_name' => $account->employee->full_name,
                'technician_profile_id' => $account->employee->technicianProfile?->id,
            ] : null,
            'customer' => $account->customer ? [
                'id' => $account->customer->id,
                'full_name' => $account->customer->full_name,
                'phone' => $account->customer->phone,
            ] : null,
        ];
    }

    public function verifyEmailOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'digits:6'],
        ]);

        $email = strtolower(trim($data['email']));

        $account = Account::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (! $account) {
            throw ValidationException::withMessages([
                'email' => ['Không tìm thấy tài khoản.'],
            ]);
        }

        if ($account->status === Account::STATUS_ACTIVE
            && $account->email_verified_at !== null) {
            return response()->json([
                'message' => 'Email đã được xác thực.',
            ]);
        }

        $otpRecord = EmailVerificationOtp::query()
            ->where('account_id', $account->id)
            ->whereNull('used_at')
            ->latest('id')
            ->first();

        if (! $otpRecord) {
            throw ValidationException::withMessages([
                'otp' => ['Không tìm thấy mã OTP. Vui lòng yêu cầu gửi lại mã.'],
            ]);
        }

        if ($otpRecord->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'otp' => ['Mã OTP đã hết hạn.'],
            ]);
        }

        if (! Hash::check($data['otp'], $otpRecord->otp_hash)) {
            throw ValidationException::withMessages([
                'otp' => ['Mã OTP không chính xác.'],
            ]);
        }

        DB::transaction(function () use ($account, $otpRecord) {
            $otpRecord->update([
                'used_at' => now(),
            ]);

            $account->update([
                'email_verified_at' => now(),
                'status' => Account::STATUS_ACTIVE,
            ]);
        });

        $token = $account->createToken('default')->plainTextToken;

        return response()->json([
            'message' => 'Xác thực email thành công.',
            'token' => $token,
            'account' => $this->formatAccount($account),
        ]);
    }

    public function resendEmailOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower(trim($data['email']));

        $account = Account::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (! $account) {
            throw ValidationException::withMessages([
                'email' => ['Không tìm thấy tài khoản.'],
            ]);
        }

        if ($account->email_verified_at !== null) {
            throw ValidationException::withMessages([
                'email' => ['Email này đã được xác thực.'],
            ]);
        }

        $otp = (string) random_int(100000, 999999);

        EmailVerificationOtp::query()
            ->where('account_id', $account->id)
            ->whereNull('used_at')
            ->delete();

        EmailVerificationOtp::query()->create([
            'account_id' => $account->id,
            'otp_hash' => Hash::make($otp),
            'expires_at' => now()->addMinutes(5),
        ]);

        Mail::to($account->email)
            ->send(new EmailVerificationOtpMail($otp));

        return response()->json([
            'message' => 'Mã OTP mới đã được gửi đến email.',
        ]);
    }

}
