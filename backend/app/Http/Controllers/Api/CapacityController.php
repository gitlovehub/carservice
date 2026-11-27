<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CapacityService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** P7 — GET /advisor/capacity?date=YYYY-MM-DD[&days=N]: tải / năng lực ngày + gợi ý ngày còn chỗ (chỉ cảnh báo). */
class CapacityController extends Controller
{
    public function __construct(private readonly CapacityService $capacity) {}

    public function show(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'days' => ['nullable', 'integer', 'min:1', 'max:31'],
        ]);
        $date = CarbonImmutable::parse($data['date']);
        $day = $this->capacity->forDate($date);

        return response()->json([
            ...$day,
            'suggestions' => $day['over_capacity'] ? $this->capacity->suggestions($date, (int) ($data['days'] ?? 7)) : [],
        ]);
    }

    /** GET /advisor/capacity/range?from=YYYY-MM-DD&days=N — tải theo ngày cho biểu đồ / bảng. */
    public function range(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'days' => ['nullable', 'integer', 'min:1', 'max:31'],
        ]);
        $from = CarbonImmutable::parse($data['from']);
        $days = [];
        for ($i = 0; $i < (int) ($data['days'] ?? 7); $i++) {
            $days[] = $this->capacity->forDate($from->addDays($i));
        }

        return response()->json(['data' => $days]);
    }
}
