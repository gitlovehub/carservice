<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\ServiceCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Danh mục dịch vụ: cột trái trang Dịch vụ (tên, icon, số dịch vụ), thêm / sửa / xoá danh mục rỗng. */
class AdminServiceCategoryController extends Controller
{
    /** GET /api/admin/service-categories */
    public function index(): JsonResponse
    {
        $categories = ServiceCategory::query()
            ->withCount([
                'services',
                'services as active_services_count' => fn ($q) => $q->where('status', 'ACTIVE'),
            ])
            ->orderBy('sort_order')->orderBy('name')
            ->get(['id', 'name', 'icon', 'sort_order']);

        return response()->json([
            'data' => $categories,
            'meta' => [
                'total' => Service::query()->count(),
                'uncategorized' => Service::query()->whereNull('category_id')->count(),
                'icons' => ServiceCategory::ICONS,
            ],
        ]);
    }

    /** POST /api/admin/service-categories */
    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $category = ServiceCategory::query()->create([
            ...$data,
            'sort_order' => (int) ServiceCategory::query()->max('sort_order') + 1,
        ]);

        return response()->json(['message' => "Đã thêm danh mục “{$category->name}”.", 'data' => $category], 201);
    }

    /** PATCH /api/admin/service-categories/{category} — đổi tên kéo theo chuỗi category của các dịch vụ. */
    public function update(Request $request, ServiceCategory $category): JsonResponse
    {
        $data = $this->validated($request, $category);
        DB::transaction(function () use ($category, $data): void {
            $category->update($data);
            Service::query()->where('category_id', $category->id)->update(['category' => $category->name]);
        });

        return response()->json(['message' => "Đã cập nhật danh mục “{$category->name}”.", 'data' => $category->fresh()]);
    }

    /** DELETE /api/admin/service-categories/{category} — chỉ xoá danh mục chưa có dịch vụ. */
    public function destroy(ServiceCategory $category): JsonResponse
    {
        $count = $category->services()->count();
        if ($count > 0) {
            throw ValidationException::withMessages([
                'category' => "Danh mục “{$category->name}” còn {$count} dịch vụ. Chuyển các dịch vụ sang danh mục khác trước khi xoá.",
            ]);
        }
        $category->delete();

        return response()->json(['message' => "Đã xoá danh mục “{$category->name}”."]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?ServiceCategory $category = null): array
    {
        $request->merge(['name' => ServiceCategory::normalizeName((string) $request->input('name', ''))]);

        return $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('service_categories', 'name')->ignore($category?->id)],
            'icon' => ['required', Rule::in(ServiceCategory::ICONS)],
        ], [
            'name.required' => 'Vui lòng nhập tên danh mục.',
            'name.unique' => 'Đã có danh mục cùng tên.',
        ]);
    }
}
