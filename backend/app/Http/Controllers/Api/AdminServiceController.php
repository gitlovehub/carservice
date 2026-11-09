<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AppliesSort;
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
    use AppliesSort;

    /** Thông báo lỗi tiếng Việt cho form thêm / sửa dịch vụ. */
    private const MESSAGES = [
        'name.required' => 'Nhập tên dịch vụ.',
        'name.unique' => 'Đã có dịch vụ khác cùng tên. Hãy đặt tên khác.',
        'name.max' => 'Tên dịch vụ tối đa 150 ký tự.',
        'base_price.required' => 'Nhập giá cơ bản.',
        'base_price.min' => 'Giá cơ bản không được âm.',
        'estimated_minutes.min' => 'Thời gian ước tính phải lớn hơn 0 phút.',
        'category_id.exists' => 'Danh mục không tồn tại.',
    ];

    /**
     * GET /api/admin/services
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['ACTIVE', 'INACTIVE'])],
            'category' => ['nullable', 'string', 'max:100'],
            'category_id' => ['nullable', 'integer'],
            'uncategorized' => ['nullable', 'boolean'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $query = Service::query()
            ->with('serviceCategory:id,name,icon')
            ->withCount([
                'packages as active_packages_count' => fn ($query) => $query->where('maintenance_packages.status', 'ACTIVE'),
            ])
            ->when($filters['status'] ?? null, fn ($q, string $status) => $q->where('status', $status))
            ->when($filters['category'] ?? null, fn ($q, string $category) => $q->where('category', $category))
            ->when($filters['category_id'] ?? null, fn ($q, int $id) => $q->where('category_id', $id))
            ->when($filters['uncategorized'] ?? false, fn ($q) => $q->whereNull('category_id'))
            ->when($filters['search'] ?? null, fn ($q, string $s) => $q->where(fn ($q) => $q->where('name', 'like', "%{$s}%")->orWhere('description', 'like', "%{$s}%")));

        // Mặc định mới tạo lên đầu; `sort=order` = thứ tự hiển thị admin đặt (thứ tự khách thấy khi đặt lịch).
        $this->applySort($query, $request, [
            'created' => 'created_at', 'order' => 'sort_order', 'name' => 'name', 'category' => 'category',
            'price' => 'base_price', 'minutes' => 'estimated_minutes',
            'status' => 'status', 'visible' => 'is_visible',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách dịch vụ thành công.',
            'data' => $query->paginate($filters['per_page'] ?? 10),
        ]);
    }

    /**
     * PUT /api/admin/services/reorder — kéo thả đổi thứ tự. Nhận id theo thứ tự mới của các dòng đang hiển thị;
     * các dòng này giữ đúng những vị trí chúng đang chiếm trong toàn danh sách, dịch vụ khác không bị xê dịch.
     */
    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', 'distinct', 'exists:services,id'],
        ]);

        DB::transaction(function () use ($data): void {
            $all = Service::query()->orderBy('sort_order')->orderBy('id')->lockForUpdate()->pluck('id')->all();
            $moved = array_map('intval', $data['ids']);
            $slots = array_keys(array_intersect($all, $moved)); // vị trí đang chiếm, tăng dần
            foreach ($slots as $i => $slot) {
                $all[$slot] = $moved[$i];
            }
            foreach ($all as $position => $id) {
                Service::query()->whereKey($id)->update(['sort_order' => $position + 1]);
            }
        });

        return response()->json(['success' => true, 'message' => 'Đã lưu thứ tự hiển thị dịch vụ.']);
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
            'category_id' => ['nullable', 'integer', 'exists:service_categories,id'],
            'description' => ['nullable', 'string'],
            'base_price' => ['required', 'numeric', 'min:0'],
            'estimated_minutes' => ['nullable', 'integer', 'min:1'],
            'status' => ['sometimes', 'required', Rule::in(['ACTIVE', 'INACTIVE'])],
            'is_visible' => ['sometimes', 'boolean'],
            'is_popular' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'service_level' => ['sometimes', Rule::in(Service::LEVELS)],
            'requires_vehicle_stay' => ['sometimes', 'boolean'],
        ], self::MESSAGES);

        $validated['status'] ??= 'ACTIVE';
        $service = Service::query()->create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Thêm dịch vụ thành công.',
            'data' => $service->load('serviceCategory:id,name,icon'),
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
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:service_categories,id'],
            'description' => ['sometimes', 'nullable', 'string'],
            'base_price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'estimated_minutes' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'status' => ['sometimes', 'required', Rule::in(['ACTIVE', 'INACTIVE'])],
            'is_visible' => ['sometimes', 'boolean'],
            'is_popular' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'service_level' => ['sometimes', Rule::in(Service::LEVELS)],
            'requires_vehicle_stay' => ['sometimes', 'boolean'],
        ], self::MESSAGES);

        $service->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật dịch vụ thành công.',
            'data' => $service->fresh('serviceCategory:id,name,icon'),
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
