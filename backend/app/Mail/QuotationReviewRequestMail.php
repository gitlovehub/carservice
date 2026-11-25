<?php

namespace App\Mail;

use App\Models\Quotation;
use App\Services\QuotationEmailReviewService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** Gửi khách báo giá (danh sách hạng mục + tổng) và nút "Xem & duyệt báo giá" (link có chữ ký, không cần đăng nhập). */
class QuotationReviewRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Quotation $quotation, public string $reviewUrl) {}

    public function build(): self
    {
        $supplement = $this->quotation->type === Quotation::TYPE_SUPPLEMENT;

        return $this->subject(($supplement ? 'Báo giá phát sinh ' : 'Báo giá ').$this->quotation->quotation_code.' cần bạn duyệt – CarService')
            ->view('emails.quotation-review-request', self::summary($this->quotation) + [
                'reviewUrl' => $this->reviewUrl,
                'supplement' => $supplement,
                'ttlDays' => QuotationEmailReviewService::TTL_DAYS,
            ]);
    }

    /**
     * Nội dung báo giá dùng chung cho email và trang duyệt.
     *
     * @return array{code: string, orderCode: string, customerName: string, car: string, items: list<array{id: int, name: string, type: string, quantity: int, price: float, amount: float, required: bool, requiredReason: ?string}>, subtotal: float, discount: float, total: float, reason: ?string, staysOvernight: bool}
     */
    public static function summary(Quotation $quotation): array
    {
        $quotation->loadMissing('items', 'repairOrder.customer', 'repairOrder.vehicle.model.brand');
        $order = $quotation->repairOrder;
        $vehicle = $order?->vehicle;
        $car = trim(implode(' ', array_filter([$vehicle?->model?->brand?->name, $vehicle?->model?->name])));

        return [
            'code' => (string) $quotation->quotation_code,
            'orderCode' => (string) $order?->repair_order_code,
            'customerName' => $order?->customer?->full_name ?: 'Quý khách',
            'car' => ($car !== '' ? $car.' · ' : '').($vehicle?->license_plate ?: 'chưa có biển số'),
            'items' => $quotation->items->sortBy('id')->map(fn ($item) => [
                'id' => (int) $item->id,
                'name' => (string) $item->description,
                'type' => $item->item_type === 'PART' ? 'Phụ tùng' : 'Dịch vụ',
                'quantity' => (int) $item->quantity,
                'price' => (float) $item->unit_price,
                'amount' => (float) $item->amount,
                'required' => (bool) $item->is_required,
                'requiredReason' => $item->required_reason,
            ])->values()->all(),
            'subtotal' => (float) $quotation->subtotal,
            'discount' => (float) $quotation->discount_amount,
            'total' => (float) $quotation->total_amount,
            'reason' => $quotation->reason,
            'staysOvernight' => (bool) $quotation->stays_overnight,
        ];
    }
}
