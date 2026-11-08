<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/** OTP gửi email chủ xe (D-005) để xác nhận một nội dung đã khóa tại quầy. */
#[Fillable([
    'customer_id', 'purpose', 'target_type', 'target_id', 'content_sha256', 'code_hash',
    'sent_to_email', 'expires_at', 'attempts', 'used_at', 'requested_by_account_id',
])]
#[Hidden(['code_hash'])]
class ConfirmationOtp extends Model
{
    public const PURPOSE_QUOTATION_RESPONSE = 'QUOTATION_RESPONSE';

    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
            'attempts' => 'integer',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function target(): MorphTo
    {
        return $this->morphTo();
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'requested_by_account_id');
    }

    public function isUsable(): bool
    {
        return $this->used_at === null
            && $this->attempts < self::MAX_ATTEMPTS
            && $this->expires_at->isFuture();
    }
}
