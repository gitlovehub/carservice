<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\PartRequest;
use App\Models\RepairOrder;
use App\Models\RepairOrderStatusHistory;
use App\Services\CustomerActivityFeed;
use Illuminate\Http\Request;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;

/**
 * ADV-10 — Tổng quan cố vấn (một lần tải): 4 chỉ số kèm chuỗi 7 ngày (số thật, không ước lượng),
 * lịch hẹn hôm qua / hôm nay / sắp tới, phiếu đang mở theo bước, việc cần xử lý, phiếu gần đây. Toàn gara (không lọc theo cố vấn).
 */
class AdvisorDashboardController extends Controller
{
    private const OPEN = [RepairOrder::RECEIVED, RepairOrder::INSPECTING, RepairOrder::QUOTING, RepairOrder::WAITING_APPROVAL,
        RepairOrder::IN_PROGRESS, RepairOrder::WAITING_FOR_PARTS, RepairOrder::COMPLETED];

    private const ACTIVE_APPOINTMENT = ['PENDING', 'CONFIRMED', 'CHECKED_IN'];

    /** GET /api/advisor/customer-updates?limit= — hoạt động gần đây do khách tự làm với lịch hẹn. */
    public function customerUpdates(Request $request, CustomerActivityFeed $feed): JsonResponse
    {
        $limit = max(1, min(30, (int) $request->query('limit', 10)));

        return response()->json(['data' => $feed->latest($limit)]);
    }

    /** GET /api/advisor/dashboard */
    public function show(): JsonResponse
    {
        $today = CarbonImmutable::today();
        $days = collect(range(6, 0))->map(fn (int $back) => $today->subDays($back)->toDateString());

        $statusCounts = RepairOrder::query()->whereIn('status', self::OPEN)
            ->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status')->map(fn ($n) => (int) $n);
        $count = fn (string ...$statuses): int => (int) collect($statuses)->sum(fn ($s) => $statusCounts[$s] ?? 0);

        $appointmentsPerDay = $this->perDay(
            Appointment::query()->whereNotIn('status', ['CANCELLED'])->whereBetween('appointment_date', [$days->first(), $days->last()]),
            'appointment_date', $days,
        );
        $todayCount = Appointment::query()->whereDate('appointment_date', $today)->whereNotIn('status', ['CANCELLED'])->count();
        $yesterdayCount = Appointment::query()->whereDate('appointment_date', $today->subDay())->whereNotIn('status', ['CANCELLED'])->count();

        $waitingParts = RepairOrder::query()->where('status', RepairOrder::WAITING_FOR_PARTS)
            ->withCount([
                'partRequests as open_requests' => fn ($q) => $q->whereIn('status', PartRequest::OPEN),
                'partRequests as received_requests' => fn ($q) => $q->where('status', PartRequest::RECEIVED),
            ])->get(['id']);

        return response()->json(['data' => [
            'generated_at' => now()->toIso8601String(),
            'kpis' => [
                'pending' => [
                    'value' => Appointment::query()->where('status', 'PENDING')->count(),
                    // Lịch mới đặt mỗi ngày (theo ngày tạo).
                    'series' => $this->perDay(Appointment::query()->whereBetween('created_at', [$today->subDays(6)->startOfDay(), $today->endOfDay()]), 'created_at', $days),
                ],
                'today' => ['value' => $todayCount, 'previous' => $yesterdayCount, 'series' => $appointmentsPerDay],
                'repairing' => [
                    'value' => $count(RepairOrder::IN_PROGRESS, RepairOrder::WAITING_FOR_PARTS),
                    'waiting_parts' => $count(RepairOrder::WAITING_FOR_PARTS),
                    // Số phiếu bắt đầu sửa mỗi ngày.
                    'series' => $this->historyPerDay(RepairOrder::IN_PROGRESS, $days),
                ],
                'delivery' => [
                    'value' => $count(RepairOrder::COMPLETED),
                    'handed_today' => RepairOrderStatusHistory::query()->where('status', RepairOrder::HANDED_OVER)->whereDate('created_at', $today)->count(),
                    // Số xe bàn giao mỗi ngày.
                    'series' => $this->historyPerDay(RepairOrder::HANDED_OVER, $days),
                ],
            ],
            'days' => $days,
            // Hôm qua: mọi lịch trừ đã huỷ (khớp số "So với hôm qua" ở thẻ chỉ số) để xem lại ai đã đến / vắng.
            'appointments_yesterday' => $this->appointments(Appointment::query()->whereDate('appointment_date', $today->subDay())->whereNotIn('status', ['CANCELLED'])),
            'appointments_today' => $this->appointments(Appointment::query()->whereDate('appointment_date', $today)->whereIn('status', self::ACTIVE_APPOINTMENT)),
            'appointments_upcoming' => $this->appointments(Appointment::query()
                ->whereBetween('appointment_date', [$today->addDay()->toDateString(), $today->addDays(7)->toDateString()])
                ->whereIn('status', ['PENDING', 'CONFIRMED']), 10),
            'stages' => [
                ['key' => 'intake', 'label' => 'Nhận xe & chẩn đoán', 'value' => $count(RepairOrder::RECEIVED, RepairOrder::INSPECTING)],
                ['key' => 'quote', 'label' => 'Báo giá', 'value' => $count(RepairOrder::QUOTING, RepairOrder::WAITING_APPROVAL)],
                ['key' => 'repair', 'label' => 'Đang sửa', 'value' => $count(RepairOrder::IN_PROGRESS)],
                ['key' => 'parts', 'label' => 'Chờ phụ tùng', 'value' => $count(RepairOrder::WAITING_FOR_PARTS)],
                ['key' => 'deliver', 'label' => 'Chờ thanh toán & bàn giao', 'value' => $count(RepairOrder::COMPLETED)],
            ],
            'todo' => [
                'received' => $count(RepairOrder::RECEIVED),
                'quoting' => $count(RepairOrder::QUOTING),
                'waiting_approval' => $count(RepairOrder::WAITING_APPROVAL),
                'waiting_parts' => $waitingParts->where('open_requests', '>', 0)->count(),
                // B-05 đề xuất 4: phụ tùng đã về đủ → cố vấn tiếp tục sửa.
                'parts_ready' => $waitingParts->where('open_requests', 0)->where('received_requests', '>', 0)->count(),
                'confirmed_today' => Appointment::query()->whereDate('appointment_date', $today)->where('status', 'CONFIRMED')->count(),
                'pending_appointments' => Appointment::query()->where('status', 'PENDING')->count(),
                'ready_delivery' => $count(RepairOrder::COMPLETED),
            ],
            'recent_orders' => RepairOrder::query()->with(['customer:id,full_name', 'vehicle:id,model_id,license_plate', 'vehicle.model:id,brand_id,name', 'vehicle.model.brand:id,name'])
                ->latest('received_at')->latest('id')->limit(5)->get()
                ->map(fn (RepairOrder $o) => [
                    'id' => $o->id, 'code' => $o->repair_order_code, 'status' => $o->status,
                    'customer' => $o->customer?->full_name, 'plate' => $o->vehicle?->license_plate,
                    'brand' => $o->vehicle?->model?->brand?->name, 'model' => $o->vehicle?->model?->name,
                ])->values(),
        ]]);
    }

