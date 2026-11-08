<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\VehicleHandover;
use App\Services\ConfirmationService;
use App\Services\RepairOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class CustomerRepairOrderController extends Controller
{
    public function __construct(private readonly RepairOrderService $service) {}

    public function index(Request $request): JsonResponse
    {
        $customerId = $this->customerId($request);

        $query = RepairOrder::query()
            ->where('customer_id', $customerId)
            ->with(['vehicle.model.brand'])
            ->latest('received_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->paginate(20));
    }

    public function show(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorizeCustomerResource($request, 'view', $repairOrder);

        $repairOrder->load([
            'vehicle.model.brand',
            'statusHistory',
            'quotations' => fn ($query) => $query->whereIn('status', [
                Quotation::SENT,
                Quotation::APPROVED,
                Quotation::PARTIALLY_APPROVED,
                Quotation::REJECTED,
            ]),
            'quotations.items',
            'workItems',
            'invoice.items',
            'invoice.payments',
            // P3: kết quả chẩn đoán cho khách — chỉ cột công khai, không có ghi chú nội bộ (inspection_items.note).
            'inspections:id,repair_order_id,condition_description,diagnosis,inspected_at',
            'inspections.items:id,inspection_id,item_name,condition_status,condition_description',
            'inspections.recommendations:id,inspection_id,item_type,service_id,part_id,quantity',
            'inspections.recommendations.service:id,name',
            'inspections.recommendations.part:id,name',
            // P6: phụ tùng đang chờ + ngày dự kiến về (không lộ ghi chú nhà cung cấp).
            'partRequests:id,repair_order_id,part_id,quantity,status,eta_date,received_at',
            'partRequests.part:id,name,unit',
            // Biên bản giao nhận đã gửi khách (không lộ bản nháp).
            'handovers' => fn ($query) => $query->whereIn('status', [VehicleHandover::STATUS_SUBMITTED, VehicleHandover::STATUS_CONFIRMED]),
            'handovers.checklistItems',
            'handovers.confirmations',
        ]);

        return response()->json($repairOrder);
    }

    public function invoice(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorizeCustomerResource($request, 'view', $repairOrder);

        return response()->json($repairOrder->invoice()->with('items', 'payments')->firstOrFail());
    }

    public function respondQuotation(Request $request, Quotation $quotation, ConfirmationService $confirmations): JsonResponse
    {
        $this->authorizeCustomerResource($request, 'respond', $quotation);

        $data = $request->validate([
            'responses' => ['required', 'array', 'min:1'],
            'responses.*.item_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('quotation_items', 'id')
                    ->where(fn ($query) => $query->where('quotation_id', $quotation->id)),
            ],
            'responses.*.is_approved' => ['required', 'boolean'],
        ]);

        // Logic duyệt giữ nguyên (RepairOrderService::recordCustomerResponse); thêm bằng chứng ACCOUNT.
        return response()->json($confirmations->respondViaAccount($quotation, $data['responses'], $request));
    }

    private function customerId(Request $request): int
    {
        $customerId = Customer::query()
            ->where('account_id', $request->user()->id)
            ->value('id');

        abort_if($customerId === null, 404);

        return (int) $customerId;
    }

    private function authorizeCustomerResource(
        Request $request,
        string $ability,
        mixed $resource
    ): void {
        abort_unless(
            Gate::forUser($request->user())->allows($ability, $resource),
            404
        );
    }
}
