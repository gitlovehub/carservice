<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class VehicleBrand extends Model
{
    use HasFactory;

    protected $table = 'vehicle_brands';

    const UPDATED_AT = null;

    protected $fillable = [
        'name',
        'status',
        'source',
        'logo_png',
        'logo_updated_at',
    ];

    /** Ảnh logo (base64) không trả kèm JSON — FE tải ảnh qua GET /vehicle-catalog/brands/{id}/logo?v={logo_version}. */
    protected $hidden = ['logo_png', 'logo_updated_at'];

    protected $appends = ['logo_version'];

    protected function casts(): array
    {
        return ['logo_updated_at' => 'datetime'];
    }

    public function models(): HasMany
    {
        return $this->hasMany(VehicleModel::class, 'brand_id');
    }

    public function trims(): HasManyThrough
    {
        return $this->hasManyThrough(VehicleTrim::class, VehicleModel::class, 'brand_id', 'model_id');
    }

    /**
     * Phiên bản logo Admin tải lên (null = chưa có → FE dùng logo có sẵn / chữ cái đầu).
     * FE tự ghép URL theo API_BASE_URL của mình (không phụ thuộc APP_URL); đổi logo → số đổi → trình duyệt tải lại.
     */
    protected function logoVersion(): Attribute
    {
        return Attribute::get(fn () => $this->logo_updated_at?->getTimestamp());
    }
}
