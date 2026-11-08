<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Quản trị danh mục dịch vụ. Xóa dịch vụ bằng cách chuyển status sang INACTIVE
 * để giữ nguyên các tham chiếu từ dữ liệu lịch sử.
 */
class AdminServiceController extends Controller
{
    /**
     * GET /api/admin/services
     */
    public function index(Request $request): JsonResponse
    {
        $query = Service::query()->withCount([
            'packages as active_packages_count' => fn ($query) => $query->where('maintenance_packages.status', 'ACTIVE'),
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->input('search').'%');
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách dịch vụ thành công.',
            'data' => $query->latest('id')->paginate(10),
        ]);
    }

    /**
     * GET /api/admin/services/{service}
     */
    public function show(Service $service): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin dịch vụ thành công.',
            'data' => $service,
        ]);
    }

    /**
     * POST /api/admin/services
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150', Rule::unique('services', 'name')],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'estimated_minutes' => ['nullable', 'integer', 'min:1'],
            'status' => ['sometimes', 'required', Rule::in(['ACTIVE', 'INACTIVE'])],
            'is_popular' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'service_level' => ['sometimes', Rule::in(Service::LEVELS)],
            'requires_vehicle_stay' => ['sometimes', 'boolean'],
        ]);

        $validated['status'] ??= 'ACTIVE';
        $service = Service::query()->create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Thêm dịch vụ thành công.',
            'data' => $service,
        ], 201);
    }

    /**
     * PUT/PATCH /api/admin/services/{service}
     */
    public function update(Request $request, Service $service): JsonResponse
    {
        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:150',
                Rule::unique('services', 'name')->ignore($service->id),
            ],
            'category' => ['sometimes', 'nullable', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],
            'base_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'estimated_minutes' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'status' => ['sometimes', 'required', Rule::in(['ACTIVE', 'INACTIVE'])],
            'is_popular' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'service_level' => ['sometimes', Rule::in(Service::LEVELS)],
            'requires_vehicle_stay' => ['sometimes', 'boolean'],
        ]);

        $service->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật dịch vụ thành công.',
            'data' => $service->fresh(),
        ]);
    }

    /** GET /api/admin/services/{service}/steps — bước chuẩn + phút chuẩn (P5). */
    public function steps(Service $service): JsonResponse
    {
        return response()->json(['data' => $service->steps()->get()]);
    }

    /**
     * PUT /api/admin/services/{service}/steps — thay toàn bộ danh sách bước (theo thứ tự gửi lên).
     * Chỉ ảnh hưởng công việc tạo sau đó; công việc cũ giữ nguyên (service_step_id null khi bước bị xóa).
     */
    public function syncSteps(Request $request, Service $service): JsonResponse
    {
        $data = $request->validate([
            'steps' => ['present', 'array', 'max:30'],
            'steps.*.name' => ['required', 'string', 'max:150'],
            'steps.*.standard_minutes' => ['required', 'integer', 'min:0', 'max:1440'],
            'steps.*.requires_photo' => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($service, $data): void {
            $service->steps()->delete();
            foreach (array_values($data['steps']) as $index => $step) {
                $service->steps()->create([
                    'step_order' => $index + 1,
                    'name' => $step['name'],
                    'standard_minutes' => $step['standard_minutes'],
                    'requires_photo' => $step['requires_photo'] ?? false,
                ]);
            }
            // Phút chuẩn của dịch vụ = tổng các bước (khi có bước).
            if ($data['steps']) {
                $service->update(['estimated_minutes' => max(1, array_sum(array_column($data['steps'], 'standard_minutes')))]);
            }
        });

        return response()->json(['data' => $service->steps()->get(), 'service' => $service->fresh()]);
    }

    /**
     * DELETE /api/admin/services/{service} — soft delete.
     */
    public function destroy(Service $service): JsonResponse
    {
        $service->update(['status' => 'INACTIVE']);

        return response()->json([
            'success' => true,
            'message' => 'Đã ẩn dịch vụ (xóa mềm, status = INACTIVE).',
            'data' => $service->fresh(),
        ]);
    }
}
