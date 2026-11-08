<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/** Bảng notifications có sẵn (WEB). P6 dùng để báo khách phụ tùng đã về. */
#[Fillable(['account_id', 'appointment_id', 'repair_order_id', 'title', 'content', 'type', 'channel', 'status', 'sent_at', 'read_at'])]
class Notification extends Model
{
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['sent_at' => 'datetime', 'read_at' => 'datetime'];
    }
}
