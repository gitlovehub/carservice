<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HandoverChecklistItem;
use App\Models\RepairOrder;
use App\Models\VehicleHandover;
use App\Services\ConfirmationService;
use App\Services\HandoverService;
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
