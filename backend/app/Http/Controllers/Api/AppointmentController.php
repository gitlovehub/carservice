<?php

namespace App\Http\Controllers\Api;

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

                // 4. Kiểm tra giờ làm việc & ngày trong tuần (0: CN -> 6: Thứ 7)
                $bookingDate = Carbon::parse($validated['appointment_date']);
                $dayOfWeek = $bookingDate->dayOfWeek;

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
}