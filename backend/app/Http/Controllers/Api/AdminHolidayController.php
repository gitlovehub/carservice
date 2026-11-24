<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Holiday;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Ngày nghỉ lễ của gara (bảng holidays: mỗi ngày một dòng; đặt lịch đã chặn các ngày này).
 * API trả / nhận theo khoảng ngày liên tiếp cùng lý do để giao diện quản lý dễ hơn.
 */
class AdminHolidayController extends Controller
{
    private const MAX_DAYS = 31;

    /** GET /api/admin/holidays — các khoảng nghỉ từ 1 năm trước trở đi. */
    public function index(): JsonResponse
    {
        $rows = Holiday::query()->where('holiday_date', '>=', now()->subYear()->toDateString())->orderBy('holiday_date')->get();

        return response()->json(['data' => $this->ranges($rows)]);
    }

    /** POST /api/admin/holidays {from, to?, reason, replace_ids?} */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            'reason' => ['required', 'string', 'max:255'],
            'replace_ids' => ['sometimes', 'array', 'max:'.self::MAX_DAYS],
            'replace_ids.*' => ['integer'],
        ], ['to.after_or_equal' => 'Ngày kết thúc phải sau ngày bắt đầu.', 'reason.required' => 'Vui lòng nhập lý do nghỉ.']);

        $from = CarbonImmutable::parse($data['from']);
        $to = CarbonImmutable::parse($data['to'] ?? $data['from']);
        if ($from->diffInDays($to) + 1 > self::MAX_DAYS) {
            throw ValidationException::withMessages(['to' => 'Mỗi lần chỉ thêm tối đa '.self::MAX_DAYS.' ngày.']);
        }
        $dates = collect(CarbonPeriod::create($from, $to))->map(fn ($d) => $d->toDateString());
        $replace = collect($data['replace_ids'] ?? []);

        $taken = Holiday::query()->whereIn('holiday_date', $dates)->whereNotIn('id', $replace)->orderBy('holiday_date')->get();
        if ($taken->isNotEmpty()) {
            throw ValidationException::withMessages(['from' => 'Đã có ngày nghỉ: '.$taken->map(fn (Holiday $h) => $h->holiday_date->format('d/m/Y'))->implode(', ').'.']);
        }

        DB::transaction(function () use ($replace, $dates, $data): void {
            Holiday::query()->whereIn('id', $replace)->delete();
            foreach ($dates as $date) {
                Holiday::query()->create(['holiday_date' => $date, 'reason' => trim($data['reason'])]);
            }
        });

        $affected = Appointment::query()->whereIn('appointment_date', $dates)->whereIn('status', Appointment::ACTIVE_STATUSES)->count();

        return response()->json([
            'message' => $replace->isEmpty() ? 'Đã thêm ngày nghỉ.' : 'Đã cập nhật ngày nghỉ.',
            'affected_appointments' => $affected,
            'data' => $this->ranges(Holiday::query()->whereIn('holiday_date', $dates)->orderBy('holiday_date')->get())[0] ?? null,
        ], $replace->isEmpty() ? 201 : 200);
    }

    /** DELETE /api/admin/holidays {ids: []} — xoá cả khoảng nghỉ. */
    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate(['ids' => ['required', 'array', 'min:1', 'max:'.self::MAX_DAYS], 'ids.*' => ['integer']]);
        $deleted = Holiday::query()->whereIn('id', $data['ids'])->delete();

        return response()->json(['message' => $deleted ? 'Đã xoá ngày nghỉ.' : 'Không tìm thấy ngày nghỉ.']);
    }

    /**
     * Gộp các ngày liên tiếp cùng lý do thành khoảng.
     *
     * @param  Collection<int, Holiday>  $rows
     * @return list<array{ids: list<int>, from: string, to: string, reason: string|null, days: int}>
     */
    private function ranges(Collection $rows): array
    {
        $ranges = [];
        foreach ($rows as $row) {
            $date = $row->holiday_date->toDateString();
            $last = count($ranges) - 1;
            if ($last >= 0 && $ranges[$last]['reason'] === $row->reason
                && CarbonImmutable::parse($ranges[$last]['to'])->addDay()->toDateString() === $date) {
                $ranges[$last]['to'] = $date;
                $ranges[$last]['ids'][] = $row->id;
                $ranges[$last]['days']++;

                continue;
            }
            $ranges[] = ['ids' => [$row->id], 'from' => $date, 'to' => $date, 'reason' => $row->reason, 'days' => 1];
        }

        return $ranges;
    }
}
