<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AppliesSort;
use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

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
                'steps',
                'packages as active_packages_count' => fn ($query) => $query->where('maintenance_packages.status', 'ACTIVE'),
            ])
            ->when($filters['status'] ?? null, fn ($q, string $status) => $q->where('status', $status))
            ->when($filters['category'] ?? null, fn ($q, string $category) => $q->where('category', $category))
            ->when($filters['category_id'] ?? null, fn ($q, int $id) => $q->where('category_id', $id))
            ->when($filters['uncategorized'] ?? false, fn ($q) => $q->whereNull('category_id'))
            ->when($filters['search'] ?? null, fn ($q, string $s) => $q->where(fn ($q) => $q->where('name', 'like', "%{$s}%")->orWhere('description', 'like', "%{$s}%")));

        // Mặc định mới tạo lên đầu (D-018: không còn đổi thứ tự thủ công).
        $this->applySort($query, $request, [
            'created' => 'created_at', 'name' => 'name', 'category' => 'category',
            'price' => 'base_price', 'minutes' => 'estimated_minutes',
            'status' => 'status', 'visible' => 'is_visible',
        ]);

        $services = $query->withExists(Service::USAGE_RELATIONS)->paginate($filters['per_page'] ?? 10);
        $usageColumns = array_map(fn (string $relation): string => Str::snake($relation).'_exists', Service::USAGE_RELATIONS);
        $services->getCollection()->each(function (Service $service) use ($usageColumns): void {
            $service->setAttribute('is_in_use', collect($usageColumns)->contains(fn (string $column): bool => (bool) $service->getAttribute($column)));
            $service->makeHidden($usageColumns);
        });

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách dịch vụ thành công.',
            'data' => $services,
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

        $service = new Service;
        $service->fill($validated);
        $validated['status'] ??= $service->activationProblems() === [] ? 'ACTIVE' : 'INACTIVE';
        $validated['is_visible'] ??= false;
        $validated = $this->applyLifecycle($service, $validated);
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

        $service->update($this->applyLifecycle($service, $validated));

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật dịch vụ thành công.',
            'data' => $service->fresh('serviceCategory:id,name,icon'),
        ]);
    }

    /**
     * Thứ tự trạng thái: đủ thông tin → Đang áp dụng → Hiển thị cho khách.
     * Bỏ danh mục hoặc tắt Đang áp dụng sẽ tắt luôn các trạng thái phụ thuộc.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     *
     * @throws ValidationException
     */
    private function applyLifecycle(Service $service, array $validated): array
    {
        $wasActive = $service->exists && $service->getOriginal('status') === 'ACTIVE';
        $service->fill($validated);

        if ($service->exists && $service->isDirty('estimated_minutes') && $service->steps()->exists()) {
            throw ValidationException::withMessages(['estimated_minutes' => 'Dịch vụ có bước chuẩn nên thời gian được tính từ tổng các bước.']);
        }

        if ($wasActive && ! $service->hasCategory()) {
            return [...$validated, 'status' => 'INACTIVE', 'is_visible' => false];
        }

        if ($service->status !== 'ACTIVE') {
            if (($validated['is_visible'] ?? false) === true) {
                throw ValidationException::withMessages(['is_visible' => 'Bật Đang áp dụng trước khi hiển thị cho khách.']);
            }

            return [...$validated, 'is_visible' => false];
        }

        if (! $wasActive && ($problems = $service->activationProblems()) !== []) {
            throw ValidationException::withMessages(['status' => 'Cần bổ sung '.implode(', ', $problems).' trước khi bật Đang áp dụng.']);
        }
        if ($wasActive && $service->isDirty('base_price') && (float) $service->base_price <= 0) {
            throw ValidationException::withMessages(['base_price' => 'Dịch vụ đang áp dụng phải có giá lớn hơn 0.']);
        }
        if ($wasActive && $service->isDirty('estimated_minutes') && (int) $service->estimated_minutes <= 0) {
            throw ValidationException::withMessages(['estimated_minutes' => 'Dịch vụ đang áp dụng phải có thời gian ước tính.']);
        }

        return $validated;
    }

    /**
     * POST /api/admin/services/{service}/image — tải ảnh minh họa dịch vụ (thay ảnh cũ nếu có).
     * Laravel kiểm tra định dạng + dung lượng, tự đặt tên file, lưu trên disk public.
     */
    public function uploadImage(Request $request, Service $service): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ], [
            'image.required' => 'Chọn ảnh dịch vụ.',
            'image.mimes' => 'Chỉ nhận ảnh JPG, PNG hoặc WebP.',
            'image.max' => 'Ảnh không được vượt quá 4 MB.',
        ]);

        $previous = $service->image_path;
        $path = $request->file('image')->store(Service::IMAGE_DIRECTORY, 'public');
        try {
            $service->update(['image_path' => $path]);
        } catch (\Throwable $error) {
            Storage::disk('public')->delete($path);
            throw $error;
        }
        $this->deleteStoredImage($previous);

        return response()->json([
            'success' => true,
            'message' => 'Đã lưu ảnh dịch vụ.',
            'data' => $service->fresh('serviceCategory:id,name,icon'),
        ]);
    }

    /** DELETE /api/admin/services/{service}/image — gỡ ảnh, trang Dịch vụ quay về khung xám "Chưa có ảnh". */
    public function deleteImage(Service $service): JsonResponse
    {
        $previous = $service->image_path;
        $service->update(['image_path' => null]);
        $this->deleteStoredImage($previous);

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa ảnh dịch vụ.',
            'data' => $service->fresh('serviceCategory:id,name,icon'),
        ]);
    }

    /** Chỉ xóa file nằm trong thư mục ảnh dịch vụ (không đụng file khác trên disk). */
    private function deleteStoredImage(?string $path): void
    {
        if ($path && str_starts_with($path, Service::IMAGE_DIRECTORY.'/')) {
            Storage::disk('public')->delete($path);
        }
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
            'steps.*.name' => ['required', 'string', 'max:150', 'distinct:ignore_case'],
            'steps.*.standard_minutes' => ['required', 'integer', 'min:1', 'max:1440'],
            'steps.*.requires_photo' => ['sometimes', 'boolean'],
        ], [
            'steps.*.name.required' => 'Nhập tên bước.',
            'steps.*.name.distinct' => 'Tên bước bị trùng.',
            'steps.*.standard_minutes.min' => 'Phút chuẩn phải từ 1 đến 1440.',
            'steps.*.standard_minutes.max' => 'Phút chuẩn phải từ 1 đến 1440.',
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
        $service->update(['status' => 'INACTIVE', 'is_visible' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Đã ẩn dịch vụ (xóa mềm, status = INACTIVE).',
            'data' => $service->fresh(),
        ]);
    }

    /**
     * DELETE /api/admin/services/{service}/permanent — xóa hẳn dịch vụ đã ngừng và chưa từng được dùng.
     * Khóa ngoại vẫn là chốt cuối nếu dịch vụ vừa được dùng ngay sau bước kiểm tra.
     */
    public function destroyPermanently(Service $service): JsonResponse
    {
        if ($service->status === 'ACTIVE' || $service->is_visible) {
            return response()->json(['success' => false, 'message' => 'Hãy tắt cả Đang áp dụng và Hiển thị cho khách trước khi xóa vĩnh viễn.'], 422);
        }

        $inUseMessage = 'Dịch vụ đã có trong lịch sử nên không thể xóa vĩnh viễn. Dịch vụ vẫn được giữ ở trạng thái ngừng hoạt động.';
        if ($service->isInUse()) {
            return response()->json(['success' => false, 'message' => $inUseMessage], 409);
        }

        $imagePath = $service->image_path;
        try {
            $service->delete();
        } catch (QueryException $error) {
            if ((string) $error->getCode() !== '23000') {
                throw $error;
            }

            return response()->json(['success' => false, 'message' => $inUseMessage], 409);
        }
        $this->deleteStoredImage($imagePath);

        return response()->json(['success' => true, 'message' => 'Đã xóa vĩnh viễn dịch vụ.']);
    }
}
