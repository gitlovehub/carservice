<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/** Biên bản giao nhận xe. Nội dung chỉ sửa được ở DRAFT; SUBMITTED/CONFIRMED đã khóa. */
#[Fillable([
    'repair_order_id', 'type', 'status', 'vehicle_id', 'mileage', 'fuel_level', 'general_condition',
    'valuables_note', 'person_name', 'person_phone', 'person_id_last4', 'person_relation',
    'pickup_authorization_id', 'staff_employee_id', 'compared_handover_id', 'snapshot', 'snapshot_sha256',
    'submitted_at', 'confirmed_at', 'void_reason',
])]
class VehicleHandover extends Model
{
    public const TYPE_CHECK_IN = 'CHECK_IN';

    public const TYPE_CHECK_OUT = 'CHECK_OUT';

    public const STATUS_DRAFT = 'DRAFT';

    public const STATUS_SUBMITTED = 'SUBMITTED';

    public const STATUS_CONFIRMED = 'CONFIRMED';

    public const STATUS_VOID = 'VOID';

    public const RELATIONS = ['OWNER', 'AUTHORIZED', 'OTHER'];

    public const FUEL_LEVELS = ['EMPTY', 'QUARTER', 'HALF', 'THREE_QUARTER', 'FULL'];

    protected function casts(): array
    {
        return [
            'snapshot' => 'array',
            'mileage' => 'integer',
            'submitted_at' => 'datetime',
            'confirmed_at' => 'datetime',
        ];
    }

    public function repairOrder(): BelongsTo
    {
        return $this->belongsTo(RepairOrder::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'staff_employee_id');
    }

    public function comparedHandover(): BelongsTo
    {
        return $this->belongsTo(self::class, 'compared_handover_id');
    }

    public function checklistItems(): HasMany
    {
        return $this->hasMany(HandoverChecklistItem::class)->orderBy('id');
    }

    public function media(): MorphMany
    {
        return $this->morphMany(MediaAttachment::class, 'attachable');
    }

    public function confirmations(): MorphMany
    {
        return $this->morphMany(CustomerConfirmation::class, 'confirmable');
    }

    public function isEditable(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }
}
