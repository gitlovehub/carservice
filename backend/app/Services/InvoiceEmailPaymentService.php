<?php

namespace App\Services;

use App\Exceptions\InvalidStatusTransitionException;
use App\Mail\InvoicePaymentRequestMail;
use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Invoice;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Throwable;

/**
 * Thanh toán hoá đơn qua email: cố vấn đồng ý gửi → khách nhận link có chữ ký (3 ngày, gắn đúng nội dung hoá đơn),
 * xem hoá đơn và trả qua VNPay không cần đăng nhập. Số tiền luôn do Backend tính lại lúc khách bấm thanh toán.
 */
class InvoiceEmailPaymentService
{
    public const TTL_DAYS = 3;

    public function __construct(private readonly VnpayService $vnpay) {}

    /**
     * @return string Email đã gửi tới.
     *
     * @throws InvalidStatusTransitionException
     */
    public function send(Invoice $invoice, Account $actor): string
    {
        $invoice->loadMissing('items', 'repairOrder.customer.account', 'repairOrder.vehicle.model.brand');

        if (in_array($invoice->status, [Invoice::PAID, Invoice::CANCELLED], true)) {
            throw InvalidStatusTransitionException::because('Hoá đơn đã thanh toán đủ hoặc đã huỷ, không cần gửi email thanh toán.');
        }
        if (! $this->vnpay->isConfigured()) {
            throw InvalidStatusTransitionException::because('Cổng thanh toán VNPay chưa được cấu hình nên chưa gửi được link thanh toán.');
        }

        $minimum = (float) config('services.vnpay.min_amount', 5000);
        if ((float) $invoice->total_amount - (float) $invoice->totalPaid() < $minimum) {
            throw InvalidStatusTransitionException::because('Số tiền còn lại thấp hơn mức tối thiểu của VNPay ('.number_format($minimum, 0, ',', '.').' ₫). Vui lòng thu tại quầy.');
        }

        $customer = $invoice->repairOrder?->customer;
        $email = $customer?->email ?: $customer?->account?->email;
        if (! $email) {
            throw InvalidStatusTransitionException::because('Khách chưa có email. Hãy bổ sung email trong hồ sơ khách hoặc thu tại quầy.');
        }

        try {
            Mail::to($email)->send(new InvoicePaymentRequestMail($invoice, $this->url($invoice)));
        } catch (Throwable $e) {
            Log::warning('Không gửi được email thanh toán hoá đơn', ['invoice_id' => $invoice->id, 'error' => $e->getMessage()]);

            throw InvalidStatusTransitionException::because('Không gửi được email. Vui lòng thử lại hoặc thu tại quầy.');
        }

        AuditLog::query()->create([
            'account_id' => $actor->id,
            'action' => 'INVOICE_PAYMENT_EMAIL_SENT',
            'auditable_type' => Invoice::class,
            'auditable_id' => $invoice->id,
            'new_values' => ['email' => $email],
        ]);

        return $email;
    }

    public function url(Invoice $invoice): string
    {
        // Ký đường dẫn tương đối rồi gắn APP_URL (như link duyệt báo giá): không phụ thuộc host lúc gửi / lúc mở.
        $path = URL::temporarySignedRoute('invoices.email-payment', now()->addDays(self::TTL_DAYS), [
            'invoice' => $invoice->id,
            'rev' => $this->revision($invoice),
        ], false);

        return rtrim((string) config('app.url'), '/').$path;
    }

    /** Trang kết quả không cần đăng nhập, khác trang kết quả trong tài khoản khách. */
    public function returnUrl(): string
    {
        return rtrim((string) config('app.url'), '/').route('invoices.email-payment.return', [], false);
    }

    public function matchesRevision(Invoice $invoice, string $revision): bool
    {
        return hash_equals($this->revision($invoice), $revision);
    }

    private function revision(Invoice $invoice): string
    {
        $invoice->loadMissing('items');

        return substr(hash('sha256', implode('|', [
            $invoice->id, $invoice->invoice_code, (string) $invoice->total_amount,
            $invoice->items->sortBy('id')->map(fn ($item) => $item->id.':'.$item->quantity.':'.$item->unit_price)->implode(','),
        ])), 0, 16);
    }
}
