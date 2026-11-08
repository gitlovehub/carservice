<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Phiên bản (trim) của một dòng xe, ví dụ: Vios 1.5G-CVT.
 */
class VehicleTrim extends Model
{
    use HasFactory;

    protected $table = 'vehicle_trims';

    protected $fillable = [
        'model_id',
        'name',
        'status',
        'source',
    ];

    public function model(): BelongsTo
    {
        return $this->belongsTo(VehicleModel::class, 'model_id');
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class, 'trim_id');
    }
}
