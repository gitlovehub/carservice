<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'category', 'description', 'base_price', 'estimated_minutes', 'status'])]
class Service extends Model
{
    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
        ];
    }
}
