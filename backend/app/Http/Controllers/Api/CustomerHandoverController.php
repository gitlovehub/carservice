<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RepairOrder;
use App\Models\VehicleHandover;
use App\Services\ConfirmationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/** Khách xem biên bản giao nhận của xe mình và tự xác nhận trong tài khoản (ACCOUNT). */
class CustomerHandoverController extends Controller
{
    public function __construct(private readonly ConfirmationService $confirmations) {}

    public function index(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        abort_unless(Gate::forUser($request->user())->allows('view', $repairOrder), 404);

        // Khách không thấy bản nháp của nhân viên.
        $items = $repairOrder->handovers()
            ->whereIn('status', [VehicleHandover::STATUS_SUBMITTED, VehicleHandover::STATUS_CONFIRMED])
            ->with('checklistItems', 'confirmations')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function confirm(Request $request, VehicleHandover $handover): JsonResponse
    {
        abort_unless(Gate::forUser($request->user())->allows('view', $handover->repairOrder), 404);
        $data = $request->validate(['comment' => ['nullable', 'string', 'max:1000']]);

        return response()->json($this->confirmations->confirmHandoverViaAccount($handover, $request, $data['comment'] ?? null));
    }
}
