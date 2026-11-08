<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Lịch sử từng lần khách quyết định một dòng báo giá (chỉ thêm). */
#[Fillable(['quotation_item_id', 'decision', 'customer_confirmation_id'])]
class QuotationItemResponse extends Model
{
    public const UPDATED_AT = null;

    public const APPROVED = 'APPROVED';

    public const REJECTED = 'REJECTED';

    public function item(): BelongsTo
    {
        return $this->belongsTo(QuotationItem::class, 'quotation_item_id');
    }

    public function confirmation(): BelongsTo
    {
        return $this->belongsTo(CustomerConfirmation::class, 'customer_confirmation_id');
    }
}
