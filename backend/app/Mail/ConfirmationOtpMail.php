<?php

namespace App\Mail;

use App\Models\Quotation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** OTP xác nhận báo giá tại quầy. Email ghi rõ khách đang đồng ý / từ chối những gì. */
class ConfirmationOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<int, bool>  $decisions  item_id => đồng ý?
     */
    public function __construct(
        public string $otp,
        public Quotation $quotation,
        public array $decisions,
        public int $ttlMinutes,
    ) {}

    public function build(): self
    {
        $items = $this->quotation->items->sortBy('id')->values();
        $approvedTotal = $items->filter(fn ($item) => $this->decisions[$item->id] ?? false)->sum(fn ($item) => (float) $item->amount);

        return $this->subject("Mã xác nhận báo giá {$this->quotation->quotation_code} – CarService")
            ->view('emails.confirmation-otp', [
                'items' => $items,
                'approvedTotal' => $approvedTotal,
            ]);
    }
}
