<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['inspection_id', 'item_type', 'service_id', 'part_id', 'quantity', 'note', 'added_after_completion', 'added_by_account_id'])]
class InspectionRecommendation extends Model
{
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['added_after_completion' => 'boolean'];
    }

    /** Người bổ sung đề xuất sau khi đã hoàn tất chẩn đoán (ghi vết). */
    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'added_by_account_id');
    }

    public const TYPE_SERVICE = 'SERVICE';

    public const TYPE_PART = 'PART';

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }
}
