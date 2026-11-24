<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['inventory_id', 'repair_order_id', 'used_part_id', 'transaction_type', 'quantity', 'note', 'created_by_account_id'])]
class InventoryTransaction extends Model
{
    public const UPDATED_AT = null;

    public const TYPE_OUT = 'OUT';

    /** P6: nhập kho khi phụ tùng đặt hàng về. */
    public const TYPE_IN = 'IN';

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class);
    }

    public function repairOrder(): BelongsTo
    {
        return $this->belongsTo(RepairOrder::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'created_by_account_id');
    }
}
