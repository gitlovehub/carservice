<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Requests\UpdateAppointmentRequest;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Service;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
        $validated = $request->validated();
        $customer = Customer::where('account_id', $request->user()->id)->first();

        if (! $customer) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy hồ sơ khách hàng.'], 404);
        }

        try {
            $appointment = DB::transaction(function () use ($validated, $customer) {
                $date = $validated['appointment_date'];
                $time = $validated['appointment_time'].':00';
                $when = Carbon::createFromFormat('Y-m-d H:i:s', "$date $time");

                if ($when->lessThanOrEqualTo(now())) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['appointment_time' => 'Giờ hẹn phải ở tương lai.']);
                }
                if (DB::table('holidays')->where('holiday_date', $date)->exists()) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['appointment_date' => 'Garage nghỉ lễ ngày này.']);
                }

                $day = $when->dayOfWeek;
                $hours = DB::table('working_hours')->where('day_of_week', $day)->first();
                if (! $hours) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['appointment_date' => 'Garage chưa cấu hình giờ làm việc cho ngày này.']);
                }
                if (! $hours->is_active || $time < substr($hours->open_time, 0, 8) || $time >= substr($hours->close_time, 0, 8)) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['appointment_time' => 'Ngoài giờ làm việc của garage.']);
                }

                // Khóa ngày làm việc trước khi kiểm tra số slot (thứ tự khóa nhất quán).
                DB::table('working_hours')->where('day_of_week', $day)->lockForUpdate()->first();

                // Khóa bản ghi customer để tuần tự hóa các request của cùng khách hàng.
                Customer::whereKey($customer->id)->lockForUpdate()->firstOrFail();

                if (isset($validated['vehicle_id'])) {
                    $vehicle = Vehicle::whereKey($validated['vehicle_id'])
                        ->where('customer_id', $customer->id)->first();
                    if (! $vehicle) {
                        throw \Illuminate\Validation\ValidationException::withMessages(['vehicle_id' => 'Xe không tồn tại hoặc không thuộc tài khoản của bạn.']);
                    }
                } else {
                    $input = $validated['new_vehicle'];
                    $plate = isset($input['license_plate']) ? strtoupper(trim($input['license_plate'])) : null;
                    if ($plate !== null && Vehicle::where('license_plate', $plate)->exists()) {
                        throw \Illuminate\Validation\ValidationException::withMessages(['new_vehicle.license_plate' => 'Biển số đã tồn tại.']);
                    }
                    $type = match ($input['vehicle_type']) {
                        'Sedan / Hatchback (4-5 chỗ)' => 'SEDAN',
                        'SUV / Crossover (5-7 chỗ)' => 'SUV',
                        'PICKUP' => 'PICKUP',
                        default => 'MPV',
                    };
                    $brand = VehicleBrand::firstOrCreate(['name' => trim($input['brand'])], ['status' => 'ACTIVE']);
                    $model = VehicleModel::firstOrCreate(
                        ['brand_id' => $brand->id, 'name' => trim($input['model'])],
                        ['body_type' => $type, 'status' => 'ACTIVE']
                    );
                    $vehicle = Vehicle::create([
                        'customer_id' => $customer->id,
                        'model_id' => $model->id,
                        'license_plate' => $plate,
                    ]);
                }

                $booked = DB::table('appointments')
                    ->where('appointment_date', $date)
                    ->where('appointment_time', $time)
                    ->whereNotIn('status', ['CANCELLED', 'NO_SHOW'])
                    ->count();
                if ($booked >= (int) ($hours->max_slots ?? 5)) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['appointment_time' => 'Khung giờ đã đầy.']);
                }
                $duplicate = Appointment::where('vehicle_id', $vehicle->id)
                    ->where('appointment_date', $date)
                    ->where('appointment_time', $time)
                    ->whereNotIn('status', ['CANCELLED', 'NO_SHOW'])->exists();
                if ($duplicate) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['vehicle_id' => 'Xe đã có lịch hẹn tại khung giờ này.']);
                }

                $appointment = Appointment::create([
                    'appointment_code' => 'APT-'.$when->format('Ymd').'-'.strtoupper(Str::random(8)),
                    'customer_id' => $customer->id,
                    'vehicle_id' => $vehicle->id,
                    'appointment_date' => $date,
                    'appointment_time' => $time,
                    'request_type' => $validated['request_type'],
                    'symptom_description' => $validated['symptom_description'] ?? null,
                    'note' => $validated['note'] ?? null,
                    'status' => 'PENDING',
                ]);
                $ids = $validated['service_ids'] ?? [];
                if (! empty($validated['service_name'])) {
                    $defaults = [
                        'Bảo dưỡng định kỳ' => ['category' => 'Bảo dưỡng định kỳ', 'base_price' => 500000, 'estimated_minutes' => 60, 'status' => 'ACTIVE'],
                        'Kiểm tra tổng quát' => ['category' => 'Kiểm tra tổng quát', 'base_price' => 300000, 'estimated_minutes' => 60, 'status' => 'ACTIVE'],
                        'Thay dầu động cơ' => ['category' => 'Bảo dưỡng định kỳ', 'base_price' => 350000, 'estimated_minutes' => 30, 'status' => 'ACTIVE'],
                    ];
                    $service = Service::firstOrCreate(['name' => $validated['service_name']], $defaults[$validated['service_name']]);
                    $ids[] = $service->id;
                }
                $appointment->services()->sync(array_unique($ids));
                $appointment->packages()->sync($validated['package_ids'] ?? []);

                return $appointment;
            }, 3);

            return response()->json([
                'success' => true,
                'message' => 'Đặt lịch hẹn thành công.',
                'data' => [
                    'id' => $appointment->id,
                    'appointment_code' => $appointment->appointment_code,
                    'vehicle_id' => $appointment->vehicle_id,
                    'status' => $appointment->status,
                    'appointment_date' => $appointment->appointment_date,
                    'appointment_time' => $appointment->appointment_time,
                ],
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);
            return response()->json(['success' => false, 'message' => 'Không thể đặt lịch lúc này.'], 500);
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
            if (! $customer) {
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
                'packages:id,name,mileage_milestone',
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
                'data' => $appointments->items(),
                'pagination' => [
                    'current_page' => $appointments->currentPage(),
                    'per_page' => $appointments->perPage(),
                    'total' => $appointments->total(),
                    'last_page' => $appointments->lastPage(),
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

        if (! $customer) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy hồ sơ khách hàng.'], 404);
        }

        $appointment = Appointment::with([
            'vehicle.model.brand',
            'services:id,name,base_price,estimated_minutes',
            'packages:id,name,mileage_milestone',
        ])
            ->where('customer_id', $customer->id)
            ->where('id', $id)
            ->first();

        if (! $appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Lịch hẹn không tồn tại hoặc bạn không có quyền xem.',
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'success' => true,
            'data' => $appointment,
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
            if (! $customer) {
                return response()->json(['success' => false, 'message' => 'Không tìm thấy hồ sơ khách hàng.'], 404);
            }
            $appointment = Appointment::where('id', $id)->where('customer_id', $customer->id)->first();

            if (! $appointment) {
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
                    if (! $hasVehicle) {
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
                    $dayOfWeek = $rawDay;

                    $wh = DB::table('working_hours')->where('day_of_week', $dayOfWeek)->where('is_active', true)->lockForUpdate()->first();
                    if (Carbon::parse($newDate.' '.$newTime)->lessThanOrEqualTo(now()) || ! $wh || $newTime < $wh->open_time || $newTime >= $wh->close_time) {
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
                'data' => $appointment->fresh(),
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

        if (! $customer) {
            return response()->json(['success' => false, 'message' => 'Không tìm thấy hồ sơ khách hàng.'], 404);
        }

        $appointment = Appointment::where('id', $id)
            ->where('customer_id', $customer->id)
            ->first();

        if (! $appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Lịch hẹn không tồn tại hoặc bạn không có quyền hủy.',
            ], Response::HTTP_NOT_FOUND);
        }

        // Chỉ cho phép hủy nếu chưa tiếp nhận (PENDING hoặc CONFIRMED)
        if (! in_array($appointment->status, ['PENDING', 'CONFIRMED'])) {
            return response()->json([
                'success' => false,
                'message' => 'Lịch hẹn không thể hủy ở trạng thái hiện tại.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $appointment->update([
            'status' => 'CANCELLED',
            'cancel_reason' => $request->input('cancel_reason', 'Khách hàng chủ động hủy'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Hủy lịch hẹn thành công.',
        ], Response::HTTP_OK);
    }
}
