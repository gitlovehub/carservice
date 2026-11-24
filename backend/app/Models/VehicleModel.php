<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VehicleModel extends Model
{
    use HasFactory;

    protected $table = 'vehicle_models';

    const UPDATED_AT = null;

    protected $fillable = [
        'brand_id',
        'name',
        'body_type',
        'year_from',
        'year_to',
        'status',
        'source',
    ];

    public function brand(): BelongsTo
    {
        return $this->belongsTo(VehicleBrand::class, 'brand_id');
    }

    public function trims(): HasMany
    {
        return $this->hasMany(VehicleTrim::class, 'model_id');
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class, 'model_id');
    }

    public function maintenancePackages(): HasMany
    {
        return $this->hasMany(MaintenancePackage::class, 'vehicle_model_id');
    }
}
