<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['sku', 'name', 'category', 'description', 'unit', 'cost_price', 'sell_price', 'status'])]
class Part extends Model
{
    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'sell_price' => 'decimal:2',
        ];
    }
}
