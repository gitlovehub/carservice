<?php

namespace App\Mail;

use App\Models\Invoice;
use App\Services\InvoiceEmailPaymentService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** Gửi khách hoá đơn (hạng mục + số còn phải trả) và nút "Xem & thanh toán" (link có chữ ký, không cần đăng nhập). */
class InvoicePaymentRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Invoice $invoice, public string $paymentUrl) {}

    public function build(): self
    {
        return $this->subject('Hoá đơn '.$this->invoice->invoice_code.' cần thanh toán – CarService')
            ->view('emails.invoice-payment-request', self::summary($this->invoice) + [
                'paymentUrl' => $this->paymentUrl,
                'ttlDays' => InvoiceEmailPaymentService::TTL_DAYS,
            ]);
    }

    /**
     * Nội dung hoá đơn dùng chung cho email và trang thanh toán.
     *
     * @return array{code: string, orderCode: string, customerName: string, car: string, items: list<array{name: string, type: string, quantity: int, price: float, amount: float}>, subtotal: float, discount: float, total: float, paid: float, remaining: float}
     */
    public static function summary(Invoice $invoice): array
    {
        $invoice->loadMissing('items', 'repairOrder.customer', 'repairOrder.vehicle.model.brand');
        $order = $invoice->repairOrder;
        $vehicle = $order?->vehicle;
        $car = trim(implode(' ', array_filter([$vehicle?->model?->brand?->name, $vehicle?->model?->name])));
        $paid = (float) $invoice->totalPaid();

        return [
            'code' => (string) $invoice->invoice_code,
            'orderCode' => (string) $order?->repair_order_code,
            'customerName' => $order?->customer?->full_name ?: 'Quý khách',
            'car' => ($car !== '' ? $car.' · ' : '').($vehicle?->license_plate ?: 'chưa có biển số'),
            'items' => $invoice->items->sortBy('id')->map(fn ($item) => [
                'name' => (string) $item->description,
                'type' => $item->item_type === 'PART' ? 'Phụ tùng' : 'Dịch vụ',
                'quantity' => (int) $item->quantity,
                'price' => (float) $item->unit_price,
                'amount' => (float) $item->amount,
            ])->values()->all(),
            'subtotal' => (float) $invoice->subtotal,
            'discount' => (float) $invoice->discount_amount,
            'total' => (float) $invoice->total_amount,
            'paid' => $paid,
            'remaining' => max(0, round((float) $invoice->total_amount - $paid, 2)),
        ];
    }
}
