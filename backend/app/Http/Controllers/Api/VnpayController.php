<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\InvoiceEmailPaymentService;
use App\Services\VnpayPaymentService;
use App\Services\VnpayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Gate;

class VnpayController extends Controller
{
    public function __construct(
        private readonly VnpayService $vnpay,
        private readonly VnpayPaymentService $payments,
        private readonly InvoiceEmailPaymentService $emailPayments,
    ) {}

    /**
     * POST /api/me/invoices/{invoice}/vnpay – Khách tạo yêu cầu thanh toán cho hóa đơn của mình.
     */
    public function create(Request $request, Invoice $invoice): JsonResponse
    {
        abort_unless(Gate::forUser($request->user())->allows('own', $invoice), 404);
        abort_unless($this->vnpay->isConfigured(), 503, 'Cổng thanh toán VNPay chưa được cấu hình.');

        $result = $this->payments->createPayment($invoice, (string) $request->ip());
        $payment = $result['payment'];

        return response()->json([
            'payment_id' => $payment->id,
            'txn_ref' => $payment->gateway_txn_ref,
            'amount' => $payment->amount,
            'status' => $payment->status,
            'expires_at' => $payment->expires_at?->toIso8601String(),
            'payment_url' => $result['payment_url'],
        ], 201);
    }

    /**
     * GET /api/payments/vnpay/ipn – VNPay gọi server-to-server. Luôn trả HTTP 200 + RspCode.
     */
    public function ipn(Request $request): JsonResponse
    {
        $params = $this->vnpay->extractParams($request->server('QUERY_STRING'));

        return response()->json($this->payments->handleIpn($params));
    }

    /**
     * GET /api/payments/vnpay/return – Frontend chuyển nguyên query string VNPay trả về để hiển thị kết quả.
     */
    public function return(Request $request): JsonResponse
    {
        $params = $this->vnpay->extractParams($request->server('QUERY_STRING'));
        $result = $this->payments->returnResult($params, (string) ($request->server('SERVER_ADDR') ?: '127.0.0.1'));

        if ($result === null) {
            return response()->json(['message' => 'Dữ liệu trả về từ VNPay không hợp lệ (sai chữ ký).'], 400);
        }

        if ($result['found'] === false) {
            return response()->json(['message' => 'Không tìm thấy giao dịch.'], 404);
        }

        unset($result['found']);

        if ($request->query('via') === 'email') {
            $result['retry_url'] = $this->emailRetryUrl($result);
        }

        return response()->json($result);
    }

    /**
     * Khách trả từ email không đăng nhập: giao dịch lỗi / huỷ thì cấp lại link hoá đơn.
     * Dữ liệu VNPay ký không hết hạn nên chỉ cấp trong thời gian ngắn sau giao dịch.
     *
     * @param  array<string, mixed>  $result
     */
    private function emailRetryUrl(array $result): ?string
    {
        $expiresAt = $result['payment']['expires_at'] ? Carbon::parse($result['payment']['expires_at']) : null;
        if (! in_array($result['result'], [Payment::FAILED, Payment::CANCELLED], true) || ! $expiresAt?->copy()->addHour()->isFuture()) {
            return null;
        }

        $invoice = Invoice::query()->find($result['invoice']['id']);

        return $invoice && ! in_array($invoice->status, [Invoice::PAID, Invoice::CANCELLED], true)
            ? $this->emailPayments->url($invoice)
            : null;
    }
}
