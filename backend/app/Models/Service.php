<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'category', 'description', 'base_price', 'estimated_minutes', 'status', 'is_popular', 'sort_order'])]
class Service extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
            'is_popular' => 'boolean',
            'sort_order' => 'integer',
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
}
