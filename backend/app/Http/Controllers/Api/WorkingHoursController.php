<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GarageSetting;
use App\Services\CapacityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WorkingHoursController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => DB::table('working_hours')
                ->whereBetween('day_of_week', [0, 6])
                ->orderBy('day_of_week')
                ->get(),
        ]);
    }

    /** GET /admin/working-hours — như index, kèm số KTV để admin xem công suất tự động. */
    public function adminIndex(): JsonResponse
    {
        return response()->json([
            'data' => DB::table('working_hours')
                ->whereBetween('day_of_week', [0, 6])
                ->orderBy('day_of_week')
                ->get(),
            'meta' => ['technicians' => CapacityService::activeTechnicians()],
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'open_time' => ['required', 'date_format:H:i'],
            'close_time' => ['required', 'date_format:H:i', 'after:open_time'],
            'max_slots' => ['required', 'integer', 'min:0', 'max:100'],
            'is_active' => ['required', 'boolean'],
            // P7: năng lực ngày (phút) + số cầu nâng — chỉ dùng để cảnh báo (Q6).
            'daily_capacity_minutes' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100000'],
            'bay_count' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:50'],
        ]);

        $workingHour = DB::table('working_hours')
            ->where('id', $id)
            ->whereBetween('day_of_week', [0, 6])
            ->first();

        if (! $workingHour) {
            return response()->json([
                'message' => 'Không tìm thấy cấu hình giờ làm việc.',
            ], 404);
        }

        if ($data['is_active'] && $data['max_slots'] < 1) {
            throw ValidationException::withMessages([
                'max_slots' => ['Ngày hoạt động phải có ít nhất 1 lịch mỗi khung giờ.'],
            ]);
        }

        DB::table('working_hours')
            ->where('id', $id)
            ->update($data);

        return response()->json([
            'message' => 'Cập nhật giờ làm việc thành công.',
            'data' => DB::table('working_hours')->where('id', $id)->first(),
        ]);
    }

    /** GET /booking-slots — công khai: khung giờ khách chọn khi đặt lịch, chia sáng / chiều. */
    public function bookingSlots(): JsonResponse
    {
        return response()->json(['data' => GarageSetting::bookingSlots()]);
    }

    /** PUT /admin/booking-slots — admin sửa khung giờ đặt lịch buổi sáng / chiều. */
    public function updateBookingSlots(Request $request): JsonResponse
    {
        $data = $request->validate([
            'morning' => ['present', 'array', 'max:12'],
            'morning.*' => ['required', 'date_format:H:i', 'distinct', 'before:12:00'],
            'afternoon' => ['present', 'array', 'max:12'],
            'afternoon.*' => ['required', 'date_format:H:i', 'distinct', 'after_or_equal:12:00'],
        ], [
            'morning.max' => 'Buổi sáng tối đa 12 khung giờ.',
            'afternoon.max' => 'Buổi chiều tối đa 12 khung giờ.',
            'morning.*.date_format' => 'Giờ buổi sáng không hợp lệ (HH:mm).',
            'afternoon.*.date_format' => 'Giờ buổi chiều không hợp lệ (HH:mm).',
            'morning.*.distinct' => 'Buổi sáng có khung giờ bị trùng.',
            'afternoon.*.distinct' => 'Buổi chiều có khung giờ bị trùng.',
            'morning.*.before' => 'Khung giờ buổi sáng phải trước 12:00.',
            'afternoon.*.after_or_equal' => 'Khung giờ buổi chiều phải từ 12:00 trở đi.',
        ]);

        $slots = [
            'morning' => collect($data['morning'])->sort()->values()->all(),
            'afternoon' => collect($data['afternoon'])->sort()->values()->all(),
        ];
        if ($slots['morning'] === [] && $slots['afternoon'] === []) {
            throw ValidationException::withMessages(['morning' => 'Cần ít nhất một khung giờ đặt lịch.']);
        }

        // Khung giờ phải nằm trong giờ mở cửa của ít nhất một ngày đang hoạt động.
        $open = DB::table('working_hours')->where('is_active', true)->min('open_time');
        $close = DB::table('working_hours')->where('is_active', true)->max('close_time');
        if ($open && $close) {
            $outside = collect([...$slots['morning'], ...$slots['afternoon']])
                ->filter(fn (string $t) => $t < substr($open, 0, 5) || $t >= substr($close, 0, 5));
            if ($outside->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'morning' => 'Khung giờ '.$outside->implode(', ').' nằm ngoài giờ mở cửa ('.substr($open, 0, 5).'–'.substr($close, 0, 5).').',
                ]);
            }
        }

        $setting = GarageSetting::current() ?? new GarageSetting(['name' => 'CarService']);
        $setting->fill(['booking_slots' => $slots, 'updated_by_account_id' => $request->user()->id])->save();

        $count = count($slots['morning']) + count($slots['afternoon']);

        return response()->json([
            'message' => "Đã lưu {$count} khung giờ đặt lịch (sáng ".count($slots['morning']).', chiều '.count($slots['afternoon']).').',
            'data' => $slots,
        ]);
    }
}
