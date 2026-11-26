<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\InvoiceEmailPaymentService;
use App\Services\RepairOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function __construct(private readonly RepairOrderService $service) {}

    public function store(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorize('update', $invoice);

        // Thu tại quầy, cố vấn xác nhận đã nhận tiền (PO 17/11/2026): tiền mặt / chuyển khoản / thẻ / ví điện tử.
        // Trừ tiền mặt đều bắt buộc mã giao dịch. VNPay do khách tự thanh toán (VnpayController).
        $data = $request->validate([
            'payment_method' => ['sometimes', 'string', Rule::in(Payment::COUNTER_METHODS)],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'transaction_code' => ['nullable', 'string', 'max:100', Rule::requiredIf(fn () => in_array($request->input('payment_method'), [Payment::TRANSFER, Payment::CARD, Payment::EWALLET], true))],
        ], [
            'payment_method.in' => 'Phương thức thu tại quầy: tiền mặt, chuyển khoản, thẻ ngân hàng hoặc ví điện tử.',
            'transaction_code.required' => 'Nhập mã giao dịch (mã chuyển khoản / mã chuẩn chi POS / mã ví) để đối soát.',
        ]);

        $payment = $this->service->recordPayment($invoice, $data['payment_method'] ?? Payment::DIRECT, (float) $data['amount'], $data['transaction_code'] ?? null, $request->user());

        return response()->json($payment, 201);
    }

    /** POST /api/invoices/{invoice}/payment-email — cố vấn đồng ý gửi hoá đơn kèm link thanh toán VNPay cho khách. */
    public function sendPaymentEmail(Request $request, Invoice $invoice, InvoiceEmailPaymentService $emailPayments): JsonResponse
    {
        $this->authorize('update', $invoice);

        $email = $emailPayments->send($invoice, $request->user());

        return response()->json(['message' => "Đã gửi hoá đơn và link thanh toán tới {$email}.", 'emailed_to' => $email]);
    }
}
