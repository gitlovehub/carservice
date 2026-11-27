<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\PartRequest;
use App\Models\RepairOrder;
use App\Services\PartRequestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Yêu cầu phụ tùng (P6 + ADV-01 / D-020).
 * - Cố vấn: xem, báo thiếu, hủy yêu cầu chưa đặt hàng.
 * - Admin / kho: xem, đặt hàng (ngày dự kiến về), nhận hàng (nhập kho một lần), hủy.
 */
class PartRequestController extends Controller
{
    public function __construct(private readonly PartRequestService $service) {}

    /** GET /api/part-requests?status=OPEN|REQUESTED|ORDERED|RECEIVED|CANCELLED&overdue=1&repair_order_id=&per_page= */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in([PartRequest::REQUESTED, PartRequest::ORDERED, PartRequest::RECEIVED, PartRequest::CANCELLED, 'OPEN'])],
            'overdue' => ['nullable', 'boolean'],
            'repair_order_id' => ['nullable', 'integer'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $query = PartRequest::query()->with([
            'part:id,sku,name,unit', 'part.inventory:id,part_id,quantity',
            'repairOrder:id,repair_order_code,status,customer_id,vehicle_id,advisor_id',
            'repairOrder.vehicle:id,license_plate', 'repairOrder.advisor:id,full_name',
            'createdBy:id,email', 'createdBy.employee:id,account_id,full_name',
        ])->latest('id');
        if (($data['status'] ?? null) === 'OPEN') {
            $query->whereIn('status', PartRequest::OPEN);
        } elseif (! empty($data['status'])) {
            $query->where('status', $data['status']);
        }
        if ($request->boolean('overdue')) {
            $query->whereIn('status', PartRequest::OPEN)->whereNotNull('eta_date')->whereDate('eta_date', '<', today());
        }
        if (! empty($data['repair_order_id'])) {
            $query->where('repair_order_id', $data['repair_order_id']);
        }

        return response()->json($query->paginate($data['per_page'] ?? 20));
    }

    /** POST /api/repair-orders/{repairOrder}/part-requests — cố vấn báo thiếu phụ tùng. */
    public function store(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorize('update', $repairOrder);
        $data = $request->validate([
            'part_id' => ['required', 'integer', 'exists:parts,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        return response()->json($this->service->report($repairOrder, $data['part_id'], $data['quantity'], $data['note'] ?? null, $request->user()), 201);
    }

    public function order(Request $request, PartRequest $partRequest): JsonResponse
    {
        $this->assertWarehouse($request);
        $data = $request->validate([
            'eta_date' => ['required', 'date', 'after_or_equal:today'],
            'supplier_note' => ['nullable', 'string', 'max:1000'],
        ]);

        return response()->json($this->service->order($partRequest, $data['eta_date'], $data['supplier_note'] ?? null));
    }

    public function receive(Request $request, PartRequest $partRequest): JsonResponse
    {
        $this->assertWarehouse($request);
        $data = $request->validate(['already_in_stock' => ['sometimes', 'boolean']]);

        return response()->json($this->service->receive($partRequest, (bool) ($data['already_in_stock'] ?? false)));
    }

    public function cancel(Request $request, PartRequest $partRequest): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:1000']]);
        // Cố vấn chỉ rút lại báo thiếu khi kho chưa đặt hàng; đã đặt thì Admin quyết định.
        abort_if(
            $request->user()->role !== Account::ROLE_ADMIN && $partRequest->status === PartRequest::ORDERED,
            403, 'Kho đã đặt hàng phụ tùng này. Liên hệ quản trị viên để hủy.'
        );

        return response()->json($this->service->cancel($partRequest, $data['reason']));
    }

    /** D-020: đặt hàng và nhận hàng là việc của Admin / kho. */
    private function assertWarehouse(Request $request): void
    {
        abort_unless($request->user()->role === Account::ROLE_ADMIN, 403, 'Chỉ quản trị viên / kho được đặt hàng và nhận phụ tùng.');
    }
}
