<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\WorkItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ServiceController extends Controller
{
    /**
     * GET /api/services
     */
    public function index(Request $request): JsonResponse
    {
        // Dịch vụ đang áp dụng. Khách / khách vãng lai chỉ thấy dịch vụ admin bật "Hiển thị";
        // nhân viên (báo giá, phát sinh) vẫn thấy cả dịch vụ ẩn khỏi trang đặt lịch.
        $query = Service::query()->where('status', 'ACTIVE')
            ->when(! $this->isStaff($request), fn ($q) => $q->where('is_visible', true));

        // "Tất cả" là nhãn giao diện — coi như không lọc để FE cũ vẫn chạy.
        if ($request->filled('category') && $request->category !== 'Tất cả') {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $query->where('name', 'like', '%'.$request->search.'%');
        }

        // CL-01 / D-018: "Phổ biến" = số lần dịch vụ được thực hiện thật (công việc trên phiếu, trừ công việc đã hủy).
        // Chỉ trả thứ hạng (popularity_rank, 1 = dùng nhiều nhất; null = chưa ai dùng) — không lộ số lượng thật ra ngoài.
        $services = $query
            ->withCount(['workItems as usage_count' => fn ($q) => $q->where('status', '!=', WorkItem::CANCELLED)])
            ->orderBy('category')->orderBy('name')
            ->get();

        $rankByUsage = $services->pluck('usage_count')->filter()->unique()->sortDesc()->values()->flip();
        $services->each(function (Service $service) use ($rankByUsage): void {
            $service->setAttribute('popularity_rank', $service->usage_count > 0 ? $rankByUsage[$service->usage_count] + 1 : null);
            $service->makeHidden('usage_count');
        });

        return response()->json($services);
    }

    /**
     * GET /api/services/{service}
     */
    public function show(Request $request, Service $service): JsonResponse
    {
        // Dịch vụ đã ẩn không được lộ ra phía khách.
        abort_if($service->status !== 'ACTIVE' || (! $service->is_visible && ! $this->isStaff($request)), 404);

        return response()->json($service);
    }

    /**
     * GET /api/service-categories — danh mục (tên + icon admin chọn) cho cột trái trang Dịch vụ.
     * Chỉ trả danh mục còn ít nhất một dịch vụ đang áp dụng và được hiển thị cho khách.
     */
    public function categories(): JsonResponse
    {
        $visible = fn ($q) => $q->where('status', 'ACTIVE')->where('is_visible', true);

        $categories = ServiceCategory::query()
            ->whereHas('services', $visible)
            ->withCount(['services' => $visible])
            ->orderBy('sort_order')->orderBy('name')
            ->get(['id', 'name', 'icon', 'sort_order']);

        return response()->json(['data' => $categories->map(fn (ServiceCategory $c) => [
            'id' => $c->id, 'name' => $c->name, 'icon' => $c->icon, 'services_count' => $c->services_count,
        ])->values()]);
    }

    /**
     * GET /api/service-images/{service} — phát ảnh dịch vụ admin đã tải (không cần storage:link).
     * Dịch vụ chưa có ảnh → 404, trang Dịch vụ hiện khung xám "Chưa có ảnh".
     */
    public function image(Service $service): StreamedResponse
    {
        $path = $service->image_path;
        abort_unless($path && str_starts_with($path, Service::IMAGE_DIRECTORY.'/'), 404);
        $disk = Storage::disk('public');
        abort_unless($disk->exists($path), 404);

        return $disk->response($path, null, [
            'Content-Type' => $disk->mimeType($path) ?: 'image/jpeg',
            'Cache-Control' => 'public, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** Route công khai: đọc token Sanctum nếu có để biết người gọi là nhân viên. */
    private function isStaff(Request $request): bool
    {
        return in_array($request->user('sanctum')?->role, [Account::ROLE_ADMIN, Account::ROLE_ADVISOR, Account::ROLE_TECHNICIAN], true);
    }
}
