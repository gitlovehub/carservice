<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'repair_order_code', 'appointment_id', 'customer_id', 'vehicle_id', 'advisor_id',
    'mileage_received', 'initial_condition', 'status', 'received_at', 'completed_at',
    'handed_over_at', 'closed_at', 'close_reason', 'note',
    'booked_vehicle_id', 'vehicle_change_reason', 'source', 'requires_check_in',
    'flow_type', 'estimated_ready_at',
])]
class RepairOrder extends Model
{
    /** P5: luồng dịch vụ nhanh — RECEIVED → WAITING_APPROVAL bằng báo giá niêm yết (bỏ chẩn đoán). */
    public const FLOW_QUICK = 'QUICK';

    public const SOURCE_APPOINTMENT = 'APPOINTMENT';

    public const SOURCE_WALK_IN = 'WALK_IN';

    public const RECEIVED = 'RECEIVED';

    public const INSPECTING = 'INSPECTING';

    public const QUOTING = 'QUOTING';

    public const WAITING_APPROVAL = 'WAITING_APPROVAL';

    public const WAITING_FOR_PARTS = 'WAITING_FOR_PARTS';

    public const IN_PROGRESS = 'IN_PROGRESS';

    public const COMPLETED = 'COMPLETED';

    public const HANDED_OVER = 'HANDED_OVER';

    public const CLOSED = 'CLOSED';

    public const REVIEW_TEST = 'REVIEW_TEST';

    public const TRANSITIONS = [
        self::RECEIVED => [self::INSPECTING, self::CLOSED],
        self::INSPECTING => [self::QUOTING, self::WAITING_APPROVAL, self::CLOSED],
        self::QUOTING => [self::WAITING_APPROVAL, self::CLOSED],
        self::WAITING_APPROVAL => [self::IN_PROGRESS, self::CLOSED],
        self::IN_PROGRESS => [self::WAITING_FOR_PARTS, self::COMPLETED, self::CLOSED],
        self::WAITING_FOR_PARTS => [self::IN_PROGRESS, self::CLOSED],
        self::COMPLETED => [self::HANDED_OVER],
        self::HANDED_OVER => [],
        self::CLOSED => [],
    ];

    public const CLOSE_REASONS = [
        'CUSTOMER_REQUEST',
        'PART_UNAVAILABLE',
        'CUSTOMER_DECLINED_QUOTE',
        'OTHER',
    ];

    protected function casts(): array
    {
        return [
            'received_at' => 'datetime',
            'completed_at' => 'datetime',
            'handed_over_at' => 'datetime',
            'closed_at' => 'datetime',
            'requires_check_in' => 'boolean',
            'estimated_ready_at' => 'datetime',
        ];
    }

    public function bookedVehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class, 'booked_vehicle_id');
    }

    public function handovers(): HasMany
    {
        return $this->hasMany(VehicleHandover::class)->orderBy('id');
    }

    public function pickupAuthorizations(): HasMany
    {
        return $this->hasMany(PickupAuthorization::class)->orderByDesc('id');
    }

    /** Biên bản CHECK_OUT đã được chủ xe xác nhận (bản mới nhất). */
    public function confirmedCheckOut(): HasOne
    {
        return $this->hasOne(VehicleHandover::class)
            ->where('type', VehicleHandover::TYPE_CHECK_OUT)
            ->where('status', VehicleHandover::STATUS_CONFIRMED)
            ->latestOfMany();
    }

    /** Biên bản CHECK_IN đã được khách xác nhận (bản mới nhất). */
    public function confirmedCheckIn(): HasOne
    {
        return $this->hasOne(VehicleHandover::class)
            ->where('type', VehicleHandover::TYPE_CHECK_IN)
            ->where('status', VehicleHandover::STATUS_CONFIRMED)
            ->latestOfMany();
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function advisor(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'advisor_id');
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(RepairOrderStatusHistory::class, 'repair_order_id')
            ->orderByDesc('created_at')
            ->orderByDesc('id');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class);
    }

    public function inspections(): HasMany
    {
        return $this->hasMany(Inspection::class);
    }

    public function inspection(): HasOne
    {
        return $this->hasOne(Inspection::class)->latestOfMany();
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class)->orderByDesc('version');
    }

    /**
     * Báo giá gốc đang hiệu lực = bản INITIAL có version cao nhất (báo giá lại thay thế bản cũ).
     * Không gồm SUPPLEMENT: phát sinh cộng thêm, không thay thế báo giá gốc (xem billableQuotationIds).
     */
    public function latestQuotation(): HasOne
    {
        return $this->hasOne(Quotation::class)->ofMany(
            ['version' => 'max'],
            fn ($query) => $query->where('type', Quotation::TYPE_INITIAL),
        );
    }

    public function supplementQuotations(): HasMany
    {
        return $this->hasMany(Quotation::class)->where('type', Quotation::TYPE_SUPPLEMENT)->orderBy('version');
    }

    /**
     * Báo giá được tính tiền / xuất kho: INITIAL đang hiệu lực + mọi SUPPLEMENT khách đã trả lời xong
     * (APPROVED / PARTIALLY_APPROVED). Không gộp các bản INITIAL cũ (sẽ tính trùng — P0).
     *
     * @return list<int>
     */
    public function billableQuotationIds(): array
    {
        $ids = [];
        if ($initial = $this->latestQuotation()->first()) {
            $ids[] = $initial->id;
        }

        return [...$ids, ...$this->supplementQuotations()
            ->whereIn('status', [Quotation::APPROVED, Quotation::PARTIALLY_APPROVED])
            ->pluck('id')->map(fn ($id) => (int) $id)->all()];
    }

    public function workItems(): HasMany
    {
        return $this->hasMany(WorkItem::class);
    }

    public function usedParts(): HasMany
    {
        return $this->hasMany(UsedPart::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }
}
