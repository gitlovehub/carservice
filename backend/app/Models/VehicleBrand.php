<?php

namespace App\Models;

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
    ];

    public function models(): HasMany
    {
        return $this->hasMany(VehicleModel::class, 'brand_id');
    }

    public function trims(): HasManyThrough
    {
        return $this->hasManyThrough(VehicleTrim::class, VehicleModel::class, 'brand_id', 'model_id');
    }
}
