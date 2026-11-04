<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RepairOrder;
use App\Models\WorkItem;
use App\Services\RepairOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkItemController extends Controller
{
    public function __construct(private readonly RepairOrderService $service) {}

    public function index(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('view', $repairOrder);

        return response()->json(
            $repairOrder->workItems()->with(['technician.employee', 'usedParts.part'])->get()
        );
    }

    public function updateStatus(Request $request, WorkItem $workItem): JsonResponse
    {
        $this->authorize('update', $workItem);

        $data = $request->validate([
            'status' => ['required', 'string', 'in:PENDING,IN_PROGRESS,COMPLETED,CANCELLED'],
        ]);

        $item = $this->service->updateWorkItemStatus($workItem, $data['status']);

        return response()->json($item);
    }

    public function storeUsedPart(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('update', $repairOrder);

        $data = $request->validate([
            'work_item_id' => ['nullable', 'integer', 'exists:work_items,id'],
            'part_id' => ['required', 'integer', 'exists:parts,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $usedPart = $this->service->recordUsedPart($repairOrder, $data);

        return response()->json($usedPart, 201);
    }
}
