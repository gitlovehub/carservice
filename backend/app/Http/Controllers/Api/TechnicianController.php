<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Assignment;
use App\Models\TechnicianProfile;
use Illuminate\Http\JsonResponse;

class TechnicianController extends Controller
{
    /**
     * GET /api/technicians
     * Danh sách KTV đang hoạt động để Cố vấn chọn khi giao việc, kèm số phiếu đang xử lý.
     */
    public function index(): JsonResponse
    {
        $technicians = TechnicianProfile::query()
            ->whereHas('employee.account', fn ($query) => $query
                ->where('role', Account::ROLE_TECHNICIAN)
                ->where('status', Account::STATUS_ACTIVE))
            ->with('employee:id,full_name,phone')
            ->withCount(['assignments as active_assignments_count' => fn ($query) => $query
                ->whereIn('status', [Assignment::ASSIGNED, Assignment::IN_PROGRESS])])
            ->orderByDesc('is_available')
            ->orderBy('active_assignments_count')
            ->get();

        return response()->json($technicians);
    }
}
