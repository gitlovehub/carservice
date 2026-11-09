<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\Review;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

/**
 * Số liệu thật cho trang Tổng quan và Báo cáo của Admin.
 *
 * - Doanh thu Tổng quan = tiền đã thu (payments SUCCESS theo paid_at).
 * - Doanh thu Báo cáo = giá trị hoá đơn phát hành trong kỳ (không tính hoá đơn huỷ),
 *   tách dịch vụ / phụ tùng theo dòng hoá đơn, đã phân bổ giảm giá.
 * Gom nhóm theo ngày/tháng làm bằng PHP để chạy được trên cả MySQL và SQLite.
 */
class AdminInsightsController extends Controller
{
    private const OPEN_GROUPS = [
        'inspecting' => [RepairOrder::RECEIVED, RepairOrder::INSPECTING],
        'quoting' => [RepairOrder::QUOTING, RepairOrder::WAITING_APPROVAL],
        'waiting_parts' => [RepairOrder::WAITING_FOR_PARTS],
        'in_progress' => [RepairOrder::IN_PROGRESS],
        'waiting_payment' => [RepairOrder::COMPLETED],
    ];

    /** GET /api/admin/dashboard?range=today|7d|30d */
    public function dashboard(Request $request): JsonResponse
    {
        $range = $request->validate(['range' => ['nullable', Rule::in(['today', '7d', '30d'])]])['range'] ?? '30d';
        $now = CarbonImmutable::now();
        $today = $now->startOfDay();

        // Doanh thu tháng này so với cùng số ngày của tháng trước.
        $monthStart = $now->startOfMonth();
        $prevStart = $monthStart->subMonthNoOverflow();
        $prevEnd = $prevStart->addDays($now->day - 1)->setTimeFrom($now);
        $revenueMonth = $this->paid($monthStart, $now);
        $prevCap = $monthStart->subSecond();
        $revenuePrev = $this->paid($prevStart, $prevEnd->greaterThan($prevCap) ? $prevCap : $prevEnd);

        $appointmentsToday = $this->appointmentsOn($today);
        $appointmentsYesterday = $this->appointmentsOn($today->subDay());

        $inShop = $this->inShopAt($now);
        $inShopYesterday = $this->inShopAt($today->subSecond());

        $unpaid = $this->unpaidAt($now);
        $unpaidWeekAgo = $this->unpaidAt($now->subDays(7));

        // Doanh thu theo ngày + trung bình 7 ngày (lấy thêm 6 ngày trước để tính trung bình).
        $days = $range === '30d' ? 30 : 7;
        $from = $today->subDays($days - 1);
        $daily = $this->dailyPaid($from->subDays(6), $now);
        $series = [];
        for ($day = $from; $day->lessThanOrEqualTo($today); $day = $day->addDay()) {
            $window = collect(range(0, 6))->map(fn (int $back) => $daily[$day->subDays($back)->toDateString()] ?? 0.0);
            $series[] = ['date' => $day->toDateString(), 'revenue' => $daily[$day->toDateString()] ?? 0.0, 'avg7' => round($window->avg(), 2)];
        }

        $openCounts = RepairOrder::query()
            ->whereIn('status', array_merge(...array_values(self::OPEN_GROUPS)))
            ->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return response()->json(['data' => [
            'range' => $range,
            'kpis' => [
                'revenue_month' => $this->kpi($revenueMonth, $revenuePrev),
                'appointments_today' => $this->kpi($appointmentsToday, $appointmentsYesterday),
                'in_shop' => $this->kpi($inShop, $inShopYesterday),
                'unpaid_invoices' => $this->kpi($unpaid, $unpaidWeekAgo),
            ],
            'revenue_series' => $series,
            'repair_status' => collect(self::OPEN_GROUPS)
                ->map(fn (array $statuses) => (int) collect($statuses)->sum(fn (string $s) => $openCounts[$s] ?? 0))
                ->all(),
            'attention' => [
                'pending_appointments' => Appointment::query()->where('status', 'PENDING')->whereDate('appointment_date', '>=', $today->toDateString())->count(),
                'low_reviews_unreplied' => Review::query()->where('is_hidden', false)->whereNull('reply')->where('overall_rating', '<=', 3)->count(),
            ],
            'upcoming_appointments' => $this->upcoming($now),
            'low_stock' => Inventory::query()
                ->whereColumn('quantity', '<', 'min_quantity')
                ->where('min_quantity', '>', 0)
                ->with('part:id,sku,name')
                ->get()
                ->sortBy(fn (Inventory $inv) => $inv->quantity / max(1, $inv->min_quantity))
                ->take(5)
                ->map(fn (Inventory $inv) => [
                    'part_id' => $inv->part_id, 'sku' => $inv->part?->sku, 'name' => $inv->part?->name,
                    'quantity' => (int) $inv->quantity, 'min_quantity' => (int) $inv->min_quantity,
                ])->values(),
        ]]);
    }

