<?php

namespace App\Models;

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
}