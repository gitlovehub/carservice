<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AppliesDateRange;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\RepairOrder;
use App\Services\AppointmentActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /admin/advisor-activity?date_from=&date_to= — mỗi cố vấn đã tạo / xác nhận / tiếp nhận / đổi / hủy bao nhiêu lịch
 * và lập bao nhiêu phiếu trong kỳ (ngày giờ Việt Nam; không gửi kỳ = toàn bộ); kèm thao tác gần nhất.
 */
class AdminAdvisorActivityController extends Controller
{
    use AppliesDateRange;

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate($this->dateRangeRules($request));

        $counts = $this->applyDateRange(AuditLog::query(), $filters, 'created_at')
            ->where('auditable_type', Appointment::class)
            ->selectRaw('account_id, action, count(*) as total')
            ->groupBy('account_id', 'action')
            ->get()
            ->groupBy('account_id');

        $advisors = Account::query()
            ->whereIn('role', [Account::ROLE_ADVISOR, Account::ROLE_ADMIN])
            ->with('employee:id,account_id,full_name')
            ->orderBy('role')->orderBy('id')
            ->get();

        $rows = $advisors->map(function (Account $account) use ($counts, $filters): array {
            $byAction = ($counts->get($account->id) ?? collect())->pluck('total', 'action');
            $employeeId = $account->employee?->id;

            return [
                'account_id' => $account->id,
                'name' => $account->employee?->full_name ?? $account->email,
                'email' => $account->email,
                'role' => $account->role,
                'status' => $account->status ?? null,
                'created' => (int) ($byAction[AppointmentActivityService::CREATED] ?? 0),
                'confirmed' => (int) ($byAction[AppointmentActivityService::CONFIRMED] ?? 0),
                'checked_in' => (int) ($byAction[AppointmentActivityService::CHECKED_IN] ?? 0),
                'rescheduled' => (int) ($byAction[AppointmentActivityService::RESCHEDULED] ?? 0),
                'cancelled' => (int) ($byAction[AppointmentActivityService::CANCELLED] ?? 0),
                'repair_orders' => $employeeId ? $this->applyDateRange(RepairOrder::query()->where('advisor_id', $employeeId), $filters, 'received_at')->count() : 0,
                'last_action_at' => AuditLog::query()->where('account_id', $account->id)->where('auditable_type', Appointment::class)->max('created_at'),
            ];
        })->filter(fn (array $row) => $row['role'] === Account::ROLE_ADVISOR || $row['created'] + $row['confirmed'] + $row['checked_in'] + $row['rescheduled'] + $row['cancelled'] > 0)->values();

        return response()->json(['data' => $rows]);
    }
}