    /** GET /api/admin/reports?period=YYYY-MM|YYYY-Qn|YYYY */
    public function reports(Request $request): JsonResponse
    {
        $period = $request->validate(['period' => ['nullable', 'regex:/^\d{4}(-(0[1-9]|1[0-2]|Q[1-4]))?$/']])['period']
            ?? CarbonImmutable::now()->format('Y-m');
        [$start, $end, $prevStart, $prevEnd, $label] = $this->periodBounds($period);

        // Kỳ đang diễn ra: chỉ tính tới hiện tại và so với cùng độ dài của kỳ trước.
        $now = CarbonImmutable::now();
        if ($end->greaterThan($now) && $start->lessThanOrEqualTo($now)) {
            $prevEnd = $prevStart->addSeconds((int) $start->diffInSeconds($now));
            $end = $now;
        }

        $current = $this->invoicedSplit($start, $end);
        $previous = $this->invoicedSplit($prevStart, $prevEnd);

        // 8 tháng gần nhất tính đến tháng cuối của kỳ.
        $lastMonth = $end->startOfMonth();
        $monthly = [];
        for ($i = 7; $i >= 0; $i--) {
            $m = $lastMonth->subMonthsNoOverflow($i);
            $split = $this->invoicedSplit($m, $m->endOfMonth());
            $monthly[] = [
                'month' => $m->format('Y-m'),
                'service' => $split['service'],
                'parts' => $split['parts'],
                'orders' => RepairOrder::query()->whereBetween('received_at', [$m, $m->endOfMonth()])->count(),
            ];
        }

        $items = $this->periodItems($start, $end);

        return response()->json(['data' => [
            'period' => $period,
            'label' => $label,
            'periods' => $this->availablePeriods(),
            'revenue' => [
                'total' => $this->kpi($current['service'] + $current['parts'], $previous['service'] + $previous['parts']),
                'service' => $this->kpi($current['service'], $previous['service']),
                'parts' => $this->kpi($current['parts'], $previous['parts']),
            ],
            'monthly' => $monthly,
            'top_services' => $items->where('item_type', 'SERVICE')
                ->groupBy(fn ($row) => $row->service_id ?? $row->description)
                ->map(fn (Collection $rows) => ['name' => $rows->first()->description, 'count' => (int) $rows->sum('quantity'), 'revenue' => round($rows->sum('net'), 2)])
                ->sortByDesc('revenue')->take(10)->values(),
            'top_parts' => $items->where('item_type', 'PART')
                ->groupBy(fn ($row) => $row->part_id ?? $row->description)
                ->map(fn (Collection $rows) => ['name' => $rows->first()->description, 'sku' => $rows->first()->part?->sku, 'quantity' => (int) $rows->sum('quantity'), 'revenue' => round($rows->sum('net'), 2)])
                ->sortByDesc('revenue')->take(10)->values(),
            'collection' => $this->collection($start, $end, $prevStart, $prevEnd),
            'operations' => $this->operations($start, $end, $prevStart, $prevEnd),
        ]]);
    }

    /* ------------------------------------------------------------- Helpers */

    /**
     * @return array{value: float|int, previous: float|int, delta: float|null}
     */
    private function kpi(float|int $value, float|int $previous): array
    {
        return [
            'value' => $value,
            'previous' => $previous,
            'delta' => $previous > 0 ? round(($value - $previous) / $previous * 100, 1) : null,
        ];
    }

    private function paid(CarbonImmutable $from, CarbonImmutable $to): float
    {
        return round((float) Payment::query()->where('status', Payment::SUCCESS)->whereBetween('paid_at', [$from, $to])->sum('amount'), 2);
    }