    /** @return list<int> số bản ghi mỗi ngày theo cột ngày (date hoặc datetime). */
    private function perDay(Builder $query, string $column, Collection $days): array
    {
        $counts = $query->get([$column])->countBy(fn ($row) => CarbonImmutable::parse($row->{$column})->toDateString());

        return $days->map(fn (string $d) => (int) ($counts[$d] ?? 0))->values()->all();
    }

    /** @return list<int> số phiếu chuyển sang `$status` mỗi ngày. */
    private function historyPerDay(string $status, Collection $days): array
    {
        return $this->perDay(
            RepairOrderStatusHistory::query()->where('status', $status)
                ->whereBetween('created_at', [CarbonImmutable::parse($days->first())->startOfDay(), CarbonImmutable::parse($days->last())->endOfDay()]),
            'created_at', $days,
        );
    }

    /** @return Collection<int, array<string, mixed>> */
    private function appointments(Builder $query, int $limit = 30): Collection
    {
        return $query->with(['customer:id,full_name,phone', 'vehicle:id,model_id,license_plate', 'vehicle.model:id,brand_id,name', 'vehicle.model.brand:id,name',
            'services:id,name', 'packages:id,name'])
            ->orderBy('appointment_date')->orderBy('appointment_time')->limit($limit)->get()
            ->map(fn (Appointment $a) => [
                'id' => $a->id, 'code' => $a->appointment_code, 'status' => $a->status,
                'date' => CarbonImmutable::parse($a->appointment_date)->toDateString(), 'time' => substr((string) $a->appointment_time, 0, 5),
                'customer' => $a->customer?->full_name, 'plate' => $a->vehicle?->license_plate,
                'brand' => $a->vehicle?->model?->brand?->name, 'model' => $a->vehicle?->model?->name,
                'request' => $a->packages->pluck('name')->merge($a->services->pluck('name'))->first() ?? ($a->symptom_description ? 'Kiểm tra theo mô tả' : null),
                'more' => max(0, $a->packages->count() + $a->services->count() - 1),
            ])->values();
    }
}
