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
    /** Báo giá khách được xem (nháp / đã hủy nội bộ thì không). */
    private const CUSTOMER_VISIBLE_QUOTATIONS = [Quotation::SENT, Quotation::APPROVED, Quotation::PARTIALLY_APPROVED, Quotation::REJECTED];

    public function __construct(private readonly RepairOrderService $service) {}

    public function index(Request $request): JsonResponse
    {
        $customerId = $this->customerId($request);

        $query = RepairOrder::query()
            ->where('customer_id', $customerId)
            ->with(['vehicle.model.brand', 'invoice'])
            ->latest('received_at');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // ?include=billing: kèm báo giá đã gửi khách + hóa đơn + thanh toán trong CÙNG một request,
        // để trang Báo giá / Hóa đơn / Thanh toán không phải gọi chi tiết từng phiếu (N+1 request).
        if ($request->query('include') === 'billing') {
            $query->with([
                'quotations' => fn ($q) => $q->whereIn('status', self::CUSTOMER_VISIBLE_QUOTATIONS),
                'quotations.items',
                'invoice.items',
                'invoice.payments',
            ]);
        }

        // Mặc định 20 phiếu/trang như cũ; trang Báo giá / Hóa đơn xin tối đa 100 để không sót chứng từ cũ.
        return response()->json($query->paginate(min(100, max(1, (int) $request->query('per_page', 20)))));
    }

    public function show(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorizeCustomerResource($request, 'own', $repairOrder);

        $repairOrder->load([
            'vehicle.model.brand',
            'statusHistory',
            'quotations' => fn ($query) => $query->whereIn('status', self::CUSTOMER_VISIBLE_QUOTATIONS),
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
            // Màn "Chi tiết lịch sử dịch vụ" của khách: chỉ tên người phụ trách (không lộ SĐT/tài khoản nhân viên),
            // phụ tùng đã dùng và dịch vụ/gói khách đã đặt trong lịch hẹn.
            'advisor:id,full_name',
            'workItems.service:id,name,status',
            'workItems.technician:id,employee_id',
            'workItems.technician.employee:id,full_name',
            'usedParts:id,repair_order_id,work_item_id,part_id,quantity,unit_price,used_at',
            'usedParts.part:id,name,unit',
            'appointment:id,appointment_code,request_type,symptom_description',
            'appointment.services:id,name',
            'appointment.packages:id,name',
        ]);

        return response()->json($repairOrder);
    }

    public function invoice(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $this->authorizeCustomerResource($request, 'own', $repairOrder);

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