    /** @return array<string, float> */
    private function dailyPaid(CarbonImmutable $from, CarbonImmutable $to): array
    {
        return Payment::query()->where('status', Payment::SUCCESS)->whereBetween('paid_at', [$from, $to])->get(['paid_at', 'amount'])
            ->groupBy(fn (Payment $p) => $p->paid_at->toDateString())
            ->map(fn (Collection $rows) => round((float) $rows->sum('amount'), 2))
            ->all();
    }

    private function appointmentsOn(CarbonImmutable $day): int
    {
        return Appointment::query()->whereDate('appointment_date', $day->toDateString())->whereNotIn('status', ['CANCELLED'])->count();
    }

    /** Số xe trong xưởng tại một thời điểm: đã nhận, chưa bàn giao / đóng. */
    private function inShopAt(CarbonImmutable $at): int
    {
        return RepairOrder::query()
            ->where('received_at', '<=', $at)
            ->where(fn ($q) => $q->whereNull('handed_over_at')->orWhere('handed_over_at', '>', $at))
            ->where(fn ($q) => $q->whereNull('closed_at')->orWhere('closed_at', '>', $at))
            ->count();
    }

    /** Hoá đơn chưa thu đủ tại một thời điểm. */
    private function unpaidAt(CarbonImmutable $at): int
    {
        return Invoice::query()
            ->where('created_at', '<=', $at)
            ->where('status', '!=', Invoice::CANCELLED)
            ->withSum(['payments as paid_then' => fn ($q) => $q->where('status', Payment::SUCCESS)->where('paid_at', '<=', $at)], 'amount')
            ->get(['id', 'total_amount'])
            ->filter(fn (Invoice $inv) => (float) $inv->paid_then < (float) $inv->total_amount - 0.01)
            ->count();
    }

    /** @return list<array<string, mixed>> */
    private function upcoming(CarbonImmutable $now): array
    {
        return Appointment::query()
            ->whereIn('status', ['PENDING', 'CONFIRMED'])
            ->where(fn ($q) => $q->whereDate('appointment_date', '>', $now->toDateString())
                ->orWhere(fn ($q) => $q->whereDate('appointment_date', $now->toDateString())->where('appointment_time', '>=', $now->format('H:i:s'))))
            ->with(['customer:id,full_name,phone', 'vehicle:id,model_id,license_plate', 'vehicle.model:id,brand_id,name', 'vehicle.model.brand:id,name', 'services:id,name,estimated_minutes'])
            ->orderBy('appointment_date')->orderBy('appointment_time')
            ->limit(6)->get()
            ->map(function (Appointment $a) {
                $start = CarbonImmutable::parse(substr((string) $a->appointment_date, 0, 10).' '.$a->appointment_time);
                $minutes = max(30, (int) $a->services->sum('estimated_minutes') ?: 60);

                return [
                    'id' => $a->id,
                    'date' => $start->toDateString(),
                    'start' => $start->format('H:i'),
                    'end' => $start->addMinutes($minutes)->format('H:i'),
                    'customer' => $a->customer?->full_name,
                    'phone' => $a->customer?->phone,
                    'vehicle' => trim(($a->vehicle?->model?->brand?->name ?? '').' '.($a->vehicle?->model?->name ?? '')),
                    'plate' => $a->vehicle?->license_plate,
                    'services' => $a->services->pluck('name')->implode(', '),
                    'status' => $a->status,
                ];
            })->all();
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable, 2: CarbonImmutable, 3: CarbonImmutable, 4: string}
     */
    private function periodBounds(string $period): array
    {
        if (preg_match('/^(\d{4})-Q([1-4])$/', $period, $m)) {
            $start = CarbonImmutable::create((int) $m[1], ((int) $m[2] - 1) * 3 + 1, 1)->startOfDay();
            $end = $start->addMonthsNoOverflow(2)->endOfMonth();

            return [$start, $end, $start->subMonthsNoOverflow(3), $start->subSecond(), "Quý {$m[2]}/{$m[1]}"];
        }
        if (preg_match('/^\d{4}$/', $period)) {
            $start = CarbonImmutable::create((int) $period, 1, 1)->startOfDay();

            return [$start, $start->endOfYear(), $start->subYear(), $start->subSecond(), "Năm {$period}"];
        }
        $start = CarbonImmutable::createFromFormat('Y-m-d', $period.'-01')->startOfDay();
        $end = $start->endOfMonth();

        return [$start, $end, $start->subMonthNoOverflow(), $start->subSecond(), 'Tháng '.$start->format('m/Y')];
    }

