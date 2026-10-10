<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\UpdateAppointmentRequest;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAppointmentRequest;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Service;
use App\Models\Vehicle;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AppointmentController extends Controller
{
    /**
     * Khách hàng đặt lịch hẹn tiếp nhận xe
     */
    public function store(StoreAppointmentRequest $request): JsonResponse
    {
        try {
            $validated = $request->validated();
            $account = $request->user();

            // Thực hiện trong Transaction để đảm bảo tính toàn vẹn dữ liệu
            $appointment = DB::transaction(function () use ($account, $validated) {
                // 1. Lấy thông tin khách hàng từ tài khoản đang đăng nhập
                $customer = Customer::where('account_id', $account->id)->first();
                if (!$customer) {
                    throw new Exception('Không tìm thấy thông tin khách hàng liên kết với tài khoản này.');
                }

                // 2. Kiểm tra xe có thuộc về khách hàng này không
                $vehicleExists = Vehicle::where('id', $validated['vehicle_id'])
                    ->where('customer_id', $customer->id)
                    ->exists();

                if (!$vehicleExists) {
                    throw new Exception('Phương tiện không hợp lệ hoặc không thuộc quyền sở hữu của bạn.');
                }

                // 3. Kiểm tra ngày nghỉ lễ
                $isHoliday = DB::table('holidays')
                    ->where('holiday_date', $validated['appointment_date'])
                    ->exists();

                if ($isHoliday) {
                    throw new Exception('Garage đóng cửa nghỉ lễ vào ngày này. Quý khách vui lòng chọn ngày khác.');
                }

                // 4. Kiểm tra giờ làm việc & ngày trong tuần
                // Kiểm tra ngày trong tuần theo quy ước: Thứ 2..7 -> 2..7, Chủ nhật -> 8
                $bookingDate = Carbon::parse($validated['appointment_date']);

                $rawDay = $bookingDate->dayOfWeek; // 0 = CN, 1 = T2, 2 = T3, 3 = T4, 4 = T5, 5 = T6, 6 = T7
                $dayOfWeek = ($rawDay === 0) ? 8 : ($rawDay + 1);

                $workingHour = DB::table('working_hours')
                    ->where('day_of_week', $dayOfWeek)
                    ->first();

                if (!$workingHour) {
                    $workingHour = (object) [
                        'open_time' => '08:00:00',
                        'close_time' => $dayOfWeek === 8 ? '12:00:00' : '17:30:00',
                        'max_slots' => $dayOfWeek === 8 ? 3 : 5,
                        'is_active' => true,
                    ];
                }

                if (!$workingHour->is_active) {
                    throw new Exception('Garage không làm việc vào ngày này trong tuần.');
                }

                $formattedTime = Carbon::parse($validated['appointment_time'])->format('H:i:s');
                if ($formattedTime < $workingHour->open_time || $formattedTime > $workingHour->close_time) {
                    throw new Exception("Giờ hẹn phải nằm trong khung giờ làm việc: {$workingHour->open_time} - {$workingHour->close_time}.");
                }

                // 5. Kiểm tra giới hạn số xe tối đa trong khung giờ (chống quá tải/race condition)
                $bookedCount = DB::table('appointments')
                    ->where('appointment_date', $validated['appointment_date'])
                    ->where('appointment_time', $formattedTime)
                    ->where('status', '!=', 'CANCELLED')
                    ->lockForUpdate()
                    ->count();

                if ($bookedCount >= $workingHour->max_slots) {
                    throw new Exception('Khung giờ này đã đầy lịch hẹn. Quý khách vui lòng chọn khung giờ khác.');
                }

                $serviceIds = $validated['service_ids'] ?? [];
                if (!empty($validated['service_name'])) {
                    $serviceDefaults = [
                        'Bảo dưỡng định kỳ' => ['category' => 'Bảo dưỡng định kỳ', 'base_price' => 500000, 'estimated_minutes' => 60, 'status' => 'ACTIVE'],
                        'Kiểm tra tổng quát' => ['category' => 'Kiểm tra tổng quát', 'base_price' => 300000, 'estimated_minutes' => 60, 'status' => 'ACTIVE'],
                        'Thay dầu động cơ' => ['category' => 'Bảo dưỡng định kỳ', 'base_price' => 350000, 'estimated_minutes' => 30, 'status' => 'ACTIVE'],
                    ];
                    $service = Service::firstOrCreate(
                        ['name' => $validated['service_name']],
                        $serviceDefaults[$validated['service_name']],
                    );
                    $serviceIds[] = $service->id;
                }

                // 6. Sinh mã lịch hẹn tự động (Ví dụ: APT-20261015-A1B2)
                $codeDate = $bookingDate->format('Ymd');
                $randomSuffix = strtoupper(Str::random(4));
                $appointmentCode = "APT-{$codeDate}-{$randomSuffix}";

                // 7. Tạo Appointment
                $appointment = Appointment::create([
                    'appointment_code'    => $appointmentCode,
                    'customer_id'         => $customer->id,
                    'vehicle_id'          => $validated['vehicle_id'],
                    'appointment_date'    => $validated['appointment_date'],
                    'appointment_time'    => $formattedTime,
                    'request_type'        => $validated['request_type'],
                    'symptom_description'=> $validated['symptom_description'] ?? null,
                    'note'                => $validated['note'] ?? null,
                    'status'              => 'PENDING',
                ]);

                // 8. Lưu dịch vụ dự kiến (nếu có chọn)
                if (!empty($serviceIds)) {
                    $servicesData = collect(array_unique($serviceIds))->map(fn($sId) => [
                        'appointment_id' => $appointment->id,
                        'service_id'     => $sId,
                    ])->toArray();
                    DB::table('appointment_services')->insert($servicesData);
                }

                // 9. Lưu gói bảo dưỡng dự kiến (nếu có chọn)
                if (!empty($validated['package_ids'])) {
                    $packagesData = collect($validated['package_ids'])->map(fn($pId) => [
                        'appointment_id' => $appointment->id,
                        'package_id'     => $pId,
                    ])->toArray();
                    DB::table('appointment_packages')->insert($packagesData);
                }

                return $appointment;
            });

            return response()->json([
                'status'  => 'SUCCESS',
                'message' => 'Đặt lịch hẹn thành công.',
                'data'    => [
                    'id'               => $appointment->id,
                    'appointment_code' => $appointment->appointment_code,
                    'status'           => $appointment->status,
                    'appointment_date' => $appointment->appointment_date,
                    'appointment_time' => $appointment->appointment_time,
                    'request_type'     => $appointment->request_type,
                    'created_at'       => $appointment->created_at,
                ],
            ], Response::HTTP_CREATED);

        } catch (Exception $e) {
            return response()->json([
                'status'  => 'ERROR',
                'message' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Lấy danh sách lịch hẹn của khách hàng đang đăng nhập
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $account = $request->user();

            // 1. Xác thực hồ sơ khách hàng
            $customer = Customer::where('account_id', $account->id)->first();
            if (!$customer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy thông tin khách hàng liên kết với tài khoản này.',
                ], Response::HTTP_NOT_FOUND);
            }

            // 2. Query lịch hẹn kèm thông tin xe, dịch vụ và gói bảo dưỡng
            $query = Appointment::with([
                'vehicle:id,customer_id,model_id,license_plate,variant,year',
                'vehicle.model:id,brand_id,name',
                'vehicle.model.brand:id,name',
                'services:id,name,base_price',
                'packages:id,name,mileage_milestone'
            ])
            ->where('customer_id', $customer->id);

            // 3. Hỗ trợ lọc trạng thái (nếu có: PENDING, CONFIRMED, CANCELLED,...)
            if ($request->filled('status')) {
                $query->where('status', $request->query('status'));
            }

            // 4. Sắp xếp lịch hẹn mới nhất lên đầu và phân trang
            $appointments = $query->orderBy('appointment_date', 'desc')
                ->orderBy('appointment_time', 'desc')
                ->paginate($request->query('per_page', 10));

            return response()->json([
                'success' => true,
                'message' => 'Lấy danh sách lịch hẹn thành công.',
                'data'    => $appointments->items(),
                'pagination' => [
                    'current_page' => $appointments->currentPage(),
                    'per_page'     => $appointments->perPage(),
                    'total'        => $appointments->total(),
                    'last_page'    => $appointments->lastPage(),
                ],
            ], Response::HTTP_OK);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Chi tiết lịch hẹn của khách hàng
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $account = $request->user();
        $customer = Customer::where('account_id', $account->id)->first();

        $appointment = Appointment::with([
            'vehicle.model.brand',
            'services:id,name,base_price,estimated_minutes',
            'packages:id,name,mileage_milestone'
        ])
        ->where('customer_id', $customer->id)
        ->where('id', $id)
        ->first();

        if (!$appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Lịch hẹn không tồn tại hoặc bạn không có quyền xem.',
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'success' => true,
            'data'    => $appointment,
        ], Response::HTTP_OK);
    }

    /**
     * Cập nhật thông tin / đổi giờ hẹn
     */
    public function update(UpdateAppointmentRequest $request, int $id): JsonResponse
    {
        try {
            $account = $request->user();
            $customer = Customer::where('account_id', $account->id)->first();
            $appointment = Appointment::where('id', $id)->where('customer_id', $customer->id)->first();

            if (!$appointment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Lịch hẹn không tồn tại hoặc bạn không có quyền thao tác.',
                ], Response::HTTP_NOT_FOUND);
            }

            // Chỉ cho phép sửa khi còn PENDING
            if ($appointment->status !== 'PENDING') {
                return response()->json([
                    'success' => false,
                    'message' => 'Lịch hẹn đã được xác nhận hoặc tiếp nhận, không thể chỉnh sửa.',
                ], Response::HTTP_BAD_REQUEST);
            }

            $validated = $request->validated();

            DB::transaction(function () use ($appointment, $validated, $customer) {
                // Nếu đổi xe: kiểm tra xe mới thuộc khách hàng
                if (isset($validated['vehicle_id']) && $validated['vehicle_id'] !== $appointment->vehicle_id) {
                    $hasVehicle = Vehicle::where('id', $validated['vehicle_id'])
                        ->where('customer_id', $customer->id)
                        ->exists();
                    if (!$hasVehicle) {
                        throw new Exception('Phương tiện không thuộc sở hữu của bạn.');
                    }
                }

                // Nếu đổi ngày hoặc giờ hẹn: kiểm tra lịch mở cửa và slot
                if (isset($validated['appointment_date']) || isset($validated['appointment_time'])) {
                    $newDate = $validated['appointment_date'] ?? $appointment->appointment_date;
                    $newTime = isset($validated['appointment_time']) 
                        ? Carbon::parse($validated['appointment_time'])->format('H:i:s')
                        : $appointment->appointment_time;

                    // Kiểm tra ngày nghỉ
                    $isHoliday = DB::table('holidays')->where('holiday_date', $newDate)->exists();
                    if ($isHoliday) {
                        throw new Exception('Garage đóng cửa nghỉ lễ vào ngày này.');
                    }

                    // Kiểm tra giờ làm việc (hệ 0..6 hoặc 2..8 theo seeder của bạn)
                    $bookingDate = Carbon::parse($newDate);
                    $rawDay = $bookingDate->dayOfWeek;
                    $dayOfWeek = ($rawDay === 0) ? 8 : ($rawDay + 1);

                    $wh = DB::table('working_hours')->where('day_of_week', $dayOfWeek)->where('is_active', true)->first();
                    if (!$wh || $newTime < $wh->open_time || $newTime > $wh->close_time) {
                        throw new Exception('Giờ hẹn không nằm trong khung giờ làm việc.');
                    }

                    // Kiểm tra slot (loại trừ chính appointment hiện tại)
                    $booked = DB::table('appointments')
                        ->where('appointment_date', $newDate)
                        ->where('appointment_time', $newTime)
                        ->where('status', '!=', 'CANCELLED')
                        ->where('id', '!=', $appointment->id)
                        ->count();

                    if ($booked >= $wh->max_slots) {
                        throw new Exception('Khung giờ này đã đầy, vui lòng chọn giờ khác.');
                    }
                }

                // Cập nhật thông tin bảng appointments
                $appointment->update(collect($validated)->except(['service_ids', 'package_ids'])->toArray());

                // Cập nhật bảng quan hệ nếu có truyền
                if (isset($validated['service_ids'])) {
                    $appointment->services()->sync($validated['service_ids']);
                }
                if (isset($validated['package_ids'])) {
                    $appointment->packages()->sync($validated['package_ids']);
                }
            });

            return response()->json([
                'success' => true,
                'message' => 'Cập nhật lịch hẹn thành công.',
                'data'    => $appointment->fresh(),
            ], Response::HTTP_OK);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    /**
     * Khách hàng hủy lịch hẹn
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $account = $request->user();
        $customer = Customer::where('account_id', $account->id)->first();

        $appointment = Appointment::where('id', $id)
            ->where('customer_id', $customer->id)
            ->first();

        if (!$appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Lịch hẹn không tồn tại hoặc bạn không có quyền hủy.',
            ], Response::HTTP_NOT_FOUND);
        }

        // Chỉ cho phép hủy nếu chưa tiếp nhận (PENDING hoặc CONFIRMED)
        if (!in_array($appointment->status, ['PENDING', 'CONFIRMED'])) {
            return response()->json([
                'success' => false,
                'message' => 'Lịch hẹn không thể hủy ở trạng thái hiện tại.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $appointment->update([
            'status'        => 'CANCELLED',
            'cancel_reason' => $request->input('cancel_reason', 'Khách hàng chủ động hủy'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Hủy lịch hẹn thành công.',
        ], Response::HTTP_OK);
    }
}