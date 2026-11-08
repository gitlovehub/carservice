<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'quotation_code', 'repair_order_id', 'advisor_id', 'version', 'subtotal',
    'discount_amount', 'total_amount', 'status', 'valid_until', 'customer_response_at',
    'type', 'parent_quotation_id', 'reason',
])]
class Quotation extends Model
{
    /** Báo giá gốc; một bản INITIAL mới (version cao hơn) thay thế bản INITIAL cũ (báo giá lại). */
    public const TYPE_INITIAL = 'INITIAL';

    /** Báo giá phát sinh khi đang sửa; cộng thêm vào INITIAL đang hiệu lực, không thay thế. */
    public const TYPE_SUPPLEMENT = 'SUPPLEMENT';

    public const DRAFT = 'DRAFT';

    public const SENT = 'SENT';

    public const APPROVED = 'APPROVED';

    public const PARTIALLY_APPROVED = 'PARTIALLY_APPROVED';

    public const REJECTED = 'REJECTED';

    public const CANCELLED = 'CANCELLED';

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'valid_until' => 'datetime',
            'customer_response_at' => 'datetime',
        ];
    }

    public function repairOrder(): BelongsTo
    {
        return $this->belongsTo(RepairOrder::class);
    }

    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'advisor_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function confirmations(): MorphMany
    {
        return $this->morphMany(CustomerConfirmation::class, 'confirmable');
    }

    public function recalculateTotals(): void
    {
        $subtotal = $this->items()->sum('amount');
        $this->subtotal = $subtotal;
        $this->total_amount = $subtotal - $this->discount_amount;
        $this->save();
    }
}
