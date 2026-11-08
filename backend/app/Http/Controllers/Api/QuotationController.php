<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Services\RepairOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuotationController extends Controller
{
    public function __construct(private readonly RepairOrderService $service) {}

    public function store(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('create', Quotation::class);
        $this->authorize('update', $repairOrder);

        $data = $request->validate([
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'valid_until' => ['nullable', 'date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_type' => ['required', 'string', 'in:SERVICE,PART'],
            'items.*.service_id' => ['nullable', 'integer', 'exists:services,id', 'required_if:items.*.item_type,SERVICE'],
            'items.*.part_id' => ['nullable', 'integer', 'exists:parts,id', 'required_if:items.*.item_type,PART'],
            'items.*.description' => ['nullable', 'string'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            // P3: SUPPLEMENT = phát sinh khi đang sửa (bắt buộc lý do).
            'type' => ['nullable', 'string', 'in:'.Quotation::TYPE_INITIAL.','.Quotation::TYPE_SUPPLEMENT],
            'reason' => ['nullable', 'string', 'max:1000', 'required_if:type,'.Quotation::TYPE_SUPPLEMENT],
        ]);

        $advisor = $request->user()->employee;

        $quotation = $this->service->createQuotation(
            $repairOrder, $advisor, $data['items'], $data['discount_amount'] ?? 0, $data['valid_until'] ?? null,
            $data['type'] ?? Quotation::TYPE_INITIAL, $data['reason'] ?? null,
        );

        return response()->json($quotation, 201);
    }

    /** P5 — POST /repair-orders/{id}/quick-quotation: báo giá niêm yết cho dịch vụ nhanh (bỏ chẩn đoán). */
    public function quick(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('create', Quotation::class);
        $this->authorize('update', $repairOrder);
        $data = $request->validate([
            'service_ids' => ['required', 'array', 'min:1', 'max:10'],
            'service_ids.*' => ['integer', 'distinct', 'exists:services,id'],
        ]);
        $advisor = $request->user()->employee;
        abort_if($advisor === null, 403);

        return response()->json($this->service->createQuickQuotation($repairOrder, $advisor, $data['service_ids'], $request->user()), 201);
    }

    public function send(Request $request, Quotation $quotation): JsonResponse
    {
        $this->authorize('update', $quotation);

        $quotation = $this->service->sendQuotation($quotation, $request->user());

        return response()->json($quotation);
    }

    // Không có hành động "respond" cho nhân viên: khách tự duyệt qua
    // CustomerRepairOrderController::respondQuotation (POST /me/quotations/{id}/respond).
}
