<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PickupAuthorization;
use App\Models\RepairOrder;
use App\Services\ConfirmationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

/** Chủ xe khai báo / thu hồi người được ủy quyền nhận xe (N9). Chỉ chủ phiếu, chỉ trong tài khoản của mình. */
class CustomerPickupAuthorizationController extends Controller
{
    public function __construct(private readonly ConfirmationService $confirmations) {}

    public function index(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        abort_unless(Gate::forUser($request->user())->allows('view', $repairOrder), 404);

        return response()->json(['data' => $repairOrder->pickupAuthorizations()->get()]);
    }

    public function store(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        abort_unless(Gate::forUser($request->user())->allows('view', $repairOrder), 404);
        if (in_array($repairOrder->status, [RepairOrder::HANDED_OVER, RepairOrder::CLOSED], true)) {
            throw ValidationException::withMessages(['repair_order' => 'Phiếu đã kết thúc, không thể ủy quyền nhận xe.']);
        }
        $data = $request->validate([
            'full_name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^[0-9+ ]{8,20}$/'],
            'id_last4' => ['required', 'digits:4'],
            'valid_until' => ['nullable', 'date', 'after:now'],
        ]);

        $authorization = DB::transaction(function () use ($repairOrder, $data, $request): PickupAuthorization {
            $active = $repairOrder->pickupAuthorizations()->where('status', PickupAuthorization::ACTIVE)->lockForUpdate()->count();
            if ($active >= PickupAuthorization::MAX_ACTIVE) {
                throw ValidationException::withMessages(['full_name' => 'Tối đa '.PickupAuthorization::MAX_ACTIVE.' người được ủy quyền cùng lúc.']);
            }
            $authorization = $repairOrder->pickupAuthorizations()->create([
                ...$data,
                'customer_id' => $repairOrder->customer_id,
                'status' => PickupAuthorization::ACTIVE,
            ]);
            $this->confirmations->recordAccountAction($authorization, (int) $repairOrder->customer_id, [
                'action' => 'PICKUP_AUTHORIZATION_CREATED', 'repair_order_id' => $repairOrder->id,
                'full_name' => $data['full_name'], 'phone' => $data['phone'], 'id_last4' => $data['id_last4'],
                'valid_until' => $data['valid_until'] ?? null,
            ], $request);

            return $authorization;
        });

        return response()->json($authorization, 201);
    }

    public function revoke(Request $request, PickupAuthorization $pickupAuthorization): JsonResponse
    {
        abort_unless(Gate::forUser($request->user())->allows('view', $pickupAuthorization->repairOrder), 404);
        if ($pickupAuthorization->status !== PickupAuthorization::ACTIVE) {
            throw ValidationException::withMessages(['status' => 'Ủy quyền đã được sử dụng hoặc đã thu hồi.']);
        }
        $pickupAuthorization->update(['status' => PickupAuthorization::REVOKED, 'revoked_at' => now()]);

        return response()->json($pickupAuthorization);
    }
}
