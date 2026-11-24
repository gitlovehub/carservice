<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Bước chuẩn của một dịch vụ (Admin cấu hình) — sinh công việc theo bước khi bắt đầu sửa (P5). */
#[Fillable(['service_id', 'step_order', 'name', 'standard_minutes', 'requires_photo'])]
class ServiceStep extends Model
{
    protected function casts(): array
    {
        return ['step_order' => 'integer', 'standard_minutes' => 'integer', 'requires_photo' => 'boolean'];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}
