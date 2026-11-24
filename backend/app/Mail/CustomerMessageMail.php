<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** Email do Admin tự soạn gửi cho một khách hàng từ hồ sơ khách. */
class CustomerMessageMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $customerName, public string $mailSubject, public string $messageBody) {}

    public function build(): self
    {
        return $this->subject($this->mailSubject.' – CarService')->view('emails.customer-message');
    }
}
