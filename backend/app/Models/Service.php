<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'category', 'category_id', 'description', 'base_price', 'estimated_minutes', 'status', 'is_visible', 'is_popular', 'sort_order', 'service_level', 'requires_vehicle_stay'])]
class Service extends Model
{
    use HasFactory;

    /**
     * Giữ category (chuỗi, cho màn hình/API cũ) và category_id (bảng danh mục) luôn khớp:
     * gửi category_id → chuỗi lấy theo tên danh mục; chỉ gửi chuỗi → tìm/tạo danh mục cùng tên.
     */
    protected static function booted(): void
    {
        static::saving(function (Service $service): void {
            if ($service->isDirty('category_id')) {
                $service->category = $service->category_id
                    ? ServiceCategory::query()->whereKey($service->category_id)->value('name')
                    : null;
            } elseif ($service->isDirty('category')) {
                $name = $service->category === null ? '' : ServiceCategory::normalizeName((string) $service->category);
                $service->category = $name === '' ? null : $name;
                $service->category_id = $name === '' ? null : ServiceCategory::findOrCreateByName($name)->id;
            }
        });
    }

    public function serviceCategory(): BelongsTo
    {
        return $this->belongsTo(ServiceCategory::class, 'category_id');
    }

    /** P5: dịch vụ nhanh (thay dầu…) — báo giá niêm yết, bỏ bước chẩn đoán, vẫn bắt buộc khách duyệt giá. */
    public const LEVEL_QUICK = 'QUICK';

    public const LEVEL_STANDARD = 'STANDARD';

    public const LEVEL_MAJOR = 'MAJOR';

    public const LEVELS = [self::LEVEL_QUICK, self::LEVEL_STANDARD, self::LEVEL_MAJOR];

    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
            'is_popular' => 'boolean',
            'is_visible' => 'boolean',
            'category_id' => 'integer',
            'sort_order' => 'integer',
            'estimated_minutes' => 'integer',
            'requires_vehicle_stay' => 'boolean',
        ];
    }

    public function appointments(): BelongsToMany
    {
        return $this->belongsToMany(Appointment::class, 'appointment_services', 'service_id', 'appointment_id');
    }

    public function packages(): BelongsToMany
    {
        return $this->belongsToMany(MaintenancePackage::class, 'maintenance_package_services', 'service_id', 'package_id')
            ->withPivot('quantity');
    }

    public function workItems(): HasMany
    {
        return $this->hasMany(WorkItem::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(ServiceStep::class)->orderBy('step_order');
    }
}
