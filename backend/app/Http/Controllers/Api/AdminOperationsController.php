<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AppliesDateRange;
use App\Http\Controllers\Concerns\AppliesSort;
use App\Http\Controllers\Concerns\PresentsReviews;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\Review;
use App\Models\TechnicianProfile;
use App\Models\WorkItem;
use App\Services\ReviewReplyService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Admin xem toàn xưởng (chỉ đọc nghiệp vụ; thao tác phiếu/thu tiền vẫn do Cố vấn làm):
 * phiếu sửa chữa, hoá đơn & thanh toán, đánh giá (trả lời / ẩn), nhật ký thao tác.
 */
class AdminOperationsController extends Controller
{
    use AppliesDateRange, AppliesSort, PresentsReviews;

    public const ORDER_GROUPS = [
        'intake' => [RepairOrder::RECEIVED, RepairOrder::INSPECTING],
        'quote' => [RepairOrder::QUOTING, RepairOrder::WAITING_APPROVAL],
        'parts' => [RepairOrder::WAITING_FOR_PARTS],
        'repair' => [RepairOrder::IN_PROGRESS],
        'done' => [RepairOrder::COMPLETED, RepairOrder::HANDED_OVER],
        'closed' => [RepairOrder::CLOSED],
    ];

    /** Phương thức lưu trong DB → nhóm hiển thị. */
    public const METHOD_GROUPS = [Payment::DIRECT => 'CASH', Payment::QR => 'BANK_TRANSFER', Payment::TRANSFER => 'BANK_TRANSFER', Payment::CARD => 'CARD', Payment::EWALLET => 'EWALLET', Payment::VNPAY => 'VNPAY'];

    private const ROLE_LABELS = [
        Account::ROLE_ADMIN => 'Quản trị viên', Account::ROLE_ADVISOR => 'Cố vấn dịch vụ',
        Account::ROLE_TECHNICIAN => 'Kỹ thuật viên', Account::ROLE_CUSTOMER => 'Khách hàng',
    ];

    /** Hành động thật trong audit_logs → nhóm + nhãn tiếng Việt. */
    private const ACTIONS = [
        'appointment.created_by_staff' => ['CREATE', 'Tạo lịch hẹn hộ khách'],
        'appointment.confirmed' => ['STATUS', 'Xác nhận lịch hẹn'],
        'appointment.confirmation_email_sent' => ['UPDATE', 'Gửi email xác nhận lịch cho khách'],
        'appointment.confirmed_by_customer' => ['STATUS', 'Khách xác nhận lịch qua email'],
        'appointment.checked_in' => ['STATUS', 'Tiếp nhận xe theo lịch hẹn'],
        'appointment.cancelled' => ['DELETE', 'Huỷ lịch hẹn'],
        'appointment.no_show' => ['STATUS', 'Đánh dấu khách không đến'],
        'appointment.rescheduled' => ['UPDATE', 'Đổi lịch hẹn'],
        'appointment.rescheduled_by_customer' => ['UPDATE', 'Khách tự đổi lịch hẹn'],
        'appointment.cancelled_by_customer' => ['UPDATE', 'Khách tự hủy lịch hẹn'],
        'repair_order.vehicle_changed' => ['UPDATE', 'Đổi xe trên phiếu sửa chữa'],
        'PICKUP_AUTHORIZATION_CREATED' => ['CREATE', 'Khách uỷ quyền nhận xe'],
        'VNPAY_OVERPAID' => ['STATUS', 'Thanh toán VNPAY vượt số tiền còn lại'],
        'customer.email_sent' => ['UPDATE', 'Gửi email cho khách hàng'],
    ];

    /* ----------------------------------------------------- Phiếu sửa chữa */

