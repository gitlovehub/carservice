<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HandoverChecklistItem;
use App\Models\RepairOrder;
use App\Models\VehicleHandover;
use App\Services\ConfirmationService;
use App\Services\HandoverService;
use App\Services\PickupAuthorizationLinkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/** Cố vấn lập biên bản giao nhận xe và đưa khách xác nhận (P2: CHECK_IN). */
class HandoverController extends Controller
{
    public function __construct(
        private readonly HandoverService $handovers,
        private readonly ConfirmationService $confirmations,
    ) {}

    /**
     * Trang "Biên bản giao nhận" (cố vấn): mọi biên bản nhận / trả xe, mới nhất trước.
     * GET /api/handovers?type=CHECK_IN|CHECK_OUT&status=DRAFT|SUBMITTED|CONFIRMED|VOID&search=&page=&per_page=
     * `counts` = số biên bản theo trạng thái (cùng loại + từ khoá, bỏ lọc trạng thái) cho các thẻ thống kê.
     */
    public function list(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'type' => ['nullable', Rule::in([VehicleHandover::TYPE_CHECK_IN, VehicleHandover::TYPE_CHECK_OUT])],
            'status' => ['nullable', Rule::in([VehicleHandover::STATUS_DRAFT, VehicleHandover::STATUS_SUBMITTED, VehicleHandover::STATUS_CONFIRMED, VehicleHandover::STATUS_VOID])],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $base = VehicleHandover::query()
            ->when($filters['type'] ?? null, fn ($q, $type) => $q->where('type', $type))
            // Mã phiếu, người giao, tên / SĐT khách, biển số, hãng / dòng xe. Nhiều từ ("Bentley Bentayga", "Tèo VF") → mỗi từ khớp một trường.
            ->when(trim((string) ($filters['search'] ?? '')), function ($q, $search) {
                $terms = preg_split('/\s+/u', $search, -1, PREG_SPLIT_NO_EMPTY) ?: [];
                foreach (array_slice($terms, 0, 5) as $term) {
                    $like = '%'.addcslashes($term, '%_\\').'%';
                    $q->where(fn ($w) => $w->where('person_name', 'like', $like)
                        ->orWhereHas('repairOrder', fn ($o) => $o->where('repair_order_code', 'like', $like)
                            ->orWhereHas('customer', fn ($c) => $c->where('full_name', 'like', $like)->orWhere('phone', 'like', $like)))
                        ->orWhereHas('vehicle', fn ($v) => $v->where('license_plate', 'like', $like))
                        ->orWhereHas('vehicle.model', fn ($m) => $m->where('name', 'like', $like))
                        ->orWhereHas('vehicle.model.brand', fn ($b) => $b->where('name', 'like', $like)));
                }
            });

        $counts = (clone $base)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        $page = (clone $base)
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->with([
                'repairOrder:id,repair_order_code,status,customer_id,vehicle_id,requires_check_in',
                'repairOrder.customer:id,full_name,phone,email',
                'vehicle' => fn ($q) => $q->with('model.brand'),
                'staff:id,full_name',
                'checklistItems',
                'confirmations',
                'comparedHandover:id,mileage,fuel_level,general_condition,valuables_note',
                'comparedHandover.checklistItems',
            ])
            ->latest('id')
            ->paginate($filters['per_page'] ?? 10);

        return response()->json([...$page->toArray(), 'counts' => $counts]);
    }

    public function index(RepairOrder $repairOrder): JsonResponse
    {
        abort_unless(Gate::allows('view', $repairOrder), 403);

        return response()->json(['data' => $repairOrder->handovers()->with('checklistItems', 'confirmations')->get()]);
    }

    public function store(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        abort_unless(Gate::allows('update', $repairOrder), 403);
        $data = $request->validate([
            'type' => ['required', Rule::in([VehicleHandover::TYPE_CHECK_IN, VehicleHandover::TYPE_CHECK_OUT])],
            ...$this->rules(true),
        ]);
        $staff = $request->user()->employee;
        abort_if($staff === null, 403, 'Tài khoản chưa gắn hồ sơ nhân viên.');

        return response()->json($this->handovers->create($repairOrder, $data['type'], $data, $staff), 201);
    }

