<?php

namespace App\Mail;

use App\Models\VehicleHandover;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** OTP xác nhận biên bản giao nhận xe. Email tóm tắt đúng nội dung đã khóa (snapshot). */
class HandoverOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $otp, public VehicleHandover $handover, public int $ttlMinutes) {}

    public function build(): self
    {
        $title = $this->handover->type === VehicleHandover::TYPE_CHECK_OUT ? 'trả xe' : 'nhận xe';

        return $this->subject("Mã xác nhận biên bản {$title} – CarService")
            ->view('emails.handover-otp', ['title' => $title, 'snapshot' => $this->handover->snapshot ?? []]);
    }
}
