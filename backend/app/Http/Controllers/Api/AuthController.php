<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\Account;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $account = Account::query()->where('email', $data['email'])->first();

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
            ] : null,
        ];
    }
}