    public function update(Request $request, VehicleHandover $handover): JsonResponse
    {
        abort_unless(Gate::allows('update', $handover->repairOrder), 403);

        return response()->json($this->handovers->update($handover, $request->validate($this->rules(false))));
    }

    public function submit(VehicleHandover $handover): JsonResponse
    {
        abort_unless(Gate::allows('update', $handover->repairOrder), 403);

        return response()->json($this->handovers->submit($handover));
    }

    public function void(Request $request, VehicleHandover $handover): JsonResponse
    {
        abort_unless(Gate::allows('update', $handover->repairOrder), 403);
        $data = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:1000']]);

        return response()->json($this->handovers->void($handover, $data['reason']));
    }

    public function requestOtp(Request $request, VehicleHandover $handover): JsonResponse
    {
        abort_unless(Gate::allows('update', $handover->repairOrder), 403);
        $otp = $this->confirmations->requestHandoverOtp($handover, $request->user());
        [$name, $domain] = array_pad(explode('@', $otp->sent_to_email, 2), 2, '');

        return response()->json([
            'message' => 'Đã gửi mã xác nhận tới email chủ xe.',
            'sent_to' => mb_substr($name, 0, 2).str_repeat('*', max(1, mb_strlen($name) - 2)).'@'.$domain,
            'expires_at' => $otp->expires_at->toIso8601String(),
        ]);
    }

    public function verifyOtp(Request $request, VehicleHandover $handover): JsonResponse
    {
        abort_unless(Gate::allows('update', $handover->repairOrder), 403);
        $data = $request->validate(['code' => ['required', 'string', 'regex:/^\d{6}$/']]);

        return response()->json($this->confirmations->verifyHandoverOtp($handover, $data['code'], $request->user()->employee, $request));
    }

    /** Gửi link để chủ xe tự khai người được ủy quyền nhận xe (khách không có tài khoản vẫn dùng được). */
    public function sendPickupAuthorizationLink(Request $request, RepairOrder $repairOrder, PickupAuthorizationLinkService $links): JsonResponse
    {
        abort_unless(Gate::allows('update', $repairOrder), 403);

        return response()->json(['message' => 'Đã gửi link ủy quyền tới email chủ xe.', 'sent_to' => $links->send($repairOrder, $request->user())]);
    }

    /** @return array<string, array<int, mixed>> */
    private function rules(bool $creating): array
    {
        $required = $creating ? 'required' : 'sometimes';

        return [
            'mileage' => ['nullable', 'integer', 'min:0', 'max:9999999'],
            'fuel_level' => ['nullable', Rule::in(VehicleHandover::FUEL_LEVELS)],
            'general_condition' => ['nullable', 'string', 'max:2000'],
            'valuables_note' => ['nullable', 'string', 'max:1000'],
            'person_name' => [$required, 'string', 'max:150'],
            'person_phone' => ['nullable', 'string', 'max:20'],
            'person_id_last4' => ['nullable', 'digits:4'],
            'person_relation' => [$required, Rule::in(VehicleHandover::RELATIONS)],
            // CHECK_OUT do người được ủy quyền nhận (N9) — HandoverService đối chiếu ủy quyền + 4 số cuối giấy tờ.
            'pickup_authorization_id' => ['nullable', 'integer'],
            'items' => [$creating ? 'nullable' : 'sometimes', 'array', 'max:100'],
            'items.*.category' => ['required', Rule::in(HandoverChecklistItem::CATEGORIES)],
            'items.*.position_code' => ['nullable', 'string', 'max:50', 'regex:/^[A-Z0-9_]+$/'],
            'items.*.label' => ['required', 'string', 'max:150'],
            'items.*.condition' => ['required', Rule::in(HandoverChecklistItem::CONDITIONS)],
            'items.*.quantity' => ['nullable', 'integer', 'min:0', 'max:999'],
            'items.*.note' => ['nullable', 'string', 'max:500'],
        ];
    }
}
