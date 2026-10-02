<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RepairOrder;
use App\Models\TechnicianProfile;
use App\Services\RepairOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InspectionController extends Controller
{
    public function __construct(private readonly RepairOrderService $service) {}

    public function store(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $data = $request->validate([
            'condition_description' => ['nullable', 'string'],
            'diagnosis' => ['nullable', 'string'],
            'items' => ['array'],
            'items.*.item_name' => ['required_with:items', 'string'],
            'items.*.condition_status' => ['nullable', 'string', 'in:NORMAL,WARNING,NEEDS_SERVICE,NEEDS_REPLACEMENT'],
            'items.*.condition_description' => ['nullable', 'string'],
            'items.*.note' => ['nullable', 'string'],
            'recommendations' => ['array'],
            'recommendations.*.item_type' => ['required_with:recommendations', 'string', 'in:SERVICE,PART'],
            'recommendations.*.service_id' => ['nullable', 'integer', 'exists:services,id'],
            'recommendations.*.part_id' => ['nullable', 'integer', 'exists:parts,id'],
            'recommendations.*.quantity' => ['nullable', 'integer', 'min:1'],
            'recommendations.*.note' => ['nullable', 'string'],
        ]);

        // KTV thực hiện kiểm tra là chính tài khoản KTV đang đăng nhập.
        $technician = TechnicianProfile::where('employee_id', $request->user()->employee?->id)->firstOrFail();

        $inspection = $this->service->recordInspection($repairOrder, $technician, $data);

        return response()->json($inspection, 201);
    }
}
