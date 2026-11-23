<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** Báo cho chủ tài khoản khi có yêu cầu đổi email hoặc email đăng nhập đã đổi. Email mới được che bớt khi gửi về địa chỉ cũ. */
class AccountEmailChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public const REQUESTED = 'requested';

    public const OLD_ADDRESS = 'old';

    public const NEW_ADDRESS = 'new';

    public function __construct(public string $name, public string $newEmail, public string $stage) {}

    public function build(): self
    {
        [$local, $domain] = array_pad(explode('@', $this->newEmail, 2), 2, '');
        $subject = $this->stage === self::REQUESTED ? 'Có yêu cầu đổi email tài khoản CarService' : 'Email đăng nhập CarService đã thay đổi';

        return $this->subject($subject)->view('emails.account-email-changed', [
            'maskedEmail' => mb_substr($local, 0, 2).str_repeat('*', max(1, mb_strlen($local) - 2)).'@'.$domain,
        ]);
    }
}
