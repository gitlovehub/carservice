<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInternalAppointmentRequest;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Vehicle;
use App\Services\AppointmentActivityService;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class AdvisorAppointmentController extends Controller
{
    public function __construct(private readonly AppointmentActivityService $activity) {}

    public function store(StoreInternalAppointmentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $actor = $request->user();
        $appointment = DB::transaction(function () use ($data, $actor) {
            $date = $data['appointment_date'];
            $time = $data['appointment_time'].':00';
            $when = Carbon::createFromFormat('Y-m-d H:i:s', "$date $time");
            $customer = Customer::query()->lockForUpdate()->findOrFail($data['customer_id']);
            $vehicle = Vehicle::query()
                ->whereKey($data['vehicle_id'])
                ->where('customer_id', $customer->id)
                ->first();

            if (! $vehicle) {
                throw ValidationException::withMessages([
                    'vehicle_id' => 'Xe không thuộc khách hàng đã chọn.',
                ]);
            }

            if ($when->lessThanOrEqualTo(now())) {
                throw ValidationException::withMessages([
                    'appointment_time' => 'Giờ hẹn phải ở tương lai.',
                ]);
            }

            $hours = DB::table('working_hours')
                ->where('day_of_week', $when->dayOfWeek)
                ->lockForUpdate()
                ->first();

            if (DB::table('holidays')->where('holiday_date', $date)->exists()) {
                throw ValidationException::withMessages([
                    'appointment_date' => 'Garage nghỉ lễ ngày này.',
                ]);
            }

            if (! $hours || ! $hours->is_active
                || $time < substr($hours->open_time, 0, 8)
                || $time >= substr($hours->close_time, 0, 8)) {
                throw ValidationException::withMessages([
                    'appointment_time' => 'Ngoài giờ làm việc của garage.',
                ]);
            }

            $activeInSlot = Appointment::query()
                ->where('appointment_date', $date)
                ->where('appointment_time', $time)
                ->whereNotIn('status', ['CANCELLED', 'NO_SHOW']);

            if ($activeInSlot->count() >= (int) ($hours->max_slots ?? 5)) {
                throw ValidationException::withMessages([
                    'appointment_time' => 'Khung giờ đã đầy.',
                ]);
            }

            if ((clone $activeInSlot)->where('vehicle_id', $vehicle->id)->exists()) {
                throw ValidationException::withMessages([
                    'vehicle_id' => 'Xe đã có lịch hẹn tại khung giờ này.',
                ]);
            }

            $appointment = Appointment::query()->create([
                'appointment_code' => 'APT-'.$when->format('Ymd').'-'.strtoupper(Str::random(8)),
                'customer_id' => $customer->id,
                'vehicle_id' => $vehicle->id,
                'appointment_date' => $date,
                'appointment_time' => $time,
                'request_type' => $data['request_type'],
                'symptom_description' => $data['symptom_description'] ?? null,
                'note' => $data['note'] ?? null,
                'status' => 'PENDING',
            ]);

            $appointment->syncRequestedItems($data['service_ids'] ?? [], $data['package_ids'] ?? []);
            $appointment->forceFill(['created_by_account_id' => $actor->id])->save();
            $this->activity->record($appointment, AppointmentActivityService::CREATED, $actor, [], ['status' => 'PENDING']);

            return $appointment;
        });

        return response()->json([
            'success' => true,
            'message' => 'Tạo lịch nội bộ thành công.',
            'data' => $appointment->load(['customer', 'vehicle']),
        ], Response::HTTP_CREATED);
    }

    /**
     * Danh sách lịch hẹn toàn garage dành cho Cố vấn/Admin
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Appointment::with([
                'customer:id,full_name,phone,email',
                'vehicle:id,license_plate,model_id,variant,year',
                'vehicle.model.brand:id,name',
                'services:id,name,base_price',
                'packages:id,name,mileage_milestone',
                // Nhân viên xử lý gần nhất.
                'handledBy:id,email,role', 'handledBy.employee:id,account_id,full_name',
            ]);

            // Lọc theo nhân viên xử lý (tài khoản cố vấn).
            if ($request->filled('handled_by')) {
                $query->where('handled_by_account_id', (int) $request->query('handled_by'));
            }

            // Lọc theo ngày hẹn cụ thể (YYYY-MM-DD)
            if ($request->filled('date')) {
                $query->whereDate('appointment_date', $request->query('date'));
            }

            // Lọc theo trạng thái (PENDING, CONFIRMED, CHECKED_IN, CANCELLED)
            if ($request->filled('status')) {
                $query->where('status', $request->query('status'));
            }

            // Tìm kiếm theo biển số xe hoặc tên/SĐT khách hàng
            if ($request->filled('search')) {
                $search = $request->query('search');
                $query->where(function ($q) use ($search) {
                    $q->whereHas('vehicle', function ($v) use ($search) {
                        $v->where('license_plate', 'like', "%{$search}%");
                    })
                        ->orWhereHas('customer', function ($c) use ($search) {
                            $c->where('full_name', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%");
                        })
                        ->orWhere('appointment_code', 'like', "%{$search}%");
                });
            }

            // Mặc định sắp xếp ngày gần nhất lên trước
            $appointments = $query->orderBy('appointment_date', 'asc')
                ->orderBy('appointment_time', 'asc')
                ->paginate($request->query('per_page', 15));

            return response()->json([
                'success' => true,
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
     * Xem chi tiết 1 lịch hẹn bất kỳ
     */
    public function show(int $id): JsonResponse
    {
        $appointment = Appointment::with([
            'customer',
            'vehicle.model.brand',
            'services:id,name,category,base_price,estimated_minutes',
            'packages:id,name,description,mileage_milestone',
            'packages.services:id,name',
            'packages.parts:id,name,unit',
            'handledBy:id,email,role', 'handledBy.employee:id,account_id,full_name',
            'createdBy:id,email,role', 'createdBy.employee:id,account_id,full_name',
            // Lịch sử: ai xác nhận / tiếp nhận / đổi / hủy, lúc nào, lý do.
            'activities:id,account_id,action,auditable_type,auditable_id,old_values,new_values,reason,created_at',
            'activities.account:id,email,role', 'activities.account.employee:id,account_id,full_name',
        ])->find($id);

        if (! $appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy lịch hẹn.',
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'success' => true,
            'data' => $appointment,
        ], Response::HTTP_OK);
    }

    /**
     * Cố vấn duyệt / xác nhận lịch hẹn (PENDING -> CONFIRMED)
     */
    public function confirm(Request $request, int $id): JsonResponse
    {
        $appointment = Appointment::find($id);

        if (! $appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy lịch hẹn.',
            ], Response::HTTP_NOT_FOUND);
        }

        if ($appointment->status !== 'PENDING') {
            return response()->json([
                'success' => false,
                'message' => "Chỉ có thể xác nhận lịch hẹn đang ở trạng thái PENDING. Trạng thái hiện tại: {$appointment->status}",
            ], Response::HTTP_BAD_REQUEST);
        }

        $appointment->update([
            'status' => 'CONFIRMED',
        ]);
        $this->activity->record($appointment, AppointmentActivityService::CONFIRMED, $request->user(), ['status' => 'PENDING'], ['status' => 'CONFIRMED']);

        return response()->json([
            'success' => true,
            'message' => 'Xác nhận lịch hẹn thành công.',
            'data' => $appointment->fresh(),
        ], Response::HTTP_OK);
    }

    /**
     * Tiếp nhận xe tại garage (CONFIRMED -> CHECKED_IN)
     */
    public function checkIn(Request $request, int $id): JsonResponse
    {
        $appointment = Appointment::find($id);

        if (! $appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy lịch hẹn.',
            ], Response::HTTP_NOT_FOUND);
        }

        if ($appointment->status !== 'CONFIRMED') {
            return response()->json([
                'success' => false,
                'message' => "Chỉ có thể tiếp nhận xe khi lịch hẹn đã được duyệt (CONFIRMED). Trạng thái hiện tại: {$appointment->status}",
            ], Response::HTTP_BAD_REQUEST);
        }

        $appointment->update([
            'status' => 'CHECKED_IN',
        ]);
        $this->activity->record($appointment, AppointmentActivityService::CHECKED_IN, $request->user(), ['status' => 'CONFIRMED'], ['status' => 'CHECKED_IN']);

        return response()->json([
            'success' => true,
            'message' => 'Tiếp nhận xe vào garage thành công. Sẵn sàng lập Lệnh sửa chữa.',
            'data' => $appointment->fresh(),
        ], Response::HTTP_OK);
    }

    /**
     * Cố vấn từ chối hoặc hủy lịch hẹn
     */
    public function cancel(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'cancel_reason' => 'required|string|max:255',
        ]);

        $appointment = Appointment::find($id);

        if (! $appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy lịch hẹn.',
            ], Response::HTTP_NOT_FOUND);
        }

        if (in_array($appointment->status, ['CHECKED_IN', 'CANCELLED'])) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể hủy lịch hẹn đã tiếp nhận hoặc đã hủy trước đó.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $oldStatus = $appointment->status;
        $appointment->update([
            'status' => 'CANCELLED',
            'cancel_reason' => $request->input('cancel_reason'),
        ]);
        $this->activity->record($appointment, AppointmentActivityService::CANCELLED, $request->user(), ['status' => $oldStatus], ['status' => 'CANCELLED'], $request->input('cancel_reason'));

        return response()->json([
            'success' => true,
            'message' => 'Đã hủy lịch hẹn thành công.',
            'data' => $appointment->fresh(),
        ], Response::HTTP_OK);
    }

    /**
     * Cố vấn đổi lịch giúp khách: bắt buộc lý do, kiểm khung giờ như khi đặt lịch, ghi ai đổi, báo khách (web + email).
     */
    public function reschedule(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'appointment_date' => ['required', 'date_format:Y-m-d'],
            'appointment_time' => ['required', 'date_format:H:i'],
            'reason' => ['required', 'string', 'min:5', 'max:255'],
        ]);
        $appointment = Appointment::query()->findOrFail($id);
        $updated = $this->activity->reschedule($appointment, $data['appointment_date'], $data['appointment_time'], $data['reason'], $request->user());

        return response()->json([
            'success' => true,
            'message' => 'Đã đổi lịch và báo khách.',
            'data' => $updated->fresh(['customer', 'vehicle', 'handledBy.employee']),
        ], Response::HTTP_OK);
    }
}
