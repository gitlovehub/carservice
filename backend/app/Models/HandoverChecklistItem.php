<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['vehicle_handover_id', 'category', 'position_code', 'label', 'condition', 'quantity', 'note', 'is_discrepancy'])]
class HandoverChecklistItem extends Model
{
    public const CATEGORIES = ['EXTERIOR', 'INTERIOR', 'ACCESSORY', 'KEY', 'DOCUMENT'];

    public const CONDITIONS = ['OK', 'SCRATCH', 'DENT', 'BROKEN', 'MISSING', 'PRESENT'];

    protected function casts(): array
    {
        return ['is_discrepancy' => 'boolean', 'quantity' => 'integer'];
    }

    public function handover(): BelongsTo
    {
        return $this->belongsTo(VehicleHandover::class, 'vehicle_handover_id');
    }
}
