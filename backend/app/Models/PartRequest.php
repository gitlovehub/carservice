<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Yêu cầu đặt phụ tùng còn thiếu cho một phiếu (P6). */
#[Fillable([
    'repair_order_id', 'quotation_item_id', 'part_id', 'quantity', 'status', 'supplier_note',
    'ordered_at', 'eta_date', 'received_at', 'cancel_reason', 'created_by_account_id',
])]
class PartRequest extends Model
{
    public const REQUESTED = 'REQUESTED';

    public const ORDERED = 'ORDERED';

    public const RECEIVED = 'RECEIVED';

    public const CANCELLED = 'CANCELLED';

    public const OPEN = [self::REQUESTED, self::ORDERED];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'ordered_at' => 'datetime',
            'eta_date' => 'date:Y-m-d',
            'received_at' => 'datetime',
        ];
    }

    public function repairOrder(): BelongsTo
    {
        return $this->belongsTo(RepairOrder::class);
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }

    public function quotationItem(): BelongsTo
    {
        return $this->belongsTo(QuotationItem::class);
    }
}
