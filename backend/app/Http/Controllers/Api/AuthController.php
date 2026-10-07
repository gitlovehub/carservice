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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['email'] = strtolower(trim((string) $data['email']));
        $data['full_name'] = trim((string) $data['full_name']);
        $data['phone'] = trim((string) $data['phone']);

        // Check if account already exists
        if (Account::where('email', $data['email'])->exists()) {
            throw ValidationException::withMessages([
                'email' => ['Email đã tồn tại.'],
            ]);
        }

        // Tạo mã OTP 6 số
        $otp = sprintf("%06d", mt_rand(1, 999999));

        // Lưu thông tin đăng ký và OTP vào cache trong 10 phút
        Cache::put('register_data_' . $data['email'], $data, now()->addMinutes(10));
        Cache::put('register_otp_' . $data['email'], $otp, now()->addMinutes(10));

        // Gửi email OTP
        Mail::raw("Mã xác thực OTP đăng ký tài khoản của bạn là: $otp", function ($message) use ($data) {
            $message->to($data['email'])
                    ->subject('Mã xác thực đăng ký tài khoản CarService');
        });

        return response()->json([
            'message' => 'Vui lòng kiểm tra email để nhận mã OTP.',
        ], 200);
    }

    public function verifyEmailOtp(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string|size:6',
        ]);

        $email = strtolower(trim((string) $request->email));
        $otp = $request->otp;

        $cachedOtp = Cache::get('register_otp_' . $email);
        if (!$cachedOtp || $cachedOtp !== $otp) {
            return response()->json(['message' => 'Mã OTP không hợp lệ hoặc đã hết hạn.'], 400);
        }

        $data = Cache::get('register_data_' . $email);
        if (!$data) {
            return response()->json(['message' => 'Dữ liệu đăng ký không tồn tại hoặc đã hết hạn.'], 400);
        }

        $account = DB::transaction(function () use ($data) {
            $account = Account::query()->create([
                'email' => $data['email'],
                'password_hash' => Hash::make($data['password']),
                'role' => Account::ROLE_CUSTOMER,
                'status' => Account::STATUS_ACTIVE,
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

        // Xóa cache sau khi thành công
        Cache::forget('register_otp_' . $email);
        Cache::forget('register_data_' . $email);

        $token = null;
        if ($request->hasSession()) {
            Auth::guard('web')->login($account);
            $request->session()->regenerate();
        } else {
            $token = $account->createToken($data['device_name'] ?? 'default')->plainTextToken;
        }

        return response()->json([
            'message' => 'Đăng ký và xác thực tài khoản thành công.',
            'token' => $token,
            'account' => $this->formatAccount($account),
        ], 201);
    }

    public function resendEmailOtp(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        $email = strtolower(trim((string) $request->email));

        $data = Cache::get('register_data_' . $email);
        if (!$data) {
            return response()->json(['message' => 'Vui lòng đăng ký lại từ đầu.'], 400);
        }

        $otp = sprintf("%06d", mt_rand(1, 999999));
        Cache::put('register_otp_' . $email, $otp, now()->addMinutes(10));

        Mail::raw("Mã xác thực OTP đăng ký tài khoản của bạn là: $otp", function ($message) use ($email) {
            $message->to($email)
                    ->subject('Mã xác thực đăng ký tài khoản CarService');
        });

        return response()->json(['message' => 'Mã OTP mới đã được gửi lại vào email.'], 200);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);
        $email = strtolower(trim((string) $request->email));

        $account = Account::where('email', $email)->first();
        if (!$account) {
            return response()->json(['message' => 'Email không tồn tại trong hệ thống.'], 404);
        }

        $otp = sprintf("%06d", mt_rand(1, 999999));
        Cache::put('forgot_otp_' . $email, $otp, now()->addMinutes(10));

        Mail::raw("Mã xác thực OTP để lấy lại mật khẩu của bạn là: $otp", function ($message) use ($email) {
            $message->to($email)
                    ->subject('Khôi phục mật khẩu CarService');
        });

        return response()->json(['message' => 'Mã OTP khôi phục mật khẩu đã được gửi.'], 200);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'otp' => 'required|string|size:6',
            'new_password' => 'required|string|min:6'
        ]);

        $email = strtolower(trim((string) $request->email));
        $otp = $request->otp;

        $cachedOtp = Cache::get('forgot_otp_' . $email);
        if (!$cachedOtp || $cachedOtp !== $otp) {
            return response()->json(['message' => 'Mã OTP không hợp lệ hoặc đã hết hạn.'], 400);
        }

        $account = Account::where('email', $email)->first();
        if (!$account) {
            return response()->json(['message' => 'Không tìm thấy tài khoản.'], 404);
        }

        if (Hash::check($request->new_password, $account->getAuthPassword())) {
            return response()->json([
                'errors' => [
                    'new_password' => ['Mật khẩu mới không được trùng với mật khẩu cũ.']
                ]
            ], 422);
        }

        $account->password_hash = Hash::make($request->new_password);
        $account->save();

        Cache::forget('forgot_otp_' . $email);

        return response()->json(['message' => 'Mật khẩu đã được cập nhật thành công.'], 200);
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
}
