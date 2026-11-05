<?php

namespace App\Services;

use App\Exceptions\InvalidStatusTransitionException;
use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Psr\Log\LoggerInterface;
use Throwable;

/**
 * Nghiệp vụ thanh toán hóa đơn qua VNPay:
 * - Khởi tạo giao dịch (số tiền do Backend tự tính).
 * - IPN: nơi DUY NHẤT nhận kết quả từ VNPay để cập nhật Database (idempotent).
 * - Return: chỉ verify chữ ký và đọc trạng thái trong Database; nếu còn PENDING thì
 *   có thể hỏi lại VNPay bằng querydr (server-to-server), KHÔNG tin dữ liệu trên URL.
 */
class VnpayPaymentService
{
    public function __construct(
        private readonly VnpayService $vnpay,
        private readonly RepairOrderService $repairOrders,
    ) {}

    /**
     * @return array{payment: Payment, payment_url: string}
     */
    public function createPayment(Invoice $invoice, string $ipAddress): array
    {
        return DB::transaction(function () use ($invoice, $ipAddress) {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);

            if ($invoice->status === Invoice::PAID) {
                throw InvalidStatusTransitionException::because('Hóa đơn đã thanh toán đủ.');
            }

            if ($invoice->status === Invoice::CANCELLED) {
                throw InvalidStatusTransitionException::because('Hóa đơn đã bị hủy, không thể thanh toán.');
            }

            $remaining = round((float) $invoice->total_amount - (float) $invoice->totalPaid(), 2);

            if (floor($remaining) !== $remaining) {
                throw InvalidStatusTransitionException::because('Số tiền cần thanh toán phải là số nguyên VND để thanh toán qua VNPay.');
            }

            $amount = (int) $remaining;
            $min = (int) config('services.vnpay.min_amount', 5000);
            $max = (int) config('services.vnpay.max_amount', 9999999999);

            if ($amount < $min || $amount > $max) {
                throw InvalidStatusTransitionException::because(
                    'Số tiền thanh toán qua VNPay phải từ '.number_format($min, 0, ',', '.').'đ đến '.number_format($max, 0, ',', '.').'đ.'
                );
            }

            // Mỗi lần khách bấm thanh toán là một giao dịch mới với vnp_TxnRef mới:
            // VNPay không chấp nhận gửi lại TxnRef đã từng mở trang thanh toán (code=01).
            // Giao dịch PENDING cũ giữ nguyên để vẫn nhận được IPN muộn (nếu có).
            $createdAt = now();

            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'amount' => $amount,
                'payment_method' => Payment::VNPAY,
                'status' => Payment::PENDING,
                'gateway_txn_ref' => Str::upper((string) Str::ulid()),
                'expires_at' => $createdAt->copy()->addMinutes((int) config('services.vnpay.expire_minutes', 15)),
            ]);

            $this->log()->info('VNPay: khởi tạo giao dịch', [
                'payment_id' => $payment->id,
                'invoice_id' => $invoice->id,
                'txn_ref' => $payment->gateway_txn_ref,
                'amount' => $amount,
            ]);

            $paymentUrl = $this->vnpay->buildPaymentUrl([
                'txn_ref' => $payment->gateway_txn_ref,
                'amount' => $amount,
                'order_info' => 'Thanh toan hoa don '.preg_replace('/[^A-Za-z0-9]/', '', $invoice->invoice_code),
                'ip_address' => $ipAddress,
                'created_at' => $payment->created_at,
                'expires_at' => $payment->expires_at,
            ]);

