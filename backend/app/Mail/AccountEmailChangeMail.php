<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** Gửi tới email mới: bấm nút để xác nhận dùng email này cho tài khoản. */
class AccountEmailChangeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $name, public string $url, public int $ttlHours) {}

    public function build(): self
    {
        return $this->subject('Xác thực email mới cho tài khoản CarService')->view('emails.account-email-change');
    }
}
