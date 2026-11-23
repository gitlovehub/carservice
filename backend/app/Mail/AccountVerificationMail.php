<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** Email sau khi đăng ký: bấm nút để kích hoạt tài khoản. */
class AccountVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $name, public string $url, public int $ttlHours) {}

    public function build(): self
    {
        return $this->subject('Xác thực tài khoản CarService')->view('emails.account-verification');
    }
}