    /**
     * Dòng hoá đơn trong kỳ, mỗi dòng có thêm `net` = giá trị sau khi phân bổ giảm giá của hoá đơn.
     *
     * @return Collection<int, InvoiceItem>
     */
    private function periodItems(CarbonImmutable $from, CarbonImmutable $to): Collection
    {
        return InvoiceItem::query()
            ->whereHas('invoice', fn ($q) => $q->where('status', '!=', Invoice::CANCELLED)->whereBetween('created_at', [$from, $to]))
            ->with(['invoice:id,subtotal,total_amount', 'part:id,sku'])
            ->get()
            ->each(function (InvoiceItem $item): void {
                $subtotal = (float) $item->invoice->subtotal;
                $ratio = $subtotal > 0 ? (float) $item->invoice->total_amount / $subtotal : 1.0;
                $item->setAttribute('net', round((float) $item->amount * $ratio, 2));
            });
    }

    /** @return array{service: float, parts: float} */
    private function invoicedSplit(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $items = $this->periodItems($from, $to);

        return [
            'service' => round((float) $items->where('item_type', 'SERVICE')->sum('net'), 2),
            'parts' => round((float) $items->where('item_type', 'PART')->sum('net'), 2),
        ];
    }

    /** @return list<array{value: string, label: string}> */
    private function availablePeriods(): array
    {
        $first = Invoice::query()->min('created_at');
        $now = CarbonImmutable::now();
        $start = $first ? CarbonImmutable::parse($first)->startOfMonth() : $now->startOfMonth();

        $periods = [];
        for ($m = $now->startOfMonth(); $m->greaterThanOrEqualTo($start) && count($periods) < 12; $m = $m->subMonthNoOverflow()) {
            $periods[] = ['value' => $m->format('Y-m'), 'label' => 'Tháng '.$m->format('m/Y')];
        }
        $periods[] = ['value' => $now->year.'-Q'.$now->quarter, 'label' => "Quý {$now->quarter}/{$now->year}"];
        $periods[] = ['value' => (string) $now->year, 'label' => "Năm {$now->year}"];

        return $periods;
    }

    /**
     * Hiệu quả thu tiền của hoá đơn phát hành trong kỳ (tiền thu tính tới hiện tại).
     *
     * @return array<string, mixed>
     */
    private function collection(CarbonImmutable $from, CarbonImmutable $to, CarbonImmutable $prevFrom, CarbonImmutable $prevTo): array
    {
        $stats = function (CarbonImmutable $a, CarbonImmutable $b): array {
            $invoices = Invoice::query()
                ->where('status', '!=', Invoice::CANCELLED)
                ->whereBetween('created_at', [$a, $b])
                ->withSum(['payments as paid' => fn ($q) => $q->where('status', Payment::SUCCESS)], 'amount')
                ->get(['id', 'total_amount']);
            $billed = round((float) $invoices->sum('total_amount'), 2);
            $collected = round((float) $invoices->sum(fn (Invoice $inv) => min((float) $inv->paid, (float) $inv->total_amount)), 2);

            return [
                'count' => $invoices->count(),
                'billed' => $billed,
                'collected' => $collected,
                'avg' => $invoices->count() > 0 ? round($billed / $invoices->count(), 2) : 0.0,
                'unpaid_count' => $invoices->filter(fn (Invoice $inv) => (float) $inv->paid < (float) $inv->total_amount - 0.01)->count(),
            ];
        };
        $now = $stats($from, $to);
        $prev = $stats($prevFrom, $prevTo);

        return [
            'invoices' => $this->kpi($now['count'], $prev['count']),
            'average_invoice' => $this->kpi($now['avg'], $prev['avg']),
            'billed' => $now['billed'],
            'collected' => $now['collected'],
            'outstanding' => round($now['billed'] - $now['collected'], 2),
            'unpaid_invoices' => $now['unpaid_count'],
            'collection_rate' => $now['billed'] > 0 ? round($now['collected'] / $now['billed'] * 100, 1) : null,
        ];
    }

