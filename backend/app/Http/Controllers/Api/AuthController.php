<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\PasswordResetOtp;
use App\Services\AccountEmailService;
use App\Services\PasswordResetService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function __construct(private readonly AccountEmailService $accountEmails) {}

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

            // Luôn tạo hồ sơ riêng; chỉ liên kết hồ sơ walk-in sau khi khách bấm nút xác thực trong email.
            Customer::query()->create([
                'account_id' => $account->id,
                'full_name' => $data['full_name'],
                'phone' => $data['phone'],
                'email' => $data['email'],
            ]);

            return $account;
        });

        $this->accountEmails->sendVerification($account);

        return response()->json([
            'message' => 'Đăng ký thành công. Vui lòng mở email và bấm nút xác thực tài khoản.',
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
                    'Tài khoản chưa xác thực email. Vui lòng bấm nút xác thực trong email.',
                ],
            ]);
        }

        if (! $account->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['Tài khoản đang bị khóa hoặc ngừng hoạt động.'],
            ]);
        }

        $token = null;

        if (EnsureFrontendRequestsAreStateful::fromFrontend($request) && $request->hasSession()) {
            Auth::guard('web')->login($account);
            $request->session()->regenerate();
        } else {
            $token = $account->createToken(
                $data['device_name'] ?? 'carservice-web'
            )->plainTextToken;
        }

        // Frontend React luôn xác thực bằng Bearer token (local và deploy như nhau)
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

    public function updateProfile(Request $request): JsonResponse
    {
        $account = $this->authenticatedAccount($request);

        $validated = $request->validate([
            'full_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'avatar' => ['sometimes', 'nullable', 'string'],
        ], [
            'full_name.max' => 'Họ và tên không được vượt quá 100 ký tự.',
            'phone.max' => 'Số điện thoại không được vượt quá 20 ký tự.',
            'address.max' => 'Địa chỉ không được vượt quá 255 ký tự.',
        ]);

        if (array_key_exists('avatar', $validated)) {
            $account->avatar = $validated['avatar'];
            $account->save();
        }

        if ($account->role === Account::ROLE_CUSTOMER) {
            if (! $account->customer) {
                Customer::query()->create([
                    'account_id' => $account->id,
                    'full_name' => $validated['full_name'] ?? 'Khách hàng',
                    'phone' => $validated['phone'] ?? '',
                    'email' => $account->email,
                    'address' => $validated['address'] ?? null,
                ]);
            } else {
                $customerUpdates = [];
                if (array_key_exists('full_name', $validated) && $validated['full_name'] !== null) {
                    $customerUpdates['full_name'] = $validated['full_name'];
                }
                if (array_key_exists('phone', $validated) && $validated['phone'] !== null) {
                    $customerUpdates['phone'] = $validated['phone'];
                }
                if (array_key_exists('address', $validated)) {
                    $customerUpdates['address'] = $validated['address'];
                }
                if (! empty($customerUpdates)) {
                    $account->customer->update($customerUpdates);
                }
            }
        } else {
            if (! $account->employee) {
                Employee::query()->create([
                    'account_id' => $account->id,
                    'full_name' => $validated['full_name'] ?? 'Nhân viên',
                    'phone' => $validated['phone'] ?? '',
                    'status' => 'ACTIVE',
                ]);
            } else {
                $employeeUpdates = [];
                if (array_key_exists('full_name', $validated) && $validated['full_name'] !== null) {
                    $employeeUpdates['full_name'] = $validated['full_name'];
                }
                if (array_key_exists('phone', $validated) && $validated['phone'] !== null) {
                    $employeeUpdates['phone'] = $validated['phone'];
                }
                if (! empty($employeeUpdates)) {
                    $account->employee->update($employeeUpdates);
                }
            }
        }

        $freshAccount = $account->fresh(['employee.technicianProfile', 'customer']);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông tin thành công.',
            'account' => $this->formatAccount($freshAccount),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $account = $this->authenticatedAccount($request);

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
            ],
            'new_password_confirmation' => ['required', 'string'],
        ], [
            'current_password.required' => 'Vui lòng nhập mật khẩu hiện tại.',
            'new_password.required' => 'Vui lòng nhập mật khẩu mới.',
            'new_password.min' => 'Mật khẩu mới phải có ít nhất 8 ký tự.',
            'new_password.confirmed' => 'Xác nhận mật khẩu mới không khớp.',
            'new_password.regex' => 'Mật khẩu mới phải bao gồm chữ thường, chữ hoa và chữ số.',
            'new_password_confirmation.required' => 'Vui lòng xác nhận mật khẩu mới.',
        ]);

        if (! Hash::check($validated['current_password'], $account->getAuthPassword())) {
            throw ValidationException::withMessages([
                'current_password' => ['Mật khẩu hiện tại không chính xác.'],
            ]);
        }

        if (Hash::check($validated['new_password'], $account->getAuthPassword())) {
            throw ValidationException::withMessages([
                'new_password' => ['Mật khẩu mới không được trùng với mật khẩu hiện tại.'],
            ]);
        }

        $account->password_hash = Hash::make($validated['new_password']);
        $account->save();

        return response()->json([
            'success' => true,
            'message' => 'Đổi mật khẩu thành công.',
        ]);
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
            'avatar' => $account->avatar,
            'created_at' => $account->created_at,
            'employee' => $account->employee ? [
                'id' => $account->employee->id,
                'full_name' => $account->employee->full_name,
                'phone' => $account->employee->phone,
                'technician_profile_id' => $account->employee->technicianProfile?->id,
            ] : null,
            'customer' => $account->customer ? [
                'id' => $account->customer->id,
                'full_name' => $account->customer->full_name,
                'phone' => $account->customer->phone,
                'email' => $account->customer->email,
                'address' => $account->customer->address,
            ] : null,
        ];
    }

    /** POST /api/resend-verification: chỉ gửi cho tài khoản đang chờ, phản hồi giống nhau để không lộ email có tồn tại hay không. */
    public function resendVerification(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $account = Account::query()->whereRaw('LOWER(email) = ?', [strtolower(trim($data['email']))])->first();
        if ($account?->status === Account::STATUS_PENDING) {
            $this->accountEmails->sendVerification($account);
        }

        return response()->json(['message' => 'Nếu tài khoản đang chờ xác thực, email xác thực mới đã được gửi.']);
    }

    /** POST /api/me/email-change: khách nhập mật khẩu + email mới, email chỉ đổi sau khi bấm nút trong email mới. */
    public function requestEmailChange(Request $request): JsonResponse
    {
        $account = $this->authenticatedAccount($request);
        abort_unless($account->role === Account::ROLE_CUSTOMER, 403, 'Email nhân viên do quản trị viên thay đổi.');

        $data = $request->validate([
            'email' => ['required', 'email', 'max:150'],
            'current_password' => ['required', 'string'],
        ], [
            'email.required' => 'Nhập email mới.',
            'email.email' => 'Email không hợp lệ.',
            'current_password.required' => 'Nhập mật khẩu hiện tại.',
        ]);
        if (! Hash::check($data['current_password'], $account->getAuthPassword())) {
            throw ValidationException::withMessages(['current_password' => 'Mật khẩu hiện tại không chính xác.']);
        }

        $sentTo = $this->accountEmails->requestChange($account, $data['email'], $account);

        return response()->json(['message' => "Đã gửi nút xác thực tới {$sentTo}. Email cũ vẫn dùng được cho đến khi bạn xác thực.", 'sent_to' => $sentTo]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $account = Account::whereRaw('LOWER(email) = ?', [
            strtolower($request->email),
        ])->first();

        // Không tiết lộ email có tồn tại trong hệ thống hay không
        if (! $account) {
            return response()->json([
                'message' => 'Nếu email tồn tại trong hệ thống, mã OTP sẽ được gửi đến email.',
            ]);
        }

        app(PasswordResetService::class)->sendOtp($account);

        return response()->json([
            'message' => 'Nếu email tồn tại trong hệ thống, mã OTP sẽ được gửi đến email.',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'otp' => ['required', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'max:255', 'confirmed'],
        ]);

        $account = Account::whereRaw('LOWER(email) = ?', [
            strtolower($request->email),
        ])->first();

        if (! $account) {
            return response()->json([
                'message' => 'Mã OTP không hợp lệ hoặc đã hết hạn.',
            ], 422);
        }

        // Lấy OTP mới nhất chưa sử dụng
        $passwordResetOtp = PasswordResetOtp::where('account_id', $account->id)
            ->whereNull('used_at')
            ->latest()
            ->first();

        if (! $passwordResetOtp) {
            return response()->json([
                'message' => 'Mã OTP không hợp lệ hoặc đã hết hạn.',
            ], 422);
        }

        // Kiểm tra OTP đã hết hạn chưa
        if ($passwordResetOtp->expires_at->isPast()) {
            return response()->json([
                'message' => 'Mã OTP không hợp lệ hoặc đã hết hạn.',
            ], 422);
        }

        // Kiểm tra OTP
        if (! Hash::check($request->otp, $passwordResetOtp->otp_hash)) {
            return response()->json([
                'message' => 'Mã OTP không hợp lệ hoặc đã hết hạn.',
            ], 422);
        }

        // Kiểm tra mật khẩu không được trùng cũ
        if (Hash::check($request->password, $account->password_hash)) {
            return response()->json([
                'message' => 'Mật khẩu mới không được trùng với mật khẩu cũ.',
            ], 422);
        }

        DB::transaction(function () use ($account, $passwordResetOtp, $request) {
            // Đổi mật khẩu
            $account->password_hash = Hash::make($request->password);
            $account->save();

            // OTP không được sử dụng lại
            $passwordResetOtp->used_at = now();
            $passwordResetOtp->save();

            // Đăng xuất tất cả thiết bị/token cũ
            $account->tokens()->delete();
        });

        return response()->json([
            'message' => 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
        ]);
    }
}
