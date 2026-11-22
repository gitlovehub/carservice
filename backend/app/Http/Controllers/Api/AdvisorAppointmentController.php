<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AppliesSort;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInternalAppointmentRequest;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\MaintenancePackage;
use App\Models\Service;
use App\Models\Vehicle;
use App\Services\AppointmentActivityService;
use App\Services\AppointmentEmailConfirmationService;
use App\Services\AppointmentSlotService;
use App\Services\CapacityService;
use App\Services\CounterRecordService;
use App\Services\CustomerNotifier;
use App\Services\CustomerReschedulePolicy;
use App\Support\GarageDay;
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
    use AppliesSort;

    public function __construct(
        private readonly AppointmentActivityService $activity,
        private readonly CustomerNotifier $notifier,
        private readonly AppointmentSlotService $slots,
        private readonly CounterRecordService $counterRecords,
    ) {}

    /** GET /api/advisor/booking-availability?date= — tình trạng từng khung giờ trong ngày (ADV-04). */
    public function availability(Request $request): JsonResponse
    {
        $data = $request->validate(['date' => ['required', 'date_format:Y-m-d']]);

        return response()->json(['data' => $this->slots->availability($data['date'])]);
    }

    public function store(StoreInternalAppointmentRequest $request): JsonResponse
    {
        $actor = $request->user();
        $appointment = DB::transaction(function () use ($request, $actor) {
            // ADV-04: khách gọi điện / chưa có hồ sơ → tạo khách + xe cùng lịch (lỗi phía sau thì rollback hết).
            $data = $this->counterRecords->resolve($request->validated());
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

            // Cùng quy tắc với đổi lịch: tương lai, không nghỉ lễ, trong giờ làm việc, đúng khung giờ đặt lịch, còn chỗ, xe chưa có lịch trùng giờ.
            $this->slots->assertBookable($date, $time, (int) $vehicle->id, requireConfiguredSlot: true);

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
                'vehicle:id,license_plate,model_id,variant,year,mileage',
                'vehicle.model.brand:id,name',
                'services:id,name,base_price,estimated_minutes',
                'packages:id,name,mileage_milestone',
                // Cần cả tên: modal Chi tiết lịch hẹn liệt kê dịch vụ trong gói từ dữ liệu danh sách.
                'packages.services:id,name,estimated_minutes',
                // Nhân viên xử lý gần nhất.
                'handledBy:id,email,role', 'handledBy.employee:id,account_id,full_name',
                // ADV-08: phiếu đã tạo từ lịch (trang Tiếp nhận biết lịch nào đã có phiếu).
                'repairOrder:id,appointment_id,repair_order_code,status',
            ]);

            // Lọc theo nhân viên xử lý (tài khoản cố vấn).
            if ($request->filled('handled_by')) {
                $query->where('handled_by_account_id', (int) $request->query('handled_by'));
            }

            // Lọc theo ngày hẹn cụ thể (YYYY-MM-DD)
            // appointment_date là cột DATE: so sánh trực tiếp (không bọc DATE()) để dùng được index idx_appointments_datetime.
            if ($request->filled('date')) {
                $query->where('appointment_date', $this->day($request->query('date')));
            }

            // Lọc theo khoảng ngày (YYYY-MM-DD): Ngày / 7 ngày / Tháng / Tùy chỉnh (cố vấn), tuần (Admin).
            if ($request->filled('date_from')) {
                $query->where('appointment_date', '>=', $this->day($request->query('date_from')));
            }
            if ($request->filled('date_to')) {
                $query->where('appointment_date', '<=', $this->day($request->query('date_to')));
            }

            // Loại yêu cầu (MAINTENANCE, REPAIR, DIAGNOSIS, REPLACEMENT).
            if ($request->filled('request_type')) {
                $query->where('request_type', $request->query('request_type'));
            }

            // ADV-08: lọc theo dịch vụ khách yêu cầu (chọn lẻ hoặc nằm trong gói đã chọn).
            if ($request->filled('service_id')) {
                $serviceId = (int) $request->query('service_id');
                $query->where(fn ($q) => $q->whereHas('services', fn ($s) => $s->where('services.id', $serviceId))
                    ->orWhereHas('packages.services', fn ($s) => $s->where('services.id', $serviceId)));
            }

            // Lọc nhiều gói bảo dưỡng / dịch vụ cùng lúc (?package_ids=1,2&service_ids=3): khớp BẤT KỲ mục nào được chọn
            // (dịch vụ tính cả khi nằm trong gói khách chọn).
            $serviceIds = $this->idList($request->query('service_ids'));
            $packageIds = $this->idList($request->query('package_ids'));
            if ($serviceIds || $packageIds) {
                $query->where(function ($q) use ($serviceIds, $packageIds) {
                    if ($serviceIds) {
                        $q->orWhereHas('services', fn ($s) => $s->whereKey($serviceIds))
                            ->orWhereHas('packages.services', fn ($s) => $s->whereKey($serviceIds));
                    }
                    if ($packageIds) {
                        $q->orWhereHas('packages', fn ($p) => $p->whereKey($packageIds));
                    }
                });
            }

            // Tìm theo mã lịch, biển số, hãng / dòng xe, tên / SĐT khách. Nhiều từ ("Lexus LX", "Tèo 0901") → mỗi từ phải khớp một trường.
            if ($request->filled('search')) {
                $terms = preg_split('/\s+/u', trim((string) $request->query('search')), -1, PREG_SPLIT_NO_EMPTY) ?: [];
                foreach (array_slice($terms, 0, 5) as $term) {
                    $like = '%'.addcslashes($term, '%_\\').'%';
                    $query->where(function ($q) use ($like) {
                        $q->where('appointment_code', 'like', $like)
                            ->orWhereHas('vehicle', fn ($v) => $v->where('license_plate', 'like', $like))
                            ->orWhereHas('vehicle.model', fn ($m) => $m->where('name', 'like', $like))
                            ->orWhereHas('vehicle.model.brand', fn ($b) => $b->where('name', 'like', $like))
                            ->orWhereHas('customer', fn ($c) => $c->where('full_name', 'like', $like)->orWhere('phone', 'like', $like));
                    });
                }
            }

            // Số lịch theo trạng thái với cùng bộ lọc (trừ trạng thái) — cho các chip lọc nhanh.
            $counts = (clone $query)->setEagerLoads([])->reorder()
                ->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status')
                ->map(fn ($n) => (int) $n);

            // Lọc theo trạng thái (PENDING, CONFIRMED, CHECKED_IN, CANCELLED, NO_SHOW)
            if ($request->filled('status')) {
                $query->where('status', $request->query('status'));
            }
            // Nhiều trạng thái (?statuses=PENDING,CONFIRMED,CHECKED_IN) — trang Tiếp nhận xe lọc ở máy chủ để "Tất cả" không bị cắt bởi per_page.
            if ($request->filled('statuses')) {
                $statuses = array_values(array_filter(array_map('trim', explode(',', (string) $request->query('statuses')))));
                $query->whereIn('status', array_slice($statuses, 0, 10));
            }

            // Có ?sort= (bảng Admin): sắp theo cột được chọn, mặc định mới tạo lên đầu.
            // Không có (màn hình Cố vấn): giữ thứ tự theo ngày giờ hẹn tăng dần.
            if ($request->filled('sort')) {
                $this->applySort($query, $request, [
                    'created' => 'created_at', 'code' => 'appointment_code', 'status' => 'status', 'type' => 'request_type',
                    // Giờ hẹn = ngày rồi giờ; trùng thời điểm thì applySort thêm appointments.id cùng chiều → thứ tự ổn định giữa các trang.
                    'time' => fn ($q, string $dir) => $q->orderBy('appointment_date', $dir)->orderBy('appointment_time', $dir),
                    'customer' => fn ($q, string $dir) => $q->orderBy(Customer::query()->select('full_name')->whereColumn('customers.id', 'appointments.customer_id'), $dir),
                ], tieBreaker: 'appointments.id');
            } else {
                $query->orderBy('appointment_date', 'asc')->orderBy('appointment_time', 'asc');
            }
            // Số lần khách tự đổi lịch trên web (cố vấn thấy nhãn trên bảng). Thêm sau khi đã đếm theo trạng thái.
            $appointments = $query
                ->withCount(['activities as customer_reschedules' => fn ($q) => $q->where('action', CustomerReschedulePolicy::ACTION)])
                ->paginate(min(500, max(1, (int) $request->query('per_page', 15))));
            $appointments->getCollection()->each(fn (Appointment $a) => $this->withEstimates($a));

            return response()->json([
                'success' => true,
                'counts' => ['ALL' => $counts->sum(), ...$counts->all()],
                'data' => $appointments->items(),
                'pagination' => [
                    'current_page' => $appointments->currentPage(),
                    'per_page' => $appointments->perPage(),
                    'total' => $appointments->total(),
                    'last_page' => $appointments->lastPage(),
                ],
            ], Response::HTTP_OK);

        } catch (ValidationException $e) {
            throw $e; // 422 có thông báo, không gộp thành lỗi 500.
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * GET /api/advisor/appointments/filter-options — danh sách gói bảo dưỡng (kể cả gói riêng theo dòng xe) và dịch vụ
     * cho thanh lọc trang Lịch hẹn. Gồm cả mục đã ngừng để lọc được lịch cũ.
     */
    public function filterOptions(): JsonResponse
    {
        $packages = MaintenancePackage::query()->with('vehicleModel.brand:id,name')
            ->orderByRaw("status = 'ACTIVE' desc")->orderBy('mileage_milestone')->orderBy('name')
            ->get(['id', 'name', 'status', 'mileage_milestone', 'vehicle_model_id'])
            ->map(fn (MaintenancePackage $p) => [
                'id' => $p->id, 'name' => $p->name, 'active' => $p->status === 'ACTIVE',
                'model' => $p->vehicleModel ? trim($p->vehicleModel->brand?->name.' '.$p->vehicleModel->name) : null,
            ]);
        $services = Service::query()->orderByRaw("status = 'ACTIVE' desc")->orderBy('category')->orderBy('name')
            ->get(['id', 'name', 'category', 'status'])
            ->map(fn (Service $s) => ['id' => $s->id, 'name' => $s->name, 'category' => $s->category, 'active' => $s->status === 'ACTIVE']);

        return response()->json(['data' => ['packages' => $packages, 'services' => $services]]);
    }

    /** Chuẩn hoá ngày từ query về Y-m-d (sai định dạng → 422). */
    private function day(mixed $value): string
    {
        $text = is_string($value) ? substr($value, 0, 10) : '';
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $text) || ! checkdate((int) substr($text, 5, 2), (int) substr($text, 8, 2), (int) substr($text, 0, 4))) {
            throw ValidationException::withMessages(['date' => 'Ngày lọc không hợp lệ (YYYY-MM-DD).']);
        }

        return $text;
    }

    /** "1,2,abc" → [1, 2]. @return array<int, int> */
    private function idList(mixed $value): array
    {
        return array_values(array_unique(array_filter(array_map('intval', explode(',', is_string($value) ? $value : '')), fn (int $id) => $id > 0)));
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
            'packages.services:id,name,estimated_minutes',
            'packages.parts:id,name,unit',
            'handledBy:id,email,role', 'handledBy.employee:id,account_id,full_name',
            'createdBy:id,email,role', 'createdBy.employee:id,account_id,full_name',
            'repairOrder:id,appointment_id,repair_order_code,status',
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
            'data' => $this->withEstimates($appointment),
        ], Response::HTTP_OK);
    }

    /**
     * Khách không đến (CONFIRMED/PENDING → NO_SHOW): chỉ khi đã qua giờ hẹn. Giải phóng chỗ trong khung giờ.
     */
    public function noShow(Request $request, int $id): JsonResponse
    {
        $appointment = Appointment::query()->findOrFail($id);

        if (! in_array($appointment->status, ['PENDING', 'CONFIRMED'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ đánh dấu "Không đến" cho lịch đang chờ hoặc đã xác nhận.',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Giờ hẹn là giờ gara (VN); app chạy UTC nên phải parse theo múi giờ gara.
        $when = Carbon::parse(Carbon::parse($appointment->appointment_date)->toDateString().' '.substr((string) $appointment->appointment_time, 0, 8), GarageDay::TIMEZONE);
        if ($when->isFuture()) {
            return response()->json([
                'success' => false,
                'message' => 'Chưa tới giờ hẹn '.$when->format('H:i d/m/Y').', chưa thể đánh dấu khách không đến.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $oldStatus = $appointment->status;
        $appointment->update(['status' => 'NO_SHOW']);
        $this->activity->record($appointment, AppointmentActivityService::NO_SHOW, $request->user(), ['status' => $oldStatus], ['status' => 'NO_SHOW']);

        return response()->json([
            'success' => true,
            'message' => "Đã đánh dấu khách không đến lịch {$appointment->appointment_code}.",
            'data' => $appointment->fresh(),
        ], Response::HTTP_OK);
    }

    /**
     * Thêm số liệu dự kiến cho lịch: thời lượng (theo phút chuẩn dịch vụ, mặc định 60′), giờ kết thúc, tổng tiền dự kiến
     * (giá chốt lúc đặt; dịch vụ cũ chưa có giá chốt thì lấy giá niêm yết).
     */
    private function withEstimates(Appointment $appointment): Appointment
    {
        $minutes = app(CapacityService::class)->appointmentMinutes($appointment);
        $start = Carbon::createFromFormat('H:i:s', substr((string) $appointment->appointment_time, 0, 8));
        $total = $appointment->services->sum(fn ($s) => (float) ($s->pivot->estimated_price ?? $s->base_price))
            + $appointment->packages->sum(fn ($p) => (float) ($p->pivot->estimated_price ?? 0));

        $appointment->setAttribute('estimated_minutes', $minutes);
        $appointment->setAttribute('end_time', $start->copy()->addMinutes($minutes)->format('H:i'));
        $appointment->setAttribute('estimated_total', round($total, 2));

        return $appointment;
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
        $this->notifier->appointmentConfirmed($appointment);

        return response()->json([
            'success' => true,
            'message' => 'Xác nhận lịch hẹn thành công.',
            'data' => $appointment->fresh(),
        ], Response::HTTP_OK);
    }

    /**
     * Gửi email kèm dịch vụ đã đặt + nút "Xác nhận lịch hẹn" để khách tự xác nhận (PENDING → CONFIRMED khi khách bấm).
     */
    public function sendConfirmationEmail(Request $request, int $id, AppointmentEmailConfirmationService $emailConfirmation): JsonResponse
    {
        $appointment = Appointment::query()->with('customer.account')->findOrFail($id);
        try {
            $email = $emailConfirmation->send($appointment, $request->user());
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['success' => false, 'message' => 'Không gửi được email. Vui lòng thử lại hoặc gọi điện cho khách.'], Response::HTTP_BAD_GATEWAY);
        }

        return response()->json([
            'success' => true,
            'message' => "Đã gửi email xác nhận tới {$email}. Lịch tự chuyển sang Đã xác nhận khi khách bấm trong email.",
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
        $this->notifier->appointmentCancelled($appointment, (string) $request->input('cancel_reason'));

        return response()->json([
            'success' => true,
            'message' => 'Đã hủy lịch hẹn thành công.',
            'data' => $appointment->fresh(),
        ], Response::HTTP_OK);
    }

    /**
     * Cố vấn đổi lịch SAU KHI đã thống nhất với khách (gọi điện / tại quầy…): khách không phải xác nhận lại trên web.
     * Bắt buộc: loại lý do (+ ghi chú khi "Lý do khác"), xác nhận khách đã đồng ý (kiểm ở backend), cách liên hệ.
     * expected_date / expected_time: ngày giờ cố vấn đang thấy — khác DB (người khác vừa đổi) thì từ chối.
     */
    public function reschedule(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'appointment_date' => ['required', 'date_format:Y-m-d'],
            'appointment_time' => ['required', 'date_format:H:i'],
            'reason_type' => ['required', 'in:'.implode(',', array_keys(AppointmentActivityService::RESCHEDULE_REASONS))],
            'reason' => ['nullable', 'string', 'max:255', 'required_if:reason_type,OTHER', 'min:5'],
            'customer_agreed' => ['accepted'],
            'contact_method' => ['required', 'in:'.implode(',', array_keys(AppointmentActivityService::CONTACT_METHODS))],
            'expected_date' => ['nullable', 'date_format:Y-m-d'],
            'expected_time' => ['nullable', 'date_format:H:i'],
        ], [
            'customer_agreed.accepted' => 'Chỉ đổi lịch sau khi đã liên hệ và khách đồng ý giờ mới. Lịch cũ được giữ nguyên.',
            'reason.required_if' => 'Nhập lý do đổi lịch (ít nhất 5 ký tự).',
            'reason.min' => 'Lý do đổi lịch cần ít nhất 5 ký tự.',
            'reason_type.required' => 'Chọn lý do đổi lịch.',
            'contact_method.required' => 'Chọn cách đã liên hệ với khách.',
        ]);
        $note = trim((string) ($data['reason'] ?? ''));
        // Lý do lưu lịch sử + gửi khách: "Khách hàng yêu cầu: bận buổi sáng".
        $reason = AppointmentActivityService::RESCHEDULE_REASONS[$data['reason_type']].($note !== '' ? ": {$note}" : '');
        $appointment = Appointment::query()->findOrFail($id);
        $updated = $this->activity->reschedule($appointment, $data['appointment_date'], $data['appointment_time'], mb_substr($reason, 0, 255), $request->user(), [
            'reason_type' => $data['reason_type'],
            'contact_method' => $data['contact_method'],
            'expected_date' => $data['expected_date'] ?? null,
            'expected_time' => $data['expected_time'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã đổi lịch và báo khách.',
            'data' => $updated->fresh(['customer', 'vehicle', 'handledBy.employee']),
        ], Response::HTTP_OK);
    }
}
