<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/** Thông tin gara — một bản ghi duy nhất. */
#[Fillable(['name', 'phone', 'email', 'address_line', 'ward', 'district', 'province', 'latitude', 'longitude', 'place_provider', 'place_id', 'updated_by_account_id'])]
class GarageSetting extends Model
{
    protected function casts(): array
    {
        return ['latitude' => 'float', 'longitude' => 'float'];
    }

    public static function current(): ?self
    {
        return self::query()->orderBy('id')->first();
    }
}
