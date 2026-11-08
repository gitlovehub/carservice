<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quotation;
use App\Services\ConfirmationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Khách duyệt báo giá tại quầy bằng OTP email (D-005, D-008).
 * Cố vấn chỉ chuyển lựa chọn của khách; xác nhận chỉ có hiệu lực khi khách đọc đúng OTP
 * gửi tới email chủ xe, và OTP gắn với đúng các lựa chọn đó.
 */
class QuotationConfirmationController extends Controller
{
    public function __construct(private readonly ConfirmationService $confirmations) {}

    public function requestOtp(Request $request, Quotation $quotation): JsonResponse
    {
        $responses = $this->validatedResponses($request, $quotation);
        $otp = $this->confirmations->requestQuotationOtp($quotation, $responses, $request->user());

        return response()->json([
            'message' => 'Đã gửi mã xác nhận tới email chủ xe.',
            'sent_to' => $this->maskEmail($otp->sent_to_email),
            'expires_at' => $otp->expires_at->toIso8601String(),
        ]);
    }

    public function verifyOtp(Request $request, Quotation $quotation): JsonResponse
    {
        $request->validate(['code' => ['required', 'string', 'regex:/^\d{6}$/']]);
        $responses = $this->validatedResponses($request, $quotation);

        $result = $this->confirmations->verifyQuotationOtp(
            $quotation, $request->string('code')->toString(), $responses, $request->user()->employee, $request,
        );

        return response()->json($result);
    }

    /** @return array<int, array{item_id: int, is_approved: bool}> */
    private function validatedResponses(Request $request, Quotation $quotation): array
    {
        $data = $request->validate([
            'responses' => ['required', 'array', 'min:1'],
            'responses.*.item_id' => [
                'required', 'integer', 'distinct',
                Rule::exists('quotation_items', 'id')->where(fn ($query) => $query->where('quotation_id', $quotation->id)),
            ],
            'responses.*.is_approved' => ['required', 'boolean'],
        ]);

        return $data['responses'];
    }

    private function maskEmail(string $email): string
    {
        [$name, $domain] = array_pad(explode('@', $email, 2), 2, '');

        return mb_substr($name, 0, 2).str_repeat('*', max(1, mb_strlen($name) - 2)).'@'.$domain;
    }
}
