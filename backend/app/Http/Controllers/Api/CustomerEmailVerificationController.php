<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\ConfirmationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
}
