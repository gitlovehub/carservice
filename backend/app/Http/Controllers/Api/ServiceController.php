<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        return response()->json($query->orderBy('category')->orderBy('name')->get());
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

    /** Route công khai: đọc token Sanctum nếu có để biết người gọi là nhân viên. */
    private function isStaff(Request $request): bool
    {
        return in_array($request->user('sanctum')?->role, [Account::ROLE_ADMIN, Account::ROLE_ADVISOR, Account::ROLE_TECHNICIAN], true);
    }
}
