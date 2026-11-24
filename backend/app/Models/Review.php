<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'repair_order_id',
    'customer_id',
    'overall_rating',
    'advisor_rating',
    'technician_rating',
    'comment',
    'reply',
    'replied_at',
    'reply_edited_at',
    'is_hidden',
])]
class Review extends Model
{
    protected function casts(): array
    {
        return [
            'overall_rating' => 'integer',
            'advisor_rating' => 'integer',
            'technician_rating' => 'integer',
            'replied_at' => 'datetime',
            'reply_edited_at' => 'datetime',
            'is_hidden' => 'boolean',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function repairOrder(): BelongsTo
    {
        return $this->belongsTo(RepairOrder::class);
    }

    public function replyRevisions(): HasMany
    {
        return $this->hasMany(ReviewReplyRevision::class);
    }

    public function firstReplyRevision(): HasOne
    {
        return $this->hasOne(ReviewReplyRevision::class)->oldestOfMany();
    }
}
