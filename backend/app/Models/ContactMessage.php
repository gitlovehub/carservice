<?php

namespace App\Models;

use Database\Factories\ContactMessageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Tin nhắn từ form trang Liên hệ.
 */
#[Fillable(['name', 'phone', 'email', 'message', 'status', 'handled_at'])]
class ContactMessage extends Model
{
    /** @use HasFactory<ContactMessageFactory> */
    use HasFactory;

    public const NEW = 'NEW';

    public const HANDLED = 'HANDLED';

    protected function casts(): array
    {
        return [
            'handled_at' => 'datetime',
        ];
    }
}
