<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\Review;
use App\Models\TechnicianProfile;
use App\Models\WorkItem;
use App\Support\VehicleName;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\Rule;

/**
 * Admin xem toàn xưởng (chỉ đọc nghiệp vụ; thao tác phiếu/thu tiền vẫn do Cố vấn làm):
 * phiếu sửa chữa, hoá đơn & thanh toán, đánh giá (trả lời / ẩn), nhật ký thao tác.
 */
class AdminOperationsController extends Controller
{
    public const ORDER_GROUPS = [
        'intake' => [RepairOrder::RECEIVED, RepairOrder::INSPECTING],
        'quote' => [RepairOrder::QUOTING, RepairOrder::WAITING_APPROVAL],
        'parts' => [RepairOrder::WAITING_FOR_PARTS],
        'repair' => [RepairOrder::IN_PROGRESS],
        'done' => [RepairOrder::COMPLETED, RepairOrder::HANDED_OVER],
        'closed' => [RepairOrder::CLOSED],
    ];

    /** Phương thức lưu trong DB → nhóm hiển thị. */
    public const METHOD_GROUPS = [Payment::DIRECT => 'CASH', Payment::QR => 'BANK_TRANSFER', Payment::VNPAY => 'VNPAY'];

    private const ROLE_LABELS = [
        Account::ROLE_ADMIN => 'Quản trị viên', Account::ROLE_ADVISOR => 'Cố vấn dịch vụ',
        Account::ROLE_TECHNICIAN => 'Kỹ thuật viên', Account::ROLE_CUSTOMER => 'Khách hàng',
    ];

