<?php

namespace App\Http\Controllers;

use App\Exceptions\InvalidStatusTransitionException;
use App\Mail\InvoicePaymentRequestMail;
use App\Models\Invoice;
use App\Services\InvoiceEmailPaymentService;
use App\Services\VnpayPaymentService;
use App\Services\VnpayService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Trang khách mở từ email hoá đơn (không cần đăng nhập — link có chữ ký là quyền truy cập).
 * GET: chỉ xem. POST (bấm thanh toán): tạo giao dịch VNPay, nên trình quét link của hộp thư không tạo giao dịch hộ khách.
 * Kết quả hiển thị ở trang công khai của web, chỉ tin dữ liệu có chữ ký VNPay và trạng thái trong Database.
 */
class InvoiceEmailPaymentController extends Controller
{
    public function __construct(
        private readonly InvoiceEmailPaymentService $links,
        private readonly VnpayPaymentService $payments,
        private readonly VnpayService $vnpay,
    ) {}

    public function show(Request $request, int $invoice): View
    {
        $record = Invoice::query()->with('items')->find($invoice);

        return $this->blocked($request, $record) ?? $this->view('ready', $record, ['action' => $request->fullUrl()]);
    }

    public function pay(Request $request, int $invoice): View|RedirectResponse
    {
        $record = Invoice::query()->with('items')->find($invoice);
        if ($blocked = $this->blocked($request, $record)) {
            return $blocked;
        }
        if (! $this->vnpay->isConfigured()) {
            return $this->view('unavailable', $record);
        }

        try {
            $result = $this->payments->createPayment($record, (string) $request->ip(), $this->links->returnUrl());
        } catch (InvalidStatusTransitionException $e) {
            $fresh = $record->fresh('items');

            return $this->blocked($request, $fresh) ?? $this->view('ready', $fresh, ['action' => $request->fullUrl(), 'error' => $e->getMessage()]);
        }

        return redirect()->away($result['payment_url']);
    }

    /** VNPay quay về đây → chuyển nguyên dữ liệu có chữ ký sang trang kết quả công khai của web (đích cố định theo cấu hình). */
    public function vnpayReturn(Request $request): RedirectResponse
    {
        $target = (string) config('services.vnpay.return_url');
        $query = (string) $request->server('QUERY_STRING');

        return redirect()->away($target.(str_contains($target, '?') ? '&' : '?').($query !== '' ? $query.'&' : '').'via=email');
    }

    private function blocked(Request $request, ?Invoice $invoice): ?View
    {
        if (! $invoice || ! $request->hasValidSignature(false)) {
            return $this->view('expired');
        }
        if (! $this->links->matchesRevision($invoice, (string) $request->query('rev'))) {
            return $this->view('changed');
        }

        return match ($invoice->status) {
            Invoice::PAID => $this->view('paid', $invoice),
            Invoice::CANCELLED => $this->view('closed'),
            default => null,
        };
    }

    /** @param array<string, mixed> $extra */
    private function view(string $state, ?Invoice $invoice = null, array $extra = []): View
    {
        return view('invoices.email-payment', $extra + [
            'state' => $state,
            'summary' => $invoice ? InvoicePaymentRequestMail::summary($invoice) : null,
            'action' => null,
            'error' => null,
        ]);
    }
}
