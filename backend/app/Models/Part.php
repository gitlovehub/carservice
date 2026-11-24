<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['sku', 'name', 'category', 'description', 'image_path', 'unit', 'cost_price', 'sell_price', 'status'])]
class Part extends Model
{
    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'sell_price' => 'decimal:2',
        ];
    }

    public function inventory(): HasOne
    {
        return $this->hasOne(Inventory::class);
    }

    /** Yêu cầu đặt phụ tùng cho phiếu sửa chữa (P6 / ADV-01). */
    public function partRequests(): HasMany
    {
        return $this->hasMany(PartRequest::class);
    }

    /** Dòng xe tương thích (bảng part_compatibilities). */
    public function compatibleModels(): BelongsToMany
    {
        return $this->belongsToMany(VehicleModel::class, 'part_compatibilities', 'part_id', 'vehicle_model_id');
    }
}
