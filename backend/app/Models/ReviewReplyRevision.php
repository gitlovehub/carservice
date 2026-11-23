<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

/**
 * Một lần ghi phản hồi đánh giá. Bản ghi bất biến: chỉ được tạo, không được sửa hoặc xoá.
 */
#[Fillable([
    'review_id',
    'old_reply',
    'new_reply',
    'edited_by_account_id',
    'edited_by_name',
    'edited_at',
])]
class ReviewReplyRevision extends Model
{
    public $timestamps = false;

    protected static function booted(): void
    {
        $rejectChange = static function (): never {
            throw new LogicException('Lịch sử chỉnh sửa phản hồi không được sửa hoặc xoá.');
        };

        static::updating($rejectChange);
        static::deleting($rejectChange);
    }

    protected function casts(): array
    {
        return ['edited_at' => 'datetime'];
    }

    public function review(): BelongsTo
    {
        return $this->belongsTo(Review::class);
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'edited_by_account_id');
    }
}
