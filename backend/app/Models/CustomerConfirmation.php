<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use LogicException;

/**
 * Bằng chứng khách xác nhận một nội dung. Chỉ thêm, không sửa, không xóa.
 * method: ACCOUNT (khách tự bấm trong tài khoản) | EMAIL_OTP (tại quầy, có nhân viên chứng kiến).
 */
#[Fillable([
    'confirmable_type', 'confirmable_id', 'customer_id', 'method', 'confirmation_otp_id',
    'content_sha256', 'ip_address', 'user_agent', 'witness_employee_id', 'confirmed_at', 'comment',
])]
class CustomerConfirmation extends Model
{
    public const METHOD_ACCOUNT = 'ACCOUNT';

    public const METHOD_EMAIL_OTP = 'EMAIL_OTP';

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Customer confirmations are append-only.'));
        static::deleting(fn () => throw new LogicException('Customer confirmations are append-only.'));
    }

    protected function casts(): array
    {
        return ['confirmed_at' => 'datetime'];
    }

    public function confirmable(): MorphTo
    {
        return $this->morphTo();
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function otp(): BelongsTo
    {
        return $this->belongsTo(ConfirmationOtp::class, 'confirmation_otp_id');
    }

    public function witness(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'witness_employee_id');
    }
}