            return ['payment' => $payment, 'payment_url' => $paymentUrl];
        });
    }

    /**
     * Xử lý IPN và trả về JSON đúng định dạng VNPay yêu cầu.
     *
     * @param  array<string, string>  $params
     * @return array{RspCode: string, Message: string}
     */
    public function handleIpn(array $params, string $source = 'IPN'): array
    {
        $txnRef = $params['vnp_TxnRef'] ?? null;
        $context = ['txn_ref' => $txnRef, 'response_code' => $params['vnp_ResponseCode'] ?? null, 'transaction_status' => $params['vnp_TransactionStatus'] ?? null];

        if (! $this->vnpay->verify($params)) {
            $this->log()->warning('VNPay IPN: sai chữ ký', $context);

            return $this->ipnResponse('97', 'Invalid signature');
        }

        if (($params['vnp_TmnCode'] ?? null) !== $this->vnpay->tmnCode() || blank($txnRef)) {
            $this->log()->warning('VNPay IPN: TmnCode hoặc TxnRef không hợp lệ', $context);

            return $this->ipnResponse('01', 'Order not found');
        }

        try {
            return DB::transaction(function () use ($params, $txnRef, $context, $source) {
                $invoiceId = Payment::query()
                    ->where('gateway_txn_ref', $txnRef)
                    ->where('payment_method', Payment::VNPAY)
                    ->value('invoice_id');

                if ($invoiceId === null) {
                    $this->log()->warning('VNPay IPN: không tìm thấy giao dịch', $context);

                    return $this->ipnResponse('01', 'Order not found');
                }

                // Khóa theo cùng thứ tự với recordPayment(): hóa đơn trước, giao dịch sau.
                Invoice::query()->lockForUpdate()->findOrFail($invoiceId);
                $payment = Payment::query()->lockForUpdate()->where('gateway_txn_ref', $txnRef)->firstOrFail();

                if (! $this->amountMatches($payment, $params['vnp_Amount'] ?? '')) {
                    $this->log()->warning('VNPay IPN: số tiền không khớp', $context + [
                        'payment_id' => $payment->id,
                        'expected' => $this->toGatewayAmount($payment),
                        'received' => $params['vnp_Amount'] ?? null,
                    ]);

                    return $this->ipnResponse('04', 'Invalid amount');
                }

                if ($payment->status !== Payment::PENDING) {
                    $this->log()->info('VNPay IPN: giao dịch đã được xử lý trước đó', $context + ['payment_id' => $payment->id, 'status' => $payment->status]);

                    return $this->ipnResponse('02', 'Order already confirmed');
                }

                $responseCode = (string) ($params['vnp_ResponseCode'] ?? '');
                $transactionStatus = (string) ($params['vnp_TransactionStatus'] ?? '');

                $this->applyResult(
                    $payment,
                    $this->resolveIpnStatus($responseCode, $transactionStatus),
                    $responseCode,
                    $transactionStatus,
                    $params,
                    $source,
                );

                return $this->ipnResponse('00', 'Confirm Success');
            });
        } catch (Throwable $e) {
            $this->log()->error('VNPay IPN: lỗi hệ thống', $context + ['error' => $e->getMessage()]);

            return $this->ipnResponse('99', 'Unknow error');
        }
    }

    /**
     * Dữ liệu cho trang kết quả (Return URL). Không dùng dữ liệu URL để xác nhận thanh toán.
     *
     * @param  array<string, string>  $params
     * @return array<string, mixed>|null null khi chữ ký không hợp lệ
     */
    public function returnResult(array $params, string $serverIp): ?array
    {
        if (! $this->vnpay->verify($params)) {
            $this->log()->warning('VNPay Return: sai chữ ký', ['txn_ref' => $params['vnp_TxnRef'] ?? null]);

            return null;
        }

        $payment = Payment::query()
            ->with('invoice')
            ->where('payment_method', Payment::VNPAY)
            ->where('gateway_txn_ref', $params['vnp_TxnRef'] ?? '')
            ->first();

        if (! $payment) {
            return ['found' => false];
        }

        // IPN chưa về (vd. chạy local không có URL công khai): xác nhận bằng chính dữ liệu Return
        // đã được VNPay ký (cùng logic IPN: chữ ký, TmnCode, số tiền, chống xử lý trùng).
        if ($payment->status === Payment::PENDING && config('services.vnpay.confirm_on_return')) {
            $this->handleIpn($params, 'RETURN');
            $payment->refresh()->load('invoice');
        }

        // Vẫn còn PENDING: hỏi VNPay bằng querydr (nếu bật).
        if ($payment->status === Payment::PENDING && config('services.vnpay.query_on_return')) {
            $this->syncWithGateway($payment, $serverIp);
            $payment->refresh()->load('invoice');
        }

        $responseCode = (string) ($params['vnp_ResponseCode'] ?? '');

        return [
            'found' => true,
            'result' => $payment->status,
            'message' => $this->resultMessage($payment, $responseCode),
            'vnp_response_code' => $responseCode,
            'payment' => [
                'id' => $payment->id,
                'txn_ref' => $payment->gateway_txn_ref,
                'amount' => $payment->amount,
                'status' => $payment->status,
                'transaction_code' => $payment->transaction_code,
                'bank_code' => $payment->bank_code,
                'paid_at' => $payment->paid_at?->toIso8601String(),
                'expires_at' => $payment->expires_at?->toIso8601String(),
            ],
            'invoice' => [
                'id' => $payment->invoice->id,
                'invoice_code' => $payment->invoice->invoice_code,
                'repair_order_id' => $payment->invoice->repair_order_id,
                'total_amount' => $payment->invoice->total_amount,
                'status' => $payment->invoice->status,
            ],
        ];
    }

    /**
     * Hỏi VNPay (querydr) và cập nhật giao dịch nếu VNPay đã có kết quả cuối cùng.
     */
    public function syncWithGateway(Payment $payment, string $serverIp): void
    {
        try {
            $data = $this->vnpay->queryTransaction($payment->gateway_txn_ref, $payment->created_at, $serverIp);
        } catch (Throwable $e) {
            $this->log()->warning('VNPay querydr: lỗi kết nối', ['txn_ref' => $payment->gateway_txn_ref, 'error' => $e->getMessage()]);

            return;
        }

        if ($data === null) {
            $this->log()->warning('VNPay querydr: phản hồi không hợp lệ hoặc sai chữ ký', ['txn_ref' => $payment->gateway_txn_ref]);

            return;
        }

        $context = ['txn_ref' => $payment->gateway_txn_ref, 'response_code' => $data['vnp_ResponseCode'] ?? null, 'transaction_status' => $data['vnp_TransactionStatus'] ?? null];

        if (($data['vnp_ResponseCode'] ?? '') !== '00' || ($data['vnp_TxnRef'] ?? '') !== $payment->gateway_txn_ref) {
            $this->log()->info('VNPay querydr: chưa có kết quả', $context);

            return;
        }

        $status = $this->resolveQueryStatus((string) ($data['vnp_TransactionStatus'] ?? ''));

        if ($status === null) {
            return;
        }

        DB::transaction(function () use ($payment, $data, $status, $context) {
            Invoice::query()->lockForUpdate()->findOrFail($payment->invoice_id);
            $locked = Payment::query()->lockForUpdate()->findOrFail($payment->id);

            if ($locked->status !== Payment::PENDING) {
                return;
            }

            if (! $this->amountMatches($locked, $data['vnp_Amount'] ?? '')) {
                $this->log()->warning('VNPay querydr: số tiền không khớp', $context);

                return;
            }

            $this->applyResult($locked, $status, null, (string) $data['vnp_TransactionStatus'], $data, 'QUERYDR');
        });
    }

    /**
     * @param  array<string, string>  $data
     */
    private function applyResult(Payment $payment, ?string $status, ?string $responseCode, string $transactionStatus, array $data, string $source): void
    {
        $invoice = $payment->invoice()->firstOrFail();
        $remainingBefore = (float) $invoice->total_amount - (float) $invoice->totalPaid();

        $payment->gateway_response_code = $responseCode ?? $payment->gateway_response_code;
        $payment->gateway_transaction_status = $transactionStatus;
        $payment->bank_code = ($data['vnp_BankCode'] ?? '') ?: $payment->bank_code;
        $payment->transaction_code = ($data['vnp_TransactionNo'] ?? '') ?: $payment->transaction_code;
        $payment->gateway_payload = collect($data)->except(['vnp_SecureHash', 'vnp_SecureHashType'])->all();

        $context = ['payment_id' => $payment->id, 'txn_ref' => $payment->gateway_txn_ref, 'source' => $source, 'response_code' => $responseCode, 'transaction_status' => $transactionStatus];

        if ($status === null) {
            // Ví dụ mã 07: trừ tiền thành công nhưng bị nghi ngờ, cần xử lý trên Merchant Admin.
            $payment->save();
            $this->log()->warning('VNPay: giao dịch cần kiểm tra thủ công, giữ PENDING', $context);

            return;
        }

        $payment->status = $status;
        $payment->paid_at = $status === Payment::SUCCESS ? now() : null;
        $payment->save();

        $this->log()->info('VNPay: cập nhật kết quả giao dịch', $context + ['status' => $status]);

        if ($status !== Payment::SUCCESS) {
            return;
        }

        $this->repairOrders->refreshInvoiceStatus($invoice);

        if ((float) $payment->amount > $remainingBefore + 0.001) {
            $this->log()->warning('VNPay: khách đã trả thừa, cần hoàn tiền thủ công', $context + ['remaining_before' => $remainingBefore]);

            AuditLog::query()->create([
                'action' => 'VNPAY_OVERPAID',
                'auditable_type' => Payment::class,
                'auditable_id' => $payment->id,
                'new_values' => ['amount' => $payment->amount, 'remaining_before' => $remainingBefore, 'transaction_code' => $payment->transaction_code],
                'reason' => 'Hóa đơn đã được thanh toán trước khi VNPay báo thành công. Cần hoàn tiền qua Merchant Admin.',
            ]);
        }
    }

    private function resolveIpnStatus(string $responseCode, string $transactionStatus): ?string
    {
        if ($responseCode === '00' && $transactionStatus === '00') {
            return Payment::SUCCESS;
        }

        if ($responseCode === '07' || $transactionStatus === '07') {
            return null;
        }

        if (in_array($responseCode, ['24', '11'], true)) {
            return Payment::CANCELLED;
        }

        return Payment::FAILED;
    }

    private function resolveQueryStatus(string $transactionStatus): ?string
    {
        return match ($transactionStatus) {
            '00' => Payment::SUCCESS,
            '02' => Payment::FAILED,
            '08', '11' => Payment::CANCELLED,
            default => null,
        };
    }

    private function resultMessage(Payment $payment, string $responseCode): string
    {
        return match ($payment->status) {
            Payment::SUCCESS => 'VNPay đã xác nhận giao dịch, hóa đơn đã được ghi nhận thanh toán.',
            Payment::CANCELLED => $responseCode === '11' ? 'Giao dịch đã hết hạn chờ thanh toán.' : 'Bạn đã hủy giao dịch.',
            Payment::FAILED => 'Thanh toán không thành công. Vui lòng thử lại.',
            default => $responseCode === '07'
                ? 'Giao dịch đang được kiểm tra. Gara sẽ xác nhận trong thời gian sớm nhất.'
                : 'Đang chờ VNPay xác nhận kết quả thanh toán.',
        };
    }

    private function amountMatches(Payment $payment, string $gatewayAmount): bool
    {
        return ctype_digit($gatewayAmount) && (int) $gatewayAmount === $this->toGatewayAmount($payment);
    }

    private function toGatewayAmount(Payment $payment): int
    {
        return (int) round((float) $payment->amount * 100);
    }

    /**
     * @return array{RspCode: string, Message: string}
     */
    private function ipnResponse(string $code, string $message): array
    {
        return ['RspCode' => $code, 'Message' => $message];
    }

    private function log(): LoggerInterface
    {
        return Log::channel(config('services.vnpay.log_channel', 'vnpay'));
    }
}
