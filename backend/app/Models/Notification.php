<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Thông báo WEB cho khách (chuông ở header). Tạo qua App\Services\CustomerNotifier — không tạo trực tiếp.
 * Loại gắn appointment_id → FE mở modal lịch hẹn; gắn repair_order_id → FE mở báo giá / hóa đơn / tiến độ / đánh giá.
 */
#[Fillable(['account_id', 'appointment_id', 'repair_order_id', 'title', 'content', 'type', 'channel', 'status', 'sent_at', 'read_at'])]
class Notification extends Model
{
    public const UPDATED_AT = null;

    // Lịch hẹn (appointment_id)
    public const TYPE_APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED';

    public const TYPE_APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED';

    public const TYPE_APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED';

    // Phiếu sửa chữa (repair_order_id)
    public const TYPE_QUOTATION_SENT = 'QUOTATION_SENT';

    public const TYPE_REPAIR_STARTED = 'REPAIR_STARTED';

    public const TYPE_WAITING_FOR_PARTS = 'WAITING_FOR_PARTS';

    public const TYPE_PART_ARRIVED = 'PART_ARRIVED';

    public const TYPE_REPAIR_COMPLETED = 'REPAIR_COMPLETED';

    public const TYPE_HANDOVER_SUBMITTED = 'HANDOVER_SUBMITTED';

    public const TYPE_INVOICE_ISSUED = 'INVOICE_ISSUED';

    public const TYPE_PAYMENT_RECEIVED = 'PAYMENT_RECEIVED';

    public const TYPE_REPAIR_CLOSED = 'REPAIR_CLOSED';

    /** Mời khách đánh giá sau khi bàn giao xe. */
    public const TYPE_REVIEW_INVITE = 'REVIEW_INVITE';

    /** Gara đã phản hồi đánh giá của khách. */
    public const TYPE_REVIEW_REPLIED = 'REVIEW_REPLIED';

    protected function casts(): array
    {
        return ['sent_at' => 'datetime', 'read_at' => 'datetime'];
    }
}
