<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** Mã xác minh email nhận xác nhận của chủ xe (tại quầy). */
class CustomerEmailVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $otp, public string $customerName, public int $ttlMinutes) {}

    public function build(): self
    {
        return $this->subject('Mã xác minh email – CarService')->view('emails.customer-email-verification');
    }
}
