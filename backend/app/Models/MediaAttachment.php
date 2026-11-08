<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/** Ảnh bằng chứng trên disk private (D-007). File chỉ tải qua API có kiểm quyền. */
#[Fillable([
    'attachable_type', 'attachable_id', 'disk', 'path', 'original_name', 'mime', 'size_bytes',
    'sha256', 'caption', 'position_code', 'taken_at', 'uploaded_by_account_id',
])]
#[Hidden(['disk', 'path'])]
class MediaAttachment extends Model
{
    use SoftDeletes;

    public const MAX_BYTES = 10 * 1024 * 1024;

    public const MAX_PER_OWNER = 30;

    public const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'taken_at' => 'datetime',
        ];
    }

    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'uploaded_by_account_id');
    }
}
