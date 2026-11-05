<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class MaintenancePackage extends Model
{
    use HasFactory;

    protected $table = 'maintenance_packages';

    protected $fillable = [
        'vehicle_model_id',
        'name',
        'mileage_milestone',
        'month_milestone',
        'description',
        'status',
    ];

    public function vehicleModel(): BelongsTo
    {
        return $this->belongsTo(VehicleModel::class, 'vehicle_model_id');
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'maintenance_package_services', 'package_id', 'service_id')
            ->withPivot('quantity');
    }

    public function parts(): BelongsToMany
    {
        return $this->belongsToMany(Part::class, 'maintenance_package_parts', 'package_id', 'part_id')
            ->withPivot('quantity');
    }

    /**
     * Gói đang bán và áp dụng được cho dòng xe: gói dùng chung, hoặc gói đúng dòng xe đó.
     */
    public function scopeAvailableFor(Builder $query, ?int $vehicleModelId): void
    {
        $query->where('status', 'ACTIVE')
            ->where(function (Builder $query) use ($vehicleModelId): void {
                $query->whereNull('vehicle_model_id');

                if ($vehicleModelId !== null) {
                    $query->orWhere('vehicle_model_id', $vehicleModelId);
                }
            });
    }

    /**
     * Danh sách dịch vụ rút gọn trong gói, ví dụ "Thay dầu, Lọc gió, +2 hạng mục".
     */
    public function shortSummary(int $limit = 3): string
    {
        $names = $this->services->pluck('name');

        if ($names->isEmpty()) {
            return '';
        }

        $summary = $names->take($limit)->implode(', ');
        $remaining = $names->count() - $limit;

        return $remaining > 0 ? "{$summary}, +{$remaining} hạng mục" : $summary;
    }

    /**
     * Tính giá ước tính dựa trên dịch vụ và phụ tùng trong gói.
     * Không lưu vào DB, chỉ tính động để FE có thể đọc các field cũ.
     */
    public function calculateEstimatedPrice(): float
    {
        $services = $this->services->sum(
            fn (Service $service) => (float) $service->base_price * (int) ($service->pivot->quantity ?? 1)
        );

        $parts = $this->parts->sum(
            fn (Part $part) => (float) $part->sell_price * (int) ($part->pivot->quantity ?? 1)
        );

        return round($services + $parts, 2);
    }

    /**
     * Gắn các field dẫn xuất cho response cho FE cũ.
     */
    public function withComputedFields(): static
    {
        $price = $this->calculateEstimatedPrice();

        $this->price = $price;
        $this->estimated_price = $price;
        $this->mileage_km = $this->mileage_milestone;

        return $this;
    }
}
