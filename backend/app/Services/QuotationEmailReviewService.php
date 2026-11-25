<?php

namespace App\Services;

use App\Mail\QuotationReviewRequestMail;
use App\Models\Quotation;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Throwable;

/**
 * Duyệt báo giá qua email (PO 19/11/2026): khi cố vấn gửi báo giá, khách đã đồng ý nhận báo giá qua email lúc đặt lịch
 * nhận mail kèm nút "Xem & duyệt báo giá" → trang duyệt từng dòng, không cần đăng nhập.
 *
 * Link là URL có chữ ký, hết hạn sau 3 ngày, gắn với đúng báo giá + phiên bản nội dung ("rev"): báo giá đổi thì link cũ vô hiệu.
 * Dùng một lần: chỉ ghi nhận khi báo giá còn SENT; trả lời xong (qua link, tài khoản hay tại quầy) thì link chỉ còn báo "đã duyệt".
 */
class QuotationEmailReviewService
{
    public const TTL_DAYS = 3;

    /** Gửi mail nếu khách đồng ý nhận email (phiếu tạo từ lịch hẹn) và có email. Lỗi gửi mail không chặn việc gửi báo giá. */
    public function sendIfConsented(Quotation $quotation): ?string
    {
        $quotation->loadMissing('items', 'repairOrder.customer.account', 'repairOrder.vehicle.model.brand');
        $order = $quotation->repairOrder;
        $email = $order?->customer?->email ?: $order?->customer?->account?->email;
        if ($quotation->status !== Quotation::SENT || ! $order?->appointment_id || ! $email) {
            return null;
        }

        try {
            Mail::to($email)->send(new QuotationReviewRequestMail($quotation, $this->url($quotation)));
        } catch (Throwable $e) {
            Log::warning('Không gửi được email duyệt báo giá', ['quotation_id' => $quotation->id, 'error' => $e->getMessage()]);

            return null;
        }

        return $email;
    }

    public function url(Quotation $quotation): string
    {
        // Ký đường dẫn tương đối rồi gắn APP_URL (như link xác nhận lịch hẹn): không phụ thuộc host lúc gửi / lúc mở.
        $path = URL::temporarySignedRoute('quotations.email-review', now()->addDays(self::TTL_DAYS), [
            'quotation' => $quotation->id,
            'rev' => $this->revision($quotation),
        ], false);

        return rtrim((string) config('app.url'), '/').$path;
    }

    /** Link còn đúng nội dung báo giá hiện tại không. */
    public function matchesRevision(Quotation $quotation, string $revision): bool
    {
        return hash_equals($this->revision($quotation), $revision);
    }

    private function revision(Quotation $quotation): string
    {
        $quotation->loadMissing('items');

        return substr(hash('sha256', implode('|', [
            $quotation->id, $quotation->version, (string) $quotation->total_amount,
            $quotation->items->sortBy('id')->map(fn ($item) => $item->id.':'.$item->quantity.':'.$item->unit_price)->implode(','),
        ])), 0, 16);
    }
}