    /**
     * Tình hình vận hành của ga-ra trong kỳ: lượt xe, tốc độ xử lý, lịch hẹn, khách quay lại, báo giá, mức hài lòng.
     *
     * @return array<string, mixed>
     */
    private function operations(CarbonImmutable $from, CarbonImmutable $to, CarbonImmutable $prevFrom, CarbonImmutable $prevTo): array
    {
        $received = fn (CarbonImmutable $a, CarbonImmutable $b) => RepairOrder::query()->whereBetween('received_at', [$a, $b])->count();
        $turnaround = function (CarbonImmutable $a, CarbonImmutable $b): ?float {
            $hours = RepairOrder::query()->whereNotNull('received_at')->whereBetween('handed_over_at', [$a, $b])->get(['received_at', 'handed_over_at'])
                ->map(fn (RepairOrder $o) => $o->received_at->diffInMinutes($o->handed_over_at) / 60);

            return $hours->isEmpty() ? null : round((float) $hours->avg(), 1);
        };
        $rating = fn (CarbonImmutable $a, CarbonImmutable $b) => Review::query()->whereBetween('created_at', [$a, $b])->avg('overall_rating');

        // Lịch hẹn trong kỳ theo kết quả.
        $appointments = Appointment::query()
            ->whereBetween('appointment_date', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $arrived = (int) ($appointments['CHECKED_IN'] ?? 0) + (int) ($appointments['COMPLETED'] ?? 0);
        $cancelled = (int) ($appointments['CANCELLED'] ?? 0);
        $noShow = (int) ($appointments['NO_SHOW'] ?? 0);
        $closed = $arrived + $cancelled + $noShow;

        // Khách đến xưởng trong kỳ: khách quay lại = đã từng có phiếu trước kỳ.
        $customerIds = RepairOrder::query()->whereBetween('received_at', [$from, $to])->distinct()->pluck('customer_id');
        $returning = $customerIds->isEmpty() ? 0 : RepairOrder::query()
            ->whereIn('customer_id', $customerIds)->where('received_at', '<', $from)->distinct()->count('customer_id');

        // Báo giá khách đã phản hồi trong kỳ.
        $quotes = Quotation::query()
            ->whereIn('status', [Quotation::APPROVED, Quotation::PARTIALLY_APPROVED, Quotation::REJECTED])
            ->whereBetween('created_at', [$from, $to])
            ->get(['status']);
        $approved = $quotes->where('status', '!=', Quotation::REJECTED)->count();

        $reviews = Review::query()->whereBetween('created_at', [$from, $to])->pluck('overall_rating');
        $avgNow = $rating($from, $to);
        $avgPrev = $rating($prevFrom, $prevTo);
        $tatNow = $turnaround($from, $to);
        $tatPrev = $turnaround($prevFrom, $prevTo);

        return [
            'received' => $this->kpi($received($from, $to), $received($prevFrom, $prevTo)),
            'delivered' => RepairOrder::query()->whereBetween('handed_over_at', [$from, $to])->count(),
            'in_shop' => $this->inShopAt($to),
            'turnaround_hours' => $tatNow === null ? null : $this->kpi($tatNow, $tatPrev ?? 0),
            'appointments' => [
                'total' => (int) $appointments->sum(),
                'arrived' => $arrived,
                'cancelled' => $cancelled,
                'no_show' => $noShow,
                'upcoming' => (int) ($appointments['PENDING'] ?? 0) + (int) ($appointments['CONFIRMED'] ?? 0),
                'show_rate' => $closed > 0 ? round($arrived / $closed * 100, 1) : null,
            ],
            'customers' => [
                'total' => $customerIds->count(),
                'returning' => $returning,
                'new' => $customerIds->count() - $returning,
                'return_rate' => $customerIds->isEmpty() ? null : round($returning / $customerIds->count() * 100, 1),
            ],
            'quotations' => [
                'decided' => $quotes->count(),
                'approved' => $approved,
                'approval_rate' => $quotes->isEmpty() ? null : round($approved / $quotes->count() * 100, 1),
            ],
            'satisfaction' => [
                'count' => $reviews->count(),
                'average' => $avgNow === null ? null : $this->kpi(round((float) $avgNow, 1), $avgPrev === null ? 0 : round((float) $avgPrev, 1)),
                'positive_rate' => $reviews->isEmpty() ? null : round($reviews->filter(fn ($r) => (int) $r >= 4)->count() / $reviews->count() * 100, 1),
                'distribution' => collect([5, 4, 3, 2, 1])->mapWithKeys(fn (int $star) => [$star => $reviews->filter(fn ($r) => (int) $r === $star)->count()])->all(),
            ],
        ];
    }
}