    /** GET /api/admin/repair-orders?group=&technician_id=&search=&page=&per_page= */
    public function repairOrders(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'group' => ['nullable', Rule::in(array_keys(self::ORDER_GROUPS))],
            'technician_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            ...$this->dateRangeRules($request),
        ]);

        $query = RepairOrder::query()
            ->with(['customer:id,full_name,phone', 'vehicle:id,model_id,license_plate', 'vehicle.model:id,brand_id,name', 'vehicle.model.brand:id,name',
                'advisor:id,full_name', 'workItems:id,repair_order_id,technician_id', 'workItems.technician:id,employee_id', 'workItems.technician.employee:id,full_name', 'latestQuotation'])
            ->when($filters['group'] ?? null, fn (Builder $q, string $group) => $q->whereIn('status', self::ORDER_GROUPS[$group]))
            ->when($filters['technician_id'] ?? null, fn (Builder $q, $id) => $q->whereHas('workItems', fn (Builder $w) => $w->where('technician_id', $id)))
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q
                ->where('repair_order_code', 'like', $like)
                ->orWhereHas('customer', fn (Builder $c) => $c->where('full_name', 'like', $like)->orWhere('phone', 'like', $like))
                ->orWhereHas('vehicle', fn (Builder $v) => $v->where('license_plate', 'like', $like))));
        $this->applyDateRange($query, $filters, 'received_at');
        $this->applySort($query, $request, [
            'created' => 'created_at', 'code' => 'repair_order_code', 'received' => 'received_at',
            'promised' => 'estimated_ready_at', 'status' => 'status',
        ]);

        $page = $query->paginate($filters['per_page'] ?? 10);
        $counts = $this->applyDateRange(RepairOrder::query(), $filters, 'received_at')
            ->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return response()->json([
            'data' => $page->getCollection()->map(fn (RepairOrder $o) => $this->orderRow($o))->values(),
            'meta' => $this->meta($page),
            'summary' => [
                'total' => (int) $counts->sum(),
                'in_shop' => (int) $counts->except([RepairOrder::HANDED_OVER, RepairOrder::CLOSED])->sum(),
                'groups' => collect(self::ORDER_GROUPS)->map(fn (array $s) => (int) collect($s)->sum(fn ($x) => $counts[$x] ?? 0)),
            ],
            'technicians' => TechnicianProfile::query()->with('employee:id,full_name')->get()
                ->map(fn (TechnicianProfile $t) => ['id' => $t->id, 'name' => $t->employee?->full_name])->sortBy('name')->values(),
        ]);
    }

    /** GET /api/admin/repair-orders/{repairOrder} */
    public function repairOrder(RepairOrder $repairOrder): JsonResponse
    {
        $repairOrder->load(['customer:id,full_name,phone', 'vehicle:id,model_id,license_plate', 'vehicle.model:id,brand_id,name', 'vehicle.model.brand:id,name',
            'advisor:id,full_name', 'workItems.technician.employee:id,full_name', 'workItems.service:id,name,status', 'latestQuotation.items.service:id,status',
            'statusHistory.changedByAccount:id,email,role', 'statusHistory.changedByAccount.employee:id,account_id,full_name',
            'partRequests' => fn ($q) => $q->latest('id'), 'partRequests.part:id,name,unit']);

        $prices = $repairOrder->latestQuotation?->items->where('item_type', 'SERVICE')->keyBy('service_id') ?? collect();

        return response()->json(['data' => $this->orderRow($repairOrder) + [
            'items' => $repairOrder->workItems->map(fn (WorkItem $w) => [
                'name' => $w->description ?: $w->service?->name,
                'status' => $w->status,
                'service_status' => $w->service?->status,
                'technician' => $w->technician?->employee?->full_name,
                'price' => (float) ($prices[$w->service_id]->amount ?? 0),
            ])->values(),
            'quotation_items' => $repairOrder->latestQuotation?->items->map(fn ($i) => [
                'type' => $i->item_type, 'service_status' => $i->service?->status, 'name' => $i->description, 'quantity' => (int) $i->quantity, 'amount' => (float) $i->amount, 'approved' => (bool) $i->is_approved,
            ])->values() ?? [],
            // ADV-01 (D-020): phụ tùng cố vấn báo thiếu cho phiếu — Admin đặt / nhận ở Phụ tùng & kho → Cần đặt hàng.
            'part_requests' => $repairOrder->partRequests->map(fn ($r) => [
                'id' => $r->id, 'part' => $r->part?->name, 'unit' => $r->part?->unit, 'quantity' => (int) $r->quantity,
                'status' => $r->status, 'eta_date' => $r->eta_date?->toDateString(), 'note' => $r->request_note,
            ])->values(),
            'timeline' => $repairOrder->statusHistory->sortBy('id')->map(fn ($h) => [
                'at' => $h->created_at?->toIso8601String(),
                'status' => $h->status,
                'by' => $h->changedByAccount?->employee?->full_name ?? $h->changedByAccount?->email ?? 'Hệ thống',
                'note' => $h->note,
            ])->values(),
        ]]);
    }

    /** @return array<string, mixed> */
    private function orderRow(RepairOrder $o): array
    {
        $technicians = $o->workItems->map(fn ($w) => $w->technician?->employee?->full_name)->filter()->unique()->values();

        return [
            'id' => $o->id,
            'code' => $o->repair_order_code,
            'status' => $o->status,
            'customer' => $o->customer?->full_name,
            'phone' => $o->customer?->phone,
            'vehicle' => $this->vehicleName($o->vehicle),
            'plate' => $o->vehicle?->license_plate,
            'advisor' => $o->advisor?->full_name,
            'technician' => $technicians->implode(', ') ?: null,
            'received_at' => $o->received_at?->toIso8601String(),
            'estimated_ready_at' => $o->estimated_ready_at?->toIso8601String(),
            'estimate' => (float) ($o->latestQuotation?->total_amount ?? 0),
        ];
    }

    /* ----------------------------------------------- Hoá đơn & thanh toán */

    /** GET /api/admin/invoices?status=&search=&page= */
    public function invoices(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in([Invoice::UNPAID, Invoice::PARTIALLY_PAID, Invoice::PAID, Invoice::CANCELLED])],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            ...$this->dateRangeRules($request),
        ]);

        $page = $this->applyDateRange($this->invoiceQuery(), $filters, 'created_at')
            ->when($filters['status'] ?? null, fn (Builder $q, string $s) => $q->where('status', $s))
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q
                ->where('invoice_code', 'like', $like)
                ->orWhereHas('repairOrder', fn (Builder $r) => $r->where('repair_order_code', 'like', $like)
                    ->orWhereHas('customer', fn (Builder $c) => $c->where('full_name', 'like', $like))
                    ->orWhereHas('vehicle', fn (Builder $v) => $v->where('license_plate', 'like', $like)))))
            ->tap(fn (Builder $q) => $this->applySort($q, $request, [
                'created' => 'created_at', 'code' => 'invoice_code', 'total' => 'total_amount', 'status' => 'status',
            ]))
            ->paginate($filters['per_page'] ?? 10);

        $all = $this->applyDateRange(Invoice::query(), $filters, 'created_at')->where('status', '!=', Invoice::CANCELLED)
            ->withSum(['payments as paid' => fn ($q) => $q->where('status', Payment::SUCCESS)], 'amount')->get(['id', 'status', 'total_amount']);
        $open = $all->whereIn('status', [Invoice::UNPAID, Invoice::PARTIALLY_PAID]);

        return response()->json([
            'data' => $page->getCollection()->map(fn (Invoice $i) => $this->invoiceRow($i))->values(),
            'meta' => $this->meta($page),
            'summary' => [
                'total' => $all->count(),
                'open' => $open->count(),
                'debt' => round($open->sum(fn ($i) => (float) $i->total_amount - (float) $i->paid), 2),
                'collected' => round((float) $all->sum('paid'), 2),
            ],
        ]);
    }

    /** GET /api/admin/invoices/{invoice} */
    public function invoice(int $invoice): JsonResponse
    {
        $model = $this->invoiceQuery()->with(['items', 'payments', 'payments.collector:id,email', 'payments.collector.employee:id,account_id,full_name'])->findOrFail($invoice);

        return response()->json(['data' => $this->invoiceRow($model) + [
            'lines' => $model->items->map(fn ($i) => ['type' => $i->item_type, 'name' => $i->description, 'quantity' => (int) $i->quantity, 'price' => (float) $i->unit_price, 'amount' => (float) $i->amount])->values(),
            'payments' => $model->payments->sortBy('id')->map(fn (Payment $p) => $this->paymentRow($p, $model))->values(),
        ]]);
    }

    /** GET /api/admin/payments?search=&page= */
    public function payments(Request $request): JsonResponse
    {
        $filters = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'per_page' => ['nullable', 'integer', 'min:5', 'max:100'], ...$this->dateRangeRules($request)]);

        $page = $this->applyDateRange(Payment::query(), $filters, DB::raw('COALESCE(paid_at, created_at)'))
            ->with(['invoice:id,invoice_code,repair_order_id', 'invoice.repairOrder:id,repair_order_code,customer_id,vehicle_id', 'invoice.repairOrder.customer:id,full_name',
                'invoice.repairOrder.vehicle:id,license_plate', 'collector:id,email', 'collector.employee:id,account_id,full_name'])
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q
                ->where('transaction_code', 'like', $like)
                ->orWhereHas('invoice', fn (Builder $i) => $i->where('invoice_code', 'like', $like))))
            ->tap(fn (Builder $q) => $this->applySort($q, $request, ['created' => 'created_at', 'code' => 'transaction_code', 'amount' => 'amount', 'status' => 'status']))
            ->paginate($filters['per_page'] ?? 10);

        return response()->json([
            'data' => $page->getCollection()->map(fn (Payment $p) => $this->paymentRow($p, $p->invoice))->values(),
            'meta' => $this->meta($page),
        ]);
    }

    private function invoiceQuery(): Builder
    {
        return Invoice::query()
            ->with(['repairOrder:id,repair_order_code,customer_id,vehicle_id', 'repairOrder.customer:id,full_name', 'repairOrder.vehicle:id,license_plate'])
            ->withSum(['payments as paid' => fn ($q) => $q->where('status', Payment::SUCCESS)], 'amount');
    }

    /** @return array<string, mixed> */
    private function invoiceRow(Invoice $i): array
    {
        return [
            'id' => $i->id,
            'code' => $i->invoice_code,
            'order_code' => $i->repairOrder?->repair_order_code,
            'customer' => $i->repairOrder?->customer?->full_name,
            'plate' => $i->repairOrder?->vehicle?->license_plate,
            'issued_at' => $i->created_at?->toIso8601String(),
            'subtotal' => (float) $i->subtotal,
            'discount' => (float) $i->discount_amount,
            'total' => (float) $i->total_amount,
            'paid' => round((float) ($i->paid ?? 0), 2),
            'status' => $i->status,
        ];
    }

    /** @return array<string, mixed> */
    private function paymentRow(Payment $p, ?Invoice $invoice): array
    {
        return [
            'id' => $p->id,
            'code' => $p->transaction_code ?: $p->gateway_txn_ref ?: 'PAY-'.$p->id,
            'invoice' => $invoice?->invoice_code,
            'customer' => $invoice?->repairOrder?->customer?->full_name,
            'method' => self::METHOD_GROUPS[$p->payment_method] ?? 'CASH',
            'amount' => (float) $p->amount,
            'at' => ($p->paid_at ?? $p->created_at)?->toIso8601String(),
            'status' => $p->status,
            'invoice_id' => $invoice?->id,
            'order_code' => $invoice?->repairOrder?->repair_order_code,
            'plate' => $invoice?->repairOrder?->vehicle?->license_plate,
            'created_at' => $p->created_at?->toIso8601String(),
            'paid_at' => $p->paid_at?->toIso8601String(),
            'gateway_ref' => $p->gateway_txn_ref,
            'bank_code' => $p->bank_code,
            'collector' => $p->collector?->employee?->full_name ?? $p->collector?->email,
        ];
    }

    /* ------------------------------------------------------------- Đánh giá */

    /**
     * GET /api/admin/reviews?rating=all|1..5|low&status=all|unreplied|replied|hidden&search=&page=
     *
     * Đánh giá là khách chấm điểm GA-RA sau mỗi lần bảo dưỡng / sửa chữa (theo phiếu sửa chữa).
     */
    public function reviews(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'rating' => ['nullable', Rule::in(['all', '5', '4', '3', '2', '1', 'low', 'hidden'])],
            'status' => ['nullable', Rule::in(['all', 'unreplied', 'replied', 'hidden'])],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            ...$this->dateRangeRules($request),
        ]);
        $rating = $filters['rating'] ?? 'all';
        $status = $rating === 'hidden' ? 'hidden' : ($filters['status'] ?? 'all');
        $inRange = fn (): Builder => $this->applyDateRange(Review::query(), $filters, 'created_at');

        $page = $this->applyReviewFilters(
            $inRange()->with($this->reviewRelations())->where('is_hidden', $status === 'hidden'),
            $filters,
            $rating,
            $status,
        )->paginate($filters['per_page'] ?? 10);

        $visible = $inRange()->where('is_hidden', false);
        $visibleCount = (clone $visible)->count();
        $recent = (clone $visible)->where('created_at', '>=', now()->subDays(30))->avg('overall_rating');

        return response()->json([
            'data' => $page->getCollection()->map(fn (Review $r) => $this->reviewRow($r))->values(),
            'meta' => $this->meta($page),
            'summary' => [
                'average' => round((float) (clone $visible)->avg('overall_rating'), 2),
                'recent_average' => $recent === null ? null : round((float) $recent, 2),
                'positive_rate' => $visibleCount ? round((clone $visible)->where('overall_rating', '>=', 4)->count() / $visibleCount * 100, 1) : null,
                'reply_rate' => $visibleCount ? round((clone $visible)->whereNotNull('reply')->count() / $visibleCount * 100, 1) : null,
                'visible' => $visibleCount,
                'hidden' => $inRange()->where('is_hidden', true)->count(),
                'unreplied' => (clone $visible)->whereNull('reply')->count(),
                'low_unreplied' => (clone $visible)->whereNull('reply')->where('overall_rating', '<=', 3)->count(),
                'distribution' => collect([5, 4, 3, 2, 1])->mapWithKeys(fn (int $s) => [$s => (clone $visible)->where('overall_rating', $s)->count()]),
            ],
        ]);
    }

    /** POST /api/admin/reviews/{review}/reply — chỉ tạo phản hồi đầu tiên; sửa phải qua PUT để có lịch sử. */
    public function replyReview(Request $request, Review $review, ReviewReplyService $replies): JsonResponse
    {
        $data = $this->validatedReply($request, $replies);
        $replies->create($review, $data['reply'], $request->user());

        return response()->json(['message' => 'Đã gửi phản hồi.', 'data' => $this->reviewRow($review->fresh($this->reviewRelations()))]);
    }

    /** PUT /api/admin/reviews/{review}/reply — cập nhật phản hồi hiện hành và ghi lịch sử trong cùng transaction. */
    public function updateReviewReply(Request $request, Review $review, ReviewReplyService $replies): JsonResponse
    {
        $data = $this->validatedReply($request, $replies, editing: true);
        $replies->update($review, $data['reply'], $data['expected_reply'], $request->user());

        return response()->json(['message' => 'Đã cập nhật phản hồi.', 'data' => $this->reviewRow($review->fresh($this->reviewRelations()))]);
    }

    /** GET /api/admin/reviews/{review}/reply-history — các phiên bản từ mới đến cũ. */
    public function reviewReplyHistory(Review $review, ReviewReplyService $replies): JsonResponse
    {
        return response()->json(['data' => $replies->history($review)]);
    }

    /** PATCH /api/admin/reviews/{review} — ẩn / hiện. */
    public function updateReview(Request $request, Review $review): JsonResponse
    {
        $data = $request->validate(['is_hidden' => ['required', 'boolean']]);
        $review->update(['is_hidden' => $data['is_hidden']]);

        return response()->json([
            'message' => $data['is_hidden'] ? 'Đã ẩn đánh giá khỏi trang công khai.' : 'Đã hiện lại đánh giá.',
            'data' => $this->reviewRow($review->fresh($this->reviewRelations())),
        ]);
    }

    /* ------------------------------------------------------------- Nhật ký */

    /** GET /api/admin/audit-logs?category=&search=&page= */
    public function auditLogs(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'category' => ['nullable', Rule::in(['CREATE', 'UPDATE', 'DELETE', 'STATUS'])],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            ...$this->dateRangeRules($request),
        ]);

        $actions = $filters['category'] ?? null
            ? array_keys(array_filter(self::ACTIONS, fn (array $a) => $a[0] === $filters['category']))
            : null;

        $page = $this->applyDateRange(AuditLog::query(), $filters, 'created_at')
            ->with(['account:id,email,role', 'account.employee:id,account_id,full_name', 'account.customer:id,account_id,full_name'])
            ->when($actions !== null, fn (Builder $q) => $q->whereIn('action', $actions))
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q
                ->where('action', 'like', $like)->orWhere('reason', 'like', $like)
                ->orWhereHas('account', fn (Builder $a) => $a->where('email', 'like', $like)
                    ->orWhereHas('employee', fn (Builder $e) => $e->where('full_name', 'like', $like)))))
            ->tap(fn (Builder $q) => $this->applySort($q, $request, ['created' => 'created_at']))
            ->paginate($filters['per_page'] ?? 15);

        $appointments = Appointment::query()
            ->whereIn('id', $page->getCollection()->where('auditable_type', Appointment::class)->pluck('auditable_id'))
            ->pluck('appointment_code', 'id');

        return response()->json([
            'data' => $page->getCollection()->map(function (AuditLog $log) use ($appointments) {
                [$category, $label] = self::ACTIONS[$log->action] ?? ['UPDATE', $log->action];
                $account = $log->account;

                return [
                    'id' => $log->id,
                    'at' => $log->created_at?->toIso8601String(),
                    'actor' => $account?->employee?->full_name ?? $account?->customer?->full_name ?? $account?->email ?? 'Hệ thống',
                    'role' => self::ROLE_LABELS[$account?->role] ?? 'Hệ thống',
                    'category' => $category,
                    'action' => $log->action,
                    'label' => $label,
                    'target' => $this->auditTarget($log, $appointments->all()),
                    'detail' => $this->auditDetail($log),
                    'ip' => $log->ip_address,
                ];
            })->values(),
            'meta' => $this->meta($page),
        ]);
    }

    /** @param array<int, string> $appointments */
    private function auditTarget(AuditLog $log, array $appointments): string
    {
        return match ($log->auditable_type) {
            Appointment::class => 'Lịch hẹn '.($appointments[$log->auditable_id] ?? '#'.$log->auditable_id),
            RepairOrder::class => 'Phiếu sửa chữa #'.$log->auditable_id,
            Payment::class => 'Thanh toán #'.$log->auditable_id,
            Quotation::class => 'Báo giá #'.$log->auditable_id,
            Customer::class => 'Khách hàng #'.$log->auditable_id,
            default => class_basename((string) $log->auditable_type).' #'.$log->auditable_id,
        };
    }

    private function auditDetail(AuditLog $log): string
    {
        $old = $log->old_values['status'] ?? null;
        $new = $log->new_values['status'] ?? null;
        $parts = array_filter([
            self::ACTIONS[$log->action][1] ?? null,
            $old && $new ? "{$old} → {$new}" : null,
            $log->reason ? "Lý do: {$log->reason}" : null,
        ]);

        return implode(' · ', $parts);
    }

    /* ------------------------------------------------------------- Helpers */
}
