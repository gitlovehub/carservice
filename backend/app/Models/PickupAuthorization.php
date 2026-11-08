<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/** Ủy quyền nhận xe do chủ xe tạo trong tài khoản (N9). ACTIVE → USED (khi trả xe) | REVOKED. */
#[Fillable(['repair_order_id', 'customer_id', 'full_name', 'phone', 'id_last4', 'valid_until', 'status', 'revoked_at', 'used_at'])]
class PickupAuthorization extends Model
{
    public const ACTIVE = 'ACTIVE';

    public const USED = 'USED';

    public const REVOKED = 'REVOKED';

    public const MAX_ACTIVE = 3;

    protected function casts(): array
    {
        return ['valid_until' => 'datetime', 'revoked_at' => 'datetime', 'used_at' => 'datetime'];
    }

    public function repairOrder(): BelongsTo
    {
        return $this->belongsTo(RepairOrder::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function confirmations(): MorphMany
    {
        return $this->morphMany(CustomerConfirmation::class, 'confirmable');
    }

    public function isUsable(): bool
    {
        return $this->status === self::ACTIVE && ($this->valid_until === null || $this->valid_until->isFuture());
    }
}
