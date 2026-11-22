<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** Báo về email cũ khi email nhận xác nhận của chủ xe được đổi. Email mới được che bớt. */
class CustomerEmailChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $customerName, public string $newEmail) {}

    public function build(): self
    {
        [$name, $domain] = array_pad(explode('@', $this->newEmail, 2), 2, '');

        return $this->subject('Email nhận xác nhận đã được thay đổi – CarService')
            ->view('emails.customer-email-changed', ['maskedEmail' => mb_substr($name, 0, 2).str_repeat('*', max(1, mb_strlen($name) - 2)).'@'.$domain]);
    }
}
