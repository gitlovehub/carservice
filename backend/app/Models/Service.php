<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'category', 'category_id', 'description', 'image_path', 'base_price', 'estimated_minutes', 'status', 'is_visible', 'is_popular', 'sort_order', 'service_level', 'requires_vehicle_stay'])]
class Service extends Model
{
    use HasFactory;

    /** Thư mục lưu ảnh dịch vụ trên disk public. */
    public const IMAGE_DIRECTORY = 'service-images';

    /** API trả `image_url` (ảnh admin tải lên) thay cho đường dẫn lưu trữ nội bộ. */
    protected $appends = ['image_url'];

    protected $hidden = ['image_path'];

    /**
     * Ảnh phát qua route công khai (không cần storage:link); `v` đổi khi cập nhật để trình duyệt tải ảnh mới.
     */
    protected function imageUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->image_path
            ? '/api/service-images/'.$this->id.'?v='.($this->updated_at?->timestamp ?? 0)
            : null);
    }

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

    /** Dữ liệu nghiệp vụ tham chiếu dịch vụ; còn bất kỳ dòng nào thì không được xóa vĩnh viễn. */
    public const USAGE_RELATIONS = ['appointments', 'packages', 'workItems', 'quotationItems', 'invoiceItems', 'inspectionRecommendations'];

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

    public function quotationItems(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function invoiceItems(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function inspectionRecommendations(): HasMany
    {
        return $this->hasMany(InspectionRecommendation::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(ServiceStep::class)->orderBy('step_order');
    }

    /** Có danh mục theo giá trị sắp lưu (category_id ưu tiên hơn chuỗi category, giống hook saving). */
    public function hasCategory(): bool
    {
        if ($this->isDirty('category_id')) {
            return $this->category_id !== null;
        }
        if ($this->isDirty('category')) {
            return trim((string) $this->category) !== '';
        }

        return $this->category_id !== null || trim((string) $this->category) !== '';
    }

    /**
     * Thông tin còn thiếu để bật "Đang áp dụng".
     *
     * @return list<string>
     */
    public function activationProblems(): array
    {
        return array_values(array_filter([
            $this->hasCategory() ? null : 'danh mục',
            (float) $this->base_price > 0 ? null : 'giá lớn hơn 0',
            (int) $this->estimated_minutes > 0 ? null : 'thời gian ước tính',
        ]));
    }

    /** Dịch vụ đã xuất hiện trong lịch hẹn, gói, đề xuất, báo giá, công việc hoặc hóa đơn. */
    public function isInUse(): bool
    {
        foreach (self::USAGE_RELATIONS as $relation) {
            if ($this->{$relation}()->exists()) {
                return true;
            }
        }

        return false;
    }
}
