<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['account_id', 'full_name', 'phone', 'email', 'address'])]
class Customer extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Hạng "Thân thiết" (trang Khách hàng của cố vấn): từ chừng này lượt sửa đã bàn giao trở lên.
     * Chỉ để hiển thị / lọc — không gắn ưu đãi hay giá.
     */
    public const LOYAL_MIN_VISITS = 3;

    public function invoices(): HasManyThrough
    {
        return $this->hasManyThrough(Invoice::class, RepairOrder::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class);
    }

    public function repairOrders(): HasMany
    {
        return $this->hasMany(RepairOrder::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}
