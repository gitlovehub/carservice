<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['employee_id', 'specialty', 'level', 'is_available'])]
class TechnicianProfile extends Model
{
    protected function casts(): array
    {
        return [
            'is_available' => 'boolean',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function isTechnician(): bool
    {
        return $this->employee?->account?->role === Account::ROLE_TECHNICIAN;
    }
}
