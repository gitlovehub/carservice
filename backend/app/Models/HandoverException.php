<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Yêu cầu ngoại lệ xác nhận biên bản khi chủ xe mất email. Ảnh giấy tờ chỉ admin xem, không trả đường dẫn ra API. */
#[Fillable([
    'vehicle_handover_id', 'requested_by_account_id', 'reason', 'id_document_path', 'registration_path',
    'status', 'decided_by_account_id', 'decided_at', 'decision_note',
])]
#[Hidden(['id_document_path', 'registration_path'])]
class HandoverException extends Model
{
    public const PENDING = 'PENDING';

    public const APPROVED = 'APPROVED';

    public const REJECTED = 'REJECTED';

    public const DOCUMENT_RETENTION_DAYS = 90;

    /** @var list<string> */
    protected $appends = ['documents_available'];

    protected function casts(): array
    {
        return ['decided_at' => 'datetime', 'documents_purged_at' => 'datetime'];
    }

    /** Quá hạn lưu thì không cho xem nữa, kể cả khi tác vụ xóa hằng ngày chưa chạy. */
    protected function documentsAvailable(): Attribute
    {
        return Attribute::get(fn (): bool => $this->documents_purged_at === null
            && ($this->decided_at === null || $this->decided_at->gt(now()->subDays(self::DOCUMENT_RETENTION_DAYS))));
    }

    public function handover(): BelongsTo
    {
        return $this->belongsTo(VehicleHandover::class, 'vehicle_handover_id');
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'requested_by_account_id');
    }

    public function decidedBy(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'decided_by_account_id');
    }
}
