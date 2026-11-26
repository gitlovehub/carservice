<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'customer_id',
    'model_id',
    'trim_id',
    'variant',
    'year',
    'license_plate',
    'vin',
    'mileage',
    'note',
])]
// Cột ảo do DB tính (unique biển số / VIN trong xe đang hoạt động) — không đưa ra API.
#[Hidden(['active_license_plate', 'active_vin'])]
class Vehicle extends Model
{
    use HasFactory, SoftDeletes;

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function model(): BelongsTo
    {
        return $this->belongsTo(VehicleModel::class, 'model_id');
    }

    public function trim(): BelongsTo
    {
        return $this->belongsTo(VehicleTrim::class, 'trim_id');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function repairOrders(): HasMany
    {
        return $this->hasMany(RepairOrder::class);
    }

    /**
     * Xe còn đang ở garage: có phiếu sửa chữa chưa bàn giao và chưa đóng
     * (COMPLETED = đã sửa xong nhưng xe vẫn chờ khách nhận).
     */
    public function hasOpenRepairOrder(): bool
    {
        return $this->repairOrders()
            ->whereNotIn('status', [RepairOrder::HANDED_OVER, RepairOrder::CLOSED])
            ->exists();
    }

    /** Xe còn lịch hẹn đang chờ / đã xác nhận / đã tiếp nhận. */
    public function hasActiveAppointment(): bool
    {
        return $this->appointments()
            ->whereIn('status', Appointment::ACTIVE_STATUSES)
            ->exists();
    }
}