    /** Hành động thật trong audit_logs → nhóm + nhãn tiếng Việt. */
    private const ACTIONS = [
        'appointment.created_by_staff' => ['CREATE', 'Tạo lịch hẹn hộ khách'],
        'appointment.confirmed' => ['STATUS', 'Xác nhận lịch hẹn'],
        'appointment.checked_in' => ['STATUS', 'Tiếp nhận xe theo lịch hẹn'],
        'appointment.cancelled' => ['DELETE', 'Huỷ lịch hẹn'],
        'appointment.rescheduled' => ['UPDATE', 'Đổi lịch hẹn'],
        'repair_order.vehicle_changed' => ['UPDATE', 'Đổi xe trên phiếu sửa chữa'],
        'PICKUP_AUTHORIZATION_CREATED' => ['CREATE', 'Khách uỷ quyền nhận xe'],
        'VNPAY_OVERPAID' => ['STATUS', 'Thanh toán VNPAY vượt số tiền còn lại'],
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
        ]);

        $query = RepairOrder::query()
            ->with(['customer:id,full_name,phone', 'vehicle:id,model_id,license_plate', 'vehicle.model:id,brand_id,name', 'vehicle.model.brand:id,name',
                'advisor:id,full_name', 'workItems:id,repair_order_id,technician_id', 'workItems.technician:id,employee_id', 'workItems.technician.employee:id,full_name', 'latestQuotation'])
            ->when($filters['group'] ?? null, fn (Builder $q, string $group) => $q->whereIn('status', self::ORDER_GROUPS[$group]))
            ->when($filters['technician_id'] ?? null, fn (Builder $q, $id) => $q->whereHas('workItems', fn (Builder $w) => $w->where('technician_id', $id)))
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q
                ->where('repair_order_code', 'like', $like)
                ->orWhereHas('customer', fn (Builder $c) => $c->where('full_name', 'like', $like)->orWhere('phone', 'like', $like))
                ->orWhereHas('vehicle', fn (Builder $v) => $v->where('license_plate', 'like', $like))))
            ->orderByDesc('received_at')->orderByDesc('id');

        $page = $query->paginate($filters['per_page'] ?? 10);
        $counts = RepairOrder::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

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
            'advisor:id,full_name', 'workItems.technician.employee:id,full_name', 'workItems.service:id,name', 'latestQuotation.items',
            'statusHistory.changedByAccount:id,email,role', 'statusHistory.changedByAccount.employee:id,account_id,full_name']);

        $prices = $repairOrder->latestQuotation?->items->where('item_type', 'SERVICE')->keyBy('service_id') ?? collect();

        return response()->json(['data' => $this->orderRow($repairOrder) + [
            'items' => $repairOrder->workItems->map(fn (WorkItem $w) => [
                'name' => $w->description ?: $w->service?->name,
                'status' => $w->status,
                'technician' => $w->technician?->employee?->full_name,
                'price' => (float) ($prices[$w->service_id]->amount ?? 0),
            ])->values(),
            'quotation_items' => $repairOrder->latestQuotation?->items->map(fn ($i) => [
                'type' => $i->item_type, 'name' => $i->description, 'quantity' => (int) $i->quantity, 'amount' => (float) $i->amount, 'approved' => (bool) $i->is_approved,
            ])->values() ?? [],
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
        ]);

        $page = $this->invoiceQuery()
            ->when($filters['status'] ?? null, fn (Builder $q, string $s) => $q->where('status', $s))
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q
                ->where('invoice_code', 'like', $like)
                ->orWhereHas('repairOrder', fn (Builder $r) => $r->where('repair_order_code', 'like', $like)
                    ->orWhereHas('customer', fn (Builder $c) => $c->where('full_name', 'like', $like))
                    ->orWhereHas('vehicle', fn (Builder $v) => $v->where('license_plate', 'like', $like)))))
            ->orderByDesc('created_at')->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 10);

        $all = Invoice::query()->where('status', '!=', Invoice::CANCELLED)
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
        $model = $this->invoiceQuery()->with(['items', 'payments'])->findOrFail($invoice);

        return response()->json(['data' => $this->invoiceRow($model) + [
            'lines' => $model->items->map(fn ($i) => ['type' => $i->item_type, 'name' => $i->description, 'quantity' => (int) $i->quantity, 'price' => (float) $i->unit_price, 'amount' => (float) $i->amount])->values(),
            'payments' => $model->payments->sortBy('id')->map(fn (Payment $p) => $this->paymentRow($p, $model))->values(),
        ]]);
    }

    /** GET /api/admin/payments?search=&page= */
    public function payments(Request $request): JsonResponse
    {
        $filters = $request->validate(['search' => ['nullable', 'string', 'max:100'], 'per_page' => ['nullable', 'integer', 'min:5', 'max:100']]);

        $page = Payment::query()
            ->with(['invoice:id,invoice_code,repair_order_id', 'invoice.repairOrder:id,customer_id', 'invoice.repairOrder.customer:id,full_name'])
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q
                ->where('transaction_code', 'like', $like)
                ->orWhereHas('invoice', fn (Builder $i) => $i->where('invoice_code', 'like', $like))))
            ->orderByDesc('created_at')->orderByDesc('id')
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
        ];
    }

    /* ------------------------------------------------------------- Đánh giá */

    /** GET /api/admin/reviews?rating=all|5|4|low|hidden&search=&page= */
    public function reviews(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'rating' => ['nullable', Rule::in(['all', '5', '4', 'low', 'hidden'])],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);
        $rating = $filters['rating'] ?? 'all';

        $page = Review::query()
            ->with(['customer:id,full_name', 'repairOrder:id,repair_order_code,vehicle_id', 'repairOrder.vehicle:id,model_id,license_plate',
                'repairOrder.vehicle.model:id,brand_id,name', 'repairOrder.vehicle.model.brand:id,name',
                'repairOrder.workItems:id,repair_order_id,technician_id', 'repairOrder.workItems.technician.employee:id,full_name'])
            ->where('is_hidden', $rating === 'hidden')
            ->when($rating === 'low', fn (Builder $q) => $q->where('overall_rating', '<=', 3))
            ->when(in_array($rating, ['5', '4'], true), fn (Builder $q) => $q->where('overall_rating', (int) $rating))
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q
                ->where('comment', 'like', $like)
                ->orWhereHas('customer', fn (Builder $c) => $c->where('full_name', 'like', $like))
                ->orWhereHas('repairOrder', fn (Builder $r) => $r->where('repair_order_code', 'like', $like))))
            ->orderByDesc('created_at')->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 10);

        $visible = Review::query()->where('is_hidden', false);

        return response()->json([
            'data' => $page->getCollection()->map(fn (Review $r) => $this->reviewRow($r))->values(),
            'meta' => $this->meta($page),
            'summary' => [
                'average' => round((float) (clone $visible)->avg('overall_rating'), 2),
                'visible' => (clone $visible)->count(),
                'hidden' => Review::query()->where('is_hidden', true)->count(),
                'unreplied' => (clone $visible)->whereNull('reply')->count(),
                'low_unreplied' => (clone $visible)->whereNull('reply')->where('overall_rating', '<=', 3)->count(),
                'distribution' => collect([5, 4, 3, 2, 1])->mapWithKeys(fn (int $s) => [$s => (clone $visible)->where('overall_rating', $s)->count()]),
            ],
        ]);
    }

    /** POST /api/admin/reviews/{review}/reply */
    public function replyReview(Request $request, Review $review): JsonResponse
    {
        $data = $request->validate(['reply' => ['required', 'string', 'max:2000']], ['reply.required' => 'Vui lòng nhập nội dung phản hồi.']);
        $reply = trim($data['reply']);
        abort_if($reply === '', 422, 'Vui lòng nhập nội dung phản hồi.');

        $review->update(['reply' => $reply, 'replied_at' => now()]);

        return response()->json(['message' => 'Đã gửi phản hồi.', 'data' => $this->reviewRow($review->fresh($this->reviewRelations()))]);
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

    /** @return list<string> */
    private function reviewRelations(): array
    {
        return ['customer:id,full_name', 'repairOrder.vehicle.model.brand', 'repairOrder.workItems.technician.employee'];
    }

    /** @return array<string, mixed> */
    private function reviewRow(Review $r): array
    {
        $order = $r->repairOrder;

        return [
            'id' => $r->id,
            'customer' => $r->customer?->full_name,
            'vehicle' => trim($this->vehicleName($order?->vehicle).' '.($order?->vehicle?->license_plate ?? '')),
            'order_code' => $order?->repair_order_code,
            'rating' => (int) $r->overall_rating,
            'advisor_rating' => $r->advisor_rating,
            'technician_rating' => $r->technician_rating,
            'comment' => (string) $r->comment,
            'date' => $r->created_at?->toIso8601String(),
            'technician' => $order?->workItems->map(fn ($w) => $w->technician?->employee?->full_name)->filter()->unique()->implode(', ') ?: null,
            'reply' => $r->reply,
            'replied_at' => $r->replied_at?->toIso8601String(),
            'hidden' => (bool) $r->is_hidden,
        ];
    }

    /* ------------------------------------------------------------- Nhật ký */

    /** GET /api/admin/audit-logs?category=&search=&page= */
    public function auditLogs(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'category' => ['nullable', Rule::in(['CREATE', 'UPDATE', 'DELETE', 'STATUS'])],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $actions = $filters['category'] ?? null
            ? array_keys(array_filter(self::ACTIONS, fn (array $a) => $a[0] === $filters['category']))
            : null;

        $page = AuditLog::query()
            ->with(['account:id,email,role', 'account.employee:id,account_id,full_name', 'account.customer:id,account_id,full_name'])
            ->when($actions !== null, fn (Builder $q) => $q->whereIn('action', $actions))
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q
                ->where('action', 'like', $like)->orWhere('reason', 'like', $like)
                ->orWhereHas('account', fn (Builder $a) => $a->where('email', 'like', $like)
                    ->orWhereHas('employee', fn (Builder $e) => $e->where('full_name', 'like', $like)))))
            ->orderByDesc('created_at')->orderByDesc('id')
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

    /** @param array<string, mixed> $filters */
    private function term(array $filters): ?string
    {
        $search = VehicleName::clean((string) ($filters['search'] ?? ''));

        return $search === '' ? null : VehicleName::like($search);
    }

    private function vehicleName(mixed $vehicle): string
    {
        return trim(($vehicle?->model?->brand?->name ?? '').' '.($vehicle?->model?->name ?? ''));
    }

    /** @return array{current_page: int, last_page: int, per_page: int, total: int} */
    private function meta(LengthAwarePaginator $page): array
    {
        return ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()];
    }
}
