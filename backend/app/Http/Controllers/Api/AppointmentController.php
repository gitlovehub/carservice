<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAppointmentRequest;
use App\Models\Appointment;
use App\Models\Customer;
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
                    ->where('is_active', true)
                    ->first();

                if (!$workingHour) {
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
                if (!empty($validated['service_ids'])) {
                    $servicesData = collect($validated['service_ids'])->map(fn($sId) => [
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
}