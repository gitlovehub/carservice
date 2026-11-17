<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AppliesSort;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\RepairOrder;
use App\Models\TechnicianProfile;
use App\Models\VehicleHandover;
use App\Services\CounterRecordService;
use App\Services\RepairOrderService;
use App\Support\GarageDay;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RepairOrderController extends Controller
{
    use AppliesSort;

    public function __construct(
        private readonly RepairOrderService $service,
        private readonly CounterRecordService $counterRecords,
    ) {}

    /**
     * GET /api/repair-orders?status=A,B&search=&mine=1&from=Y-m-d&to=Y-m-d&sort=created|ready&dir=&page=
     * ADV-07: lọc nhiều trạng thái, tìm theo mã phiếu / biển số / tên / SĐT khách, "phiếu của tôi",
     * kèm `counts` (số phiếu theo trạng thái, cùng phạm vi tìm kiếm) cho các chip lọc.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', 'string', 'max:200'],
            'search' => ['nullable', 'string', 'max:100'],
            'mine' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            // Trang Tiến độ sửa chữa: số công việc xong / tổng, lọc "xong sửa trong ngày" / "dự kiến xong trong ngày".
            'with_progress' => ['nullable', 'boolean'],
            'completed_on' => ['nullable', 'date_format:Y-m-d'],
            'ready_on' => ['nullable', 'date_format:Y-m-d'],
            // Trang Kiểm tra & bàn giao: kèm hoá đơn / biên bản trả xe / kiểm tra sau sửa + số theo tình trạng bàn giao.
            'with_delivery' => ['nullable', 'boolean'],
            'delivery' => ['nullable', Rule::in(array_keys($this->deliveryScopes()))],
            // Trang Thanh toán: chờ thanh toán (đã sửa xong, hoá đơn chưa PAID) / đã thanh toán + doanh thu đã thu.
            'with_billing' => ['nullable', 'boolean'],
            'billing' => ['nullable', Rule::in(['unpaid', 'paid'])],
        ]);
        $base = RepairOrder::query();

        if ($request->user()?->role === Account::ROLE_TECHNICIAN) {
            $employeeId = $request->user()->employee?->id;

            if (! $employeeId) {
                $base->whereRaw('0 = 1');
            } else {
                $base->whereHas('assignments.technician', function ($q) use ($employeeId): void {
                    $q->where('employee_id', $employeeId);
                });
            }
        }
        if ($request->boolean('mine')) {
            $base->where('advisor_id', $request->user()->employee?->id ?? 0);
        }
        // Khoảng ngày nhận xe theo ngày gara (gồm cả hai đầu) — áp cho cả số đếm.
        if (! empty($filters['from'])) {
            $base->where('received_at', '>=', GarageDay::start($filters['from']));
        }
        if (! empty($filters['to'])) {
            $base->where('received_at', '<=', GarageDay::end($filters['to']));
        }
        $search = trim((string) ($filters['search'] ?? ''));
        if ($search !== '') {
            $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $search).'%';
            $base->where(fn ($q) => $q->where('repair_order_code', 'like', $like)
                ->orWhereHas('vehicle', fn ($v) => $v->where('license_plate', 'like', $like))
                ->orWhereHas('customer', fn ($c) => $c->where('full_name', 'like', $like)->orWhere('phone', 'like', $like)));
        }

        $counts = (clone $base)->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status')
            ->map(fn ($total) => (int) $total);

        $completedToday = fn ($q, string $day) => $q->whereHas('statusHistory', fn ($h) => $h->where('status', RepairOrder::COMPLETED)->whereBetween('created_at', GarageDay::bounds($day)));
        $readyToday = fn ($q, string $day) => $q->whereIn('status', [RepairOrder::IN_PROGRESS, RepairOrder::WAITING_FOR_PARTS])->whereBetween('estimated_ready_at', GarageDay::bounds($day));
        $progress = null;
        if ($request->boolean('with_progress')) {
            $today = GarageDay::today();
            $progress = [
                'completed_today' => $completedToday(clone $base, $today)->count(),
                'ready_today' => $readyToday(clone $base, $today)->count(),
            ];
        }

        $scopes = $this->deliveryScopes();
        $delivery = null;
        if ($request->boolean('with_delivery')) {
            $delivery = collect($scopes)->map(fn (callable $scope) => $scope(clone $base)->count())->all();
        }

        $billingScopes = [
            'unpaid' => fn (Builder $q) => $q->where('status', RepairOrder::COMPLETED)->whereDoesntHave('invoice', fn ($i) => $i->where('status', Invoice::PAID)),
            'paid' => fn (Builder $q) => $q->whereHas('invoice', fn ($i) => $i->where('status', Invoice::PAID)),
        ];
        $billing = null;
        if ($request->boolean('with_billing')) {
            $collected = fn (string $from, string $to) => (float) Payment::query()->where('status', Payment::SUCCESS)
                ->whereBetween('paid_at', [GarageDay::start($from), GarageDay::end($to)])->sum('amount');
            $today = GarageDay::today();
            $billing = [
                'unpaid' => $billingScopes['unpaid'](clone $base)->count(),
                'paid' => $billingScopes['paid'](clone $base)->count(),
                'revenue_today' => $collected($today, $today),
                'revenue_month' => $collected(substr($today, 0, 8).'01', $today),
            ];
        }

        $statuses = array_values(array_filter(explode(',', (string) ($filters['status'] ?? ''))));
        $query = (clone $base)->with(['customer', 'vehicle', 'vehicle.model:id,brand_id,name', 'vehicle.model.brand:id,name', 'advisor'])
            ->when($statuses, fn ($q) => $q->whereIn('status', $statuses))
            ->when($filters['delivery'] ?? null, fn ($q, string $key) => $scopes[$key]($q))
            ->when($filters['billing'] ?? null, fn ($q, string $key) => $billingScopes[$key]($q))
            ->when($request->boolean('with_delivery') || $request->boolean('with_billing'), fn ($q) => $q->with('invoice:id,repair_order_id,status,total_amount')
                ->withExists(['handovers as check_out_confirmed' => fn ($h) => $h->where('type', VehicleHandover::TYPE_CHECK_OUT)->where('status', VehicleHandover::STATUS_CONFIRMED)]))
            ->when($filters['completed_on'] ?? null, fn ($q, string $day) => $completedToday($q, $day))
            ->when($filters['ready_on'] ?? null, fn ($q, string $day) => $readyToday($q, $day))
            ->when($request->boolean('with_progress'), fn ($q) => $q->withCount([
                'workItems as work_total' => fn ($w) => $w->where('status', '!=', 'CANCELLED'),
                'workItems as work_done' => fn ($w) => $w->where('status', 'COMPLETED'),
            ]));
        $this->applySort($query, $request, [
            'created' => 'received_at',
            'ready' => fn ($q, string $dir) => $q->orderByRaw('estimated_ready_at IS NULL')->orderBy('estimated_ready_at', $dir),
        ]);

        return response()->json([
            ...$query->paginate($filters['per_page'] ?? 20)->toArray(),
            'counts' => $counts,
            ...($progress === null ? [] : ['progress' => $progress]),
            ...($delivery === null ? [] : ['delivery' => $delivery]),
            ...($billing === null ? [] : ['billing' => $billing]),
        ]);
    }

    /**
     * Tình trạng bàn giao của xe đã sửa xong — theo đúng điều kiện `RepairOrderService::handOver`
     * (kiểm tra sau sửa → hoá đơn PAID → biên bản trả xe chủ xe xác nhận nếu xe nhận theo biên bản).
     *
     * @return array<string, callable(Builder): Builder>
     */
    private function deliveryScopes(): array
    {
        $checkOut = fn ($h) => $h->where('type', VehicleHandover::TYPE_CHECK_OUT)->where('status', VehicleHandover::STATUS_CONFIRMED);
        $paid = fn ($q) => $q->whereHas('invoice', fn ($i) => $i->where('status', Invoice::PAID));
        $checked = fn (Builder $q) => $q->where('status', RepairOrder::COMPLETED)->whereNotNull('quality_checked_at');

        return [
            'check' => fn (Builder $q) => $q->where('status', RepairOrder::COMPLETED)->whereNull('quality_checked_at'),
            'payment' => fn (Builder $q) => $checked($q)->whereDoesntHave('invoice', fn ($i) => $i->where('status', Invoice::PAID)),
            'checkout' => fn (Builder $q) => $paid($checked($q))->where('requires_check_in', true)->whereDoesntHave('handovers', $checkOut),
            'ready' => fn (Builder $q) => $paid($checked($q))->where(fn ($w) => $w->where('requires_check_in', false)->orWhereHas('handovers', $checkOut)),
            'handed_today' => fn (Builder $q) => $q->where('status', RepairOrder::HANDED_OVER)
                ->whereHas('statusHistory', fn ($h) => $h->where('status', RepairOrder::HANDED_OVER)->whereBetween('created_at', GarageDay::bounds(GarageDay::today()))),
            'late' => fn (Builder $q) => $q->where('status', RepairOrder::COMPLETED)->whereNotNull('estimated_ready_at')->where('estimated_ready_at', '<', now()),
        ];
    }

    public function show(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('view', $repairOrder);

        $repairOrder->load([
            'customer', 'vehicle', 'advisor', 'statusHistory.changedByAccount',
            // Hãng / dòng / phiên bản để hiện logo + tên xe ở đầu chi tiết phiếu; xe đặt lịch khi khách mang xe khác.
            'vehicle.model:id,brand_id,name', 'vehicle.model.brand:id,name', 'vehicle.trim:id,name',
            'bookedVehicle:id,license_plate',
            // Kiểm tra sau sửa chữa (bắt buộc trước bàn giao): ai kiểm.
            'qualityInspector:id,email', 'qualityInspector.employee:id,account_id,full_name',
            // Ai thu từng khoản tại quầy (trang Thanh toán → Lịch sử thanh toán).
            'invoice.payments.collector:id,email', 'invoice.payments.collector.employee:id,account_id,full_name',
            'assignments.technician.employee', 'inspections.items', 'inspections.recordedBy', 'inspections.recommendations.service', 'inspections.recommendations.part',
            'quotations.items', 'workItems.technician', 'workItems.service', 'usedParts.part', 'invoice.items', 'invoice.payments',
            // Biên bản giao nhận xe (P2) + xác nhận của khách.
            'handovers.checklistItems', 'handovers.confirmations', 'pickupAuthorizations', 'partRequests.part',
            // P3: lịch sử từng lần khách duyệt / từ chối, kèm phương thức xác nhận.
            'quotations.items.responses.confirmation:id,method,confirmed_at,witness_employee_id',
            // Yêu cầu khách chọn khi đặt lịch, dùng để điền sẵn đề xuất ở bước kiểm tra.
            'appointment:id,appointment_code,request_type,symptom_description,note',
            'appointment.services:id,name',
            'appointment.packages:id,name',
            'appointment.packages.services:id,name',
            'appointment.packages.parts:id,name,unit',
        ]);

        return response()->json($repairOrder);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', RepairOrder::class);

        // ADV-02/03: khách vãng lai mới (`customer{}`, chỉ khi không có lịch hẹn) / xe chưa có trong hệ thống (`vehicle{}`).
        $rules = CounterRecordService::rules();
        $rules['customer'][] = 'prohibited_unless:appointment_id,null';
        $data = $request->validate([
            'appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
            ...$rules,
            'mileage_received' => ['nullable', 'integer', 'min:0'],
            'initial_condition' => ['nullable', 'string'],
            'note' => ['nullable', 'string'],
            // Bắt buộc khi xe mang tới khác xe trong lịch hẹn (RepairOrderService::receive).
            'vehicle_change_reason' => ['nullable', 'string', 'max:500'],
        ], [
            ...CounterRecordService::messages(),
            'customer.prohibited_unless' => 'Khách có lịch hẹn thì dùng hồ sơ khách của lịch hẹn.',
        ]);

        $advisor = $request->user()->employee;

        if (! $advisor) {
            return response()->json(['message' => 'Tài khoản chưa gắn với hồ sơ nhân viên.'], 403);
        }

        $ro = DB::transaction(fn () => $this->service->receive(
            $this->counterRecords->resolve($data, $data['mileage_received'] ?? null), $advisor
        ));

        return response()->json($ro, 201);
    }

    public function assignTechnician(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('update', $repairOrder);

        $data = $request->validate([
            'technician_id' => ['required', 'integer', 'exists:technician_profiles,id'],
            'note' => ['nullable', 'string'],
        ]);

        $technician = TechnicianProfile::findOrFail($data['technician_id']);

        $assignment = $this->service->assignTechnician(
            $repairOrder, $technician, $request->user(), $data['note'] ?? null
        );

        return response()->json($assignment, 201);
    }

    public function startRepair(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('update', $repairOrder);

        $ro = $this->service->startRepair($repairOrder, $request->user());

        return response()->json($ro->load('workItems'));
    }

    public function markWaitingForParts(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('update', $repairOrder);

        $data = $request->validate([
            'note' => ['nullable', 'string'],
            // ADV-01: báo thiếu phụ tùng ngay khi chuyển (bắt buộc nếu phiếu chưa có yêu cầu đang mở).
            'parts' => ['sometimes', 'array', 'max:20'],
            'parts.*.part_id' => ['required', 'integer', 'distinct', 'exists:parts,id'],
            'parts.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'parts.*.note' => ['nullable', 'string', 'max:500'],
        ]);

        $ro = $this->service->markWaitingForParts($repairOrder, $request->user(), $data['note'] ?? null, $data['parts'] ?? []);

        return response()->json($ro);
    }

    public function resume(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('update', $repairOrder);

        $data = $request->validate(['note' => ['nullable', 'string']]);

        $ro = $this->service->resumeFromWaitingForParts($repairOrder, $request->user(), $data['note'] ?? null);

        return response()->json($ro);
    }

    public function review(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('update', $repairOrder);

        $data = $request->validate(['note' => ['nullable', 'string']]);

        $this->service->logReviewAndTest($repairOrder, $request->user(), $data['note'] ?? null);

        return response()->json(['message' => 'Đã ghi nhận Review & Test.']);
    }

    public function complete(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('update', $repairOrder);

        $data = $request->validate(['note' => ['nullable', 'string']]);

        $ro = $this->service->completeRepairOrder($repairOrder, $request->user(), $data['note'] ?? null);

        return response()->json($ro);
    }

    public function close(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('update', $repairOrder);

        $data = $request->validate([
            'close_reason' => ['required', 'string', 'in:'.implode(',', RepairOrder::CLOSE_REASONS)],
            'note' => ['required', 'string'],
        ]);

        $ro = $this->service->closeRepairOrder(
            $repairOrder, $data['close_reason'], $data['note'], $request->user()
        );

        return response()->json($ro);
    }

    /** POST /repair-orders/{id}/quality-check {items: [ENGINE, BRAKES, …], note?} — kiểm tra sau sửa chữa (bắt buộc trước bàn giao). */
    public function qualityCheck(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('update', $repairOrder);
        $data = $request->validate([
            'items' => ['required', 'array'],
            'items.*' => ['string', 'distinct', Rule::in(array_keys(RepairOrder::QUALITY_CHECK_ITEMS))],
            'note' => ['nullable', 'string', 'max:1000'],
        ], ['items.required' => 'Tick các hạng mục đã kiểm tra.']);

        $ro = $this->service->recordQualityCheck($repairOrder, $data['items'], $data['note'] ?? null, $request->user());

        return response()->json($ro->load('qualityInspector:id,email', 'qualityInspector.employee:id,account_id,full_name'));
    }

    public function handOver(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('update', $repairOrder);

        $ro = $this->service->handOver($repairOrder, $request->user());

        return response()->json($ro);
    }
}
