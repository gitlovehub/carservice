<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PartRequest;
use App\Services\PartRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** P6 — danh sách và xử lý yêu cầu phụ tùng (cố vấn + admin). */
class PartRequestController extends Controller
{
    public function __construct(private readonly PartRequestService $service) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in([PartRequest::REQUESTED, PartRequest::ORDERED, PartRequest::RECEIVED, PartRequest::CANCELLED, 'OPEN'])],
            'overdue' => ['nullable', 'boolean'],
        ]);

        $query = PartRequest::query()->with(['part:id,sku,name,unit', 'repairOrder:id,repair_order_code,status,customer_id'])->latest('id');
        if (($data['status'] ?? null) === 'OPEN') {
            $query->whereIn('status', PartRequest::OPEN);
        } elseif (! empty($data['status'])) {
            $query->where('status', $data['status']);
        }
        if ($request->boolean('overdue')) {
            $query->whereIn('status', PartRequest::OPEN)->whereNotNull('eta_date')->whereDate('eta_date', '<', today());
        }

        return response()->json($query->paginate(20));
    }

    public function order(Request $request, PartRequest $partRequest): JsonResponse
    {
        $data = $request->validate([
            'eta_date' => ['required', 'date', 'after_or_equal:today'],
            'supplier_note' => ['nullable', 'string', 'max:1000'],
        ]);

        return response()->json($this->service->order($partRequest, $data['eta_date'], $data['supplier_note'] ?? null));
    }

    public function receive(PartRequest $partRequest): JsonResponse
    {
        return response()->json($this->service->receive($partRequest));
    }

    public function cancel(Request $request, PartRequest $partRequest): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:1000']]);

        return response()->json($this->service->cancel($partRequest, $data['reason']));
    }
}
