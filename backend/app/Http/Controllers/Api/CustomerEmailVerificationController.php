<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\AccountEmailService;
use App\Services\ConfirmationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** Xác minh email chủ xe tại quầy: gửi mã tới email, khách đọc lại mã. Email đã xác minh chỉ admin được đổi. */
class CustomerEmailVerificationController extends Controller
{
    public function __construct(private readonly ConfirmationService $confirmations) {}

    public function send(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:150']]);
        $otp = $this->confirmations->requestCustomerEmailOtp($customer, $data['email'], $request->user());

        return response()->json([
            'message' => 'Đã gửi mã xác minh tới email.',
            'sent_to' => $otp->sent_to_email,
            'expires_at' => $otp->expires_at->toIso8601String(),
        ]);
    }

    public function verify(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:150'],
            'code' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);
        $updated = $this->confirmations->verifyCustomerEmailOtp($customer, $data['email'], $data['code'], $request->user(), $request);

        return response()->json(['message' => 'Đã xác minh email chủ xe.', 'email' => $updated->email, 'email_verified' => true]);
    }

    /** Khách có tài khoản đổi email (kể cả mất email cũ): gửi nút xác thực tới email mới, khách tự bấm. */
    public function sendChangeLink(Request $request, Customer $customer, AccountEmailService $emails): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:150']], ['email.required' => 'Nhập email mới.', 'email.email' => 'Email không hợp lệ.']);
        if (! $customer->account) {
            throw ValidationException::withMessages(['email' => 'Khách chưa có tài khoản, hãy xác minh email bằng mã tại quầy.']);
        }
        $sentTo = $emails->requestChange($customer->account, $data['email'], $request->user());

        return response()->json(['message' => "Đã gửi nút xác thực tới {$sentTo}. Email chỉ đổi sau khi khách bấm nút.", 'sent_to' => $sentTo]);
    }
}
