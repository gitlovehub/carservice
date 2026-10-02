<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RepairOrder;
use App\Services\RepairOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RepairOrderController extends Controller
{
    public function __construct(private readonly RepairOrderService $service) {}

    public function index(Request $request): JsonResponse
    {
        $query = RepairOrder::query()->with(['customer', 'vehicle', 'advisor']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->latest('received_at')->paginate(20));
    }

    public function show(RepairOrder $repairOrder): JsonResponse
    {
        $repairOrder->load([
            'customer', 'vehicle', 'advisor', 'statusHistory.changedByAccount',
            'assignments.technician.employee', 'inspections.items', 'inspections.recommendations',
            'quotations.items', 'workItems.technician', 'usedParts', 'invoice.payments',
        ]);

        return response()->json($repairOrder);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'appointment_id' => ['nullable', 'integer'],
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
            'mileage_received' => ['nullable', 'integer', 'min:0'],
            'initial_condition' => ['nullable', 'string'],
            'note' => ['nullable', 'string'],
        ]);

        $advisor = $request->user()->employee;

        $ro = $this->service->receive($data, $advisor);

        return response()->json($ro, 201);
    }

    public function assignTechnician(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate([
            'technician_id' => ['required', 'integer', 'exists:technician_profiles,id'],
            'note' => ['nullable', 'string'],
        ]);

        $technician = \App\Models\TechnicianProfile::findOrFail($data['technician_id']);

        $assignment = $this->service->assignTechnician(
            $repairOrder, $technician, $request->user(), $data['note'] ?? null
        );

        return response()->json($assignment, 201);
    }

    public function startRepair(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $ro = $this->service->startRepair($repairOrder, $request->user());

        return response()->json($ro->load('workItems'));
    }

    public function markWaitingForParts(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate(['note' => ['nullable', 'string']]);

        $ro = $this->service->markWaitingForParts($repairOrder, $request->user(), $data['note'] ?? null);

        return response()->json($ro);
    }

    public function resume(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate(['note' => ['nullable', 'string']]);

        $ro = $this->service->resumeFromWaitingForParts($repairOrder, $request->user(), $data['note'] ?? null);

        return response()->json($ro);
    }

    public function review(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate(['note' => ['nullable', 'string']]);

        $this->service->logReviewAndTest($repairOrder, $request->user(), $data['note'] ?? null);

        return response()->json(['message' => 'Đã ghi nhận Review & Test.']);
    }

    public function complete(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate(['note' => ['nullable', 'string']]);

        $ro = $this->service->completeRepairOrder($repairOrder, $request->user(), $data['note'] ?? null);

        return response()->json($ro);
    }

    public function close(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate([
            'close_reason' => ['required', 'string', 'in:'.implode(',', RepairOrder::CLOSE_REASONS)],
            'note' => ['required', 'string'],
        ]);

        $ro = $this->service->closeRepairOrder(
            $repairOrder, $data['close_reason'], $data['note'], $request->user()
        );

        return response()->json($ro);
    }

    public function handOver(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $ro = $this->service->handOver($repairOrder, $request->user());

        return response()->json($ro);
    }
}
