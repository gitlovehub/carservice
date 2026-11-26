<?php

namespace App\Mail;

use App\Models\VehicleHandover;
use App\Services\HandoverEmailViewService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** OTP xác nhận biên bản giao nhận xe. Email tóm tắt đúng nội dung đã khóa (snapshot), kèm link xem biên bản đầy đủ. */
class HandoverOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $otp, public VehicleHandover $handover, public int $ttlMinutes) {}

    public function build(): self
    {
        $isCheckOut = $this->handover->type === VehicleHandover::TYPE_CHECK_OUT;
        $title = $isCheckOut ? 'trả xe' : 'nhận xe';
        $views = app(HandoverEmailViewService::class);
        $snapshot = $this->handover->snapshot ?? [];

        return $this->subject("Mã xác nhận biên bản {$title} – CarService")
            ->view('emails.handover-otp', [
                'title' => $title,
                'snapshot' => $snapshot,
                'vehicleText' => $views->vehicleText($this->handover),
                'fuelText' => HandoverEmailViewService::FUEL_TEXT[$snapshot['fuel_level'] ?? ''] ?? '—',
                'personLabel' => $isCheckOut ? 'Người nhận' : 'Người giao',
                'conditionText' => HandoverEmailViewService::CONDITION_TEXT,
                'viewUrl' => $views->url($this->handover),
                'viewTtlDays' => HandoverEmailViewService::TTL_DAYS,
            ]);
    }
}
