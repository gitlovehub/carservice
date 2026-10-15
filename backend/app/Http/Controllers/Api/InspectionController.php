<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInspectionRecommendationRequest;
use App\Http\Requests\StoreInspectionRequest;
use App\Models\RepairOrder;
use App\Models\TechnicianProfile;
use App\Services\RepairOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InspectionController extends Controller
{
    public function __construct(private readonly RepairOrderService $service) {}

    /**
     * POST /api/repair-orders/{repairOrder}/inspections
     * Kỹ thuật viên bắt đầu tạo phiếu chẩn đoán và lưu kết quả các hạng mục kiểm tra ban đầu.
     */
    public function store(StoreInspectionRequest $request, RepairOrder $repairOrder): JsonResponse
    {
        $technician = TechnicianProfile::where('employee_id', $request->user()->employee?->id)->first();

        if (! $technician) {
            return response()->json([
                'message' => 'Tài khoản không gắn với hồ sơ Kỹ thuật viên hợp lệ.',
            ], 403);
        }

        if ($repairOrder->inspections()->exists()) {
            return response()->json([
                'message' => 'Mỗi lệnh sửa chữa chỉ thuộc về 1 phiếu kiểm tra tổng thể.',
            ], 422);
        }

        $inspection = $this->service->recordInspection($repairOrder, $technician, $request->validated());

        return response()->json($inspection, 201);
    }

    /**
     * GET /api/repair-orders/{repairOrder}/inspections
     * Xem phiếu chẩn đoán chi tiết của lệnh sửa chữa (kèm các item đánh giá và đề xuất phụ tùng/dịch vụ).
     */
    public function show(RepairOrder $repairOrder): JsonResponse
    {
        $inspection = $repairOrder->inspections()
            ->with(['items', 'recommendations.service', 'recommendations.part', 'technician.employee'])
            ->first();

        if (! $inspection) {
            return response()->json([
                'message' => 'Lệnh sửa chữa này chưa có phiếu kiểm tra/chẩn đoán.',
            ], 404);
        }

        return response()->json($inspection);
    }

    /**
     * POST /api/repair-orders/{repairOrder}/inspections/recommendations
     * Thêm đề xuất dịch vụ lẻ / phụ tùng cần làm vào phiếu chẩn đoán.
     */
    public function addRecommendation(StoreInspectionRecommendationRequest $request, RepairOrder $repairOrder): JsonResponse
    {
        $inspection = $repairOrder->inspections()->latest()->first();

        if (! $inspection) {
            return response()->json([
                'message' => 'Lệnh sửa chữa này chưa có phiếu kiểm tra để thêm đề xuất.',
            ], 422);
        }

        $data = $request->validated();

        if (! empty($data['recommendations']) && is_array($data['recommendations'])) {
            $created = [];
            foreach ($data['recommendations'] as $rec) {
                $created[] = $this->service->addInspectionRecommendation($inspection, $rec);
            }

            return response()->json($created, 201);
        }

        $recommendation = $this->service->addInspectionRecommendation($inspection, $data);

        return response()->json($recommendation, 201);
    }

    /**
     * POST /api/repair-orders/{repairOrder}/inspections/complete
     * Kỹ thuật viên hoàn tất chẩn đoán, tự động cập nhật trạng thái Lệnh sửa chữa repair_orders từ INSPECTING sang QUOTING.
     */
    public function complete(Request $request, RepairOrder $repairOrder): JsonResponse
    {
        $inspection = $repairOrder->inspections()->latest()->first();

        if (! $inspection) {
            return response()->json([
                'message' => 'Lệnh sửa chữa này chưa có phiếu kiểm tra để hoàn tất.',
            ], 422);
        }

        $completedInspection = $this->service->completeInspection($repairOrder, $request->user());

        return response()->json($completedInspection);
    }
}
