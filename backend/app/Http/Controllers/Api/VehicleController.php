<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Services\VehicleAvatarService;
use App\Support\GarageDay;
use App\Support\LicensePlate;
use App\Support\VehicleCatalogSelection;
use App\Support\VehicleIdentity;
use App\Support\VehicleVin;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class VehicleController extends Controller
{
    /** Hãng, dòng xe và phiên bản để giao diện hiển thị đủ tên xe. */
    private const CATALOG_RELATIONS = ['model.brand:id,name', 'trim:id,model_id,name,status'];

    private const IDENTITY_MESSAGES = [
        'license_plate.string' => LicensePlate::INVALID_MESSAGE,
        'license_plate.max' => LicensePlate::INVALID_MESSAGE,
        'license_plate.unique' => 'Biển số này đã được đăng ký cho một xe khác. Vui lòng kiểm tra lại hoặc liên hệ gara.',
        'vin.string' => VehicleVin::INVALID_MESSAGE,
        'vin.regex' => VehicleVin::INVALID_MESSAGE,
        'vin.unique' => VehicleVin::TAKEN_MESSAGE,
    ];

    /*
    |--------------------------------------------------------------------------
    | ADMIN / ADVISOR - QUẢN LÝ XE
    |--------------------------------------------------------------------------
    */

    /**
     * GET /api/vehicles
     *
     * Lấy danh sách xe.
     * Có thể lọc theo customer_id hoặc tìm kiếm.
     */
    public function index(Request $request)
    {
        $request->validate(['segment' => ['nullable', Rule::in(array_keys($this->segments()))]]);
        $query = Vehicle::with(['customer', ...self::CATALOG_RELATIONS]);
        if ($request->filled('segment')) {
            $this->segments()[$request->input('segment')]($query);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;

            // ADV-09: tìm cả theo chủ xe (tên / SĐT) và hãng / dòng xe.
            $query->where(function ($q) use ($search) {
                $q->where('license_plate', 'like', "%{$search}%")
                    ->orWhere('vin', 'like', "%{$search}%")
                    ->orWhere('variant', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($c) => $c->where('full_name', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%"))
                    ->orWhereHas('model', fn ($m) => $m->where('name', 'like', "%{$search}%")
                        ->orWhereHas('brand', fn ($b) => $b->where('name', 'like', "%{$search}%")));
            });
        }
        if ($request->filled('brand_id')) {
            $query->whereHas('model', fn ($m) => $m->where('brand_id', (int) $request->query('brand_id')));
        }

        $vehicles = $query
            ->with(['repairOrders' => fn ($q) => $q->select('id', 'vehicle_id', 'repair_order_code', 'status')
                ->whereNotIn('status', [RepairOrder::HANDED_OVER, RepairOrder::CLOSED])])
            ->withMax('repairOrders as last_service_at', 'received_at')
            // Mockup 17/11: lịch hẹn sắp tới gần nhất (nhãn "Có lịch hẹn").
            ->withMin(['appointments as next_appointment_date' => fn ($q) => $this->upcoming($q)], 'appointment_date')
            ->latest()
            ->paginate(min(100, max(5, (int) $request->query('per_page', 10))));
        $vehicles->getCollection()->each(function (Vehicle $vehicle): void {
            $vehicle->setAttribute('open_repair_order_id', $vehicle->repairOrders->first()?->id);
            $vehicle->setAttribute('open_repair_order_code', $vehicle->repairOrders->first()?->repair_order_code);
            $vehicle->unsetRelation('repairOrders');
        });

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách xe thành công.',
            'data' => $vehicles,
            'summary' => collect($this->segments())->map(fn (callable $scope) => $scope(Vehicle::query())->count())
                ->put('total', Vehicle::query()->count())->all(),
        ]);
    }

    /** Lịch hẹn còn hiệu lực từ hôm nay (theo ngày gara). */
    private function upcoming($query)
    {
        return $query->whereIn('status', ['PENDING', 'CONFIRMED'])->whereDate('appointment_date', '>=', GarageDay::today());
    }

    /**
     * Nhóm xe cho thẻ số liệu / bộ lọc của cố vấn (mockup 17/11).
     * maintenance = xe từng đặt gói bảo dưỡng định kỳ tại gara (lịch hẹn có gói, không tính lịch đã huỷ).
     *
     * @return array<string, callable(Builder): Builder>
     */
    private function segments(): array
    {
        return [
            'in_shop' => fn (Builder $q) => $q->whereHas('repairOrders', fn ($o) => $o->whereNotIn('status', [RepairOrder::HANDED_OVER, RepairOrder::CLOSED])),
            'upcoming' => fn (Builder $q) => $q->whereHas('appointments', fn ($a) => $this->upcoming($a)),
            'maintenance' => fn (Builder $q) => $q->whereHas('appointments', fn ($a) => $a->where('status', '!=', 'CANCELLED')->has('packages')),
        ];
    }

    /**
     * POST /api/vehicles
     *
     * Admin/Advisor thêm xe cho khách hàng.
     */
    public function store(Request $request)
    {
        $this->normalizeVinInput($request);

        // Thêm lại xe khách đã xoá (cùng biển số / VIN) → khôi phục hồ sơ cũ kèm lịch sử, không tạo bản trùng.
        $customerId = (int) $request->input('customer_id');
        if ($customerId > 0 && ($restored = $this->restoreDeletedVehicleByPlate($request, $customerId))) {
            return response()->json([
                'success' => true,
                'restored' => true,
                'message' => 'Đã khôi phục xe của khách cùng toàn bộ lịch sử bảo dưỡng.',
                'data' => $restored->load('customer'),
            ]);
        }

        $validated = $request->validate([
            'customer_id' => [
                'required',
                'exists:customers,id',
            ],

            'model_id' => [
                'required',
                'exists:vehicle_models,id',
            ],

            'trim_id' => [
                'nullable',
                'integer',
            ],

            'variant' => [
                'nullable',
                'string',
                'max:100',
            ],

            'year' => [
                'nullable',
                'integer',
                'min:1900',
                'max:'.(date('Y') + 1),
            ],

            'license_plate' => [
                'nullable',
                'string',
                'max:20',
                VehicleIdentity::plateUnique(),
            ],

            'vin' => [
                'nullable',
                'string',
                'regex:'.VehicleVin::PATTERN,
                VehicleIdentity::vinUnique(),
            ],

            'mileage' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'note' => [
                'nullable',
                'string',
            ],
        ], self::IDENTITY_MESSAGES);

        $validated = VehicleCatalogSelection::apply($validated, allowHidden: true);

        $vehicle = Vehicle::create($validated);

        $vehicle->load(['customer', ...self::CATALOG_RELATIONS]);

        return response()->json([
            'success' => true,
            'message' => 'Thêm xe thành công.',
            'data' => $vehicle,
        ], 201);
    }

    /**
     * GET /api/vehicles/{vehicle}
     *
     * Xem chi tiết xe.
     */
    public function show(Vehicle $vehicle)
    {
        // Mockup 17/11 (trang Xe của khách hàng): lịch sử sửa (10 phiếu, hoá đơn + hạng mục), lịch hẹn sắp tới / gần đây, gói bảo dưỡng đã dùng.
        $vehicle->load(['customer', ...self::CATALOG_RELATIONS,
            'repairOrders' => fn ($q) => $q->latest('received_at')->limit(10)
                ->select('id', 'vehicle_id', 'repair_order_code', 'status', 'received_at', 'mileage_received', 'handed_over_at'),
            'repairOrders.invoice:id,repair_order_id,total_amount,status', 'repairOrders.invoice.items:id,invoice_id,description',
            'repairOrders.workItems:id,repair_order_id,description,service_id', 'repairOrders.workItems.service:id,name,status',
        ])->loadCount('repairOrders');
        $vehicle->setAttribute('open_repair_order', $vehicle->repairOrders()->whereNotIn('status', [RepairOrder::HANDED_OVER, RepairOrder::CLOSED])
            ->first(['id', 'repair_order_code', 'status']));
        $vehicle->setAttribute('upcoming_appointments', $this->upcoming($vehicle->appointments())->with('packages:id,name')
            ->orderBy('appointment_date')->orderBy('appointment_time')->limit(5)->get(['id', 'vehicle_id', 'appointment_code', 'appointment_date', 'appointment_time', 'status']));
        $vehicle->setAttribute('past_appointments', $vehicle->appointments()->with('packages:id,name')
            ->where(fn ($q) => $q->whereDate('appointment_date', '<', GarageDay::today())->orWhereNotIn('status', ['PENDING', 'CONFIRMED']))
            ->orderByDesc('appointment_date')->orderByDesc('appointment_time')->limit(5)->get(['id', 'vehicle_id', 'appointment_code', 'appointment_date', 'appointment_time', 'status']));

        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin xe thành công.',
            'data' => $vehicle,
        ]);
    }

    /**
     * PUT/PATCH /api/vehicles/{vehicle}
     *
     * Admin/Advisor cập nhật xe.
     */
    public function update(Request $request, Vehicle $vehicle)
    {
        $this->normalizeVinInput($request);

        $validated = $request->validate([
            'customer_id' => [
                'sometimes',
                'exists:customers,id',
            ],

            'model_id' => [
                'sometimes',
                'exists:vehicle_models,id',
            ],

            'trim_id' => [
                'nullable',
                'integer',
            ],

            'variant' => [
                'nullable',
                'string',
                'max:100',
            ],

            'year' => [
                'nullable',
                'integer',
                'min:1900',
                'max:'.(date('Y') + 1),
            ],

            'license_plate' => [
                'nullable',
                'string',
                'max:20',
                VehicleIdentity::plateUnique($vehicle->id),
            ],

            'vin' => [
                'nullable',
                'string',
                VehicleVin::rule($vehicle->vin),
                VehicleIdentity::vinUnique($vehicle->id),
            ],

            'mileage' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'note' => [
                'nullable',
                'string',
            ],
        ], self::IDENTITY_MESSAGES);

        $vehicle->update(VehicleCatalogSelection::apply($validated, $vehicle, allowHidden: true));

        $vehicle->load(['customer', ...self::CATALOG_RELATIONS]);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật xe thành công.',
            'data' => $vehicle,
        ]);
    }

    /**
     * DELETE /api/vehicles/{vehicle}
     *
     * Admin/Advisor xóa xe.
     */
    public function destroy(Vehicle $vehicle)
    {
        if ($vehicle->hasOpenRepairOrder()) {
            return response()->json([
                'success' => false,
                'message' => 'Xe đang có phiếu sửa chữa chưa giao nên chưa thể xóa.',
            ], 422);
        }

        if ($vehicle->hasActiveAppointment()) {
            return response()->json([
                'success' => false,
                'message' => 'Xe đang có lịch hẹn chưa hoàn tất. Hãy huỷ lịch hẹn trước khi xóa xe.',
            ], 422);
        }

        // Xóa mềm: lịch hẹn và lịch sử sửa chữa vẫn giữ nguyên.
        $vehicle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa xe. Lịch sử sửa chữa vẫn được lưu.',
        ]);
    }

    /**
     * POST /api/vehicles/{vehicle}/avatar — Admin/Cố vấn tải lên hoặc thay ảnh đại diện xe.
     */
    public function uploadAvatar(Request $request, Vehicle $vehicle, VehicleAvatarService $avatars): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'mimetypes:image/jpeg,image/png,image/webp', 'max:'.VehicleAvatarService::MAX_KILOBYTES],
        ], [
            'image.required' => 'Vui lòng chọn ảnh xe.',
            'image.file' => 'Tệp ảnh không hợp lệ. Vui lòng chọn lại.',
            'image.uploaded' => 'Không tải được ảnh lên. Vui lòng chọn ảnh dưới 5 MB rồi thử lại.',
            'image.mimes' => 'Chỉ nhận ảnh JPG, PNG hoặc WebP.',
            'image.mimetypes' => 'Chỉ nhận ảnh JPG, PNG hoặc WebP.',
            'image.max' => 'Ảnh không được vượt quá 5 MB.',
        ]);
        $updated = $avatars->replace($vehicle, $request->file('image'));

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật ảnh đại diện xe.',
            'data' => ['id' => $updated->id, 'avatar_url' => $updated->avatar_url],
        ]);
    }

    /**
     * DELETE /api/vehicles/{vehicle}/avatar — xoá ảnh, xe trở về biểu tượng mặc định.
     */
    public function deleteAvatar(Vehicle $vehicle, VehicleAvatarService $avatars): JsonResponse
    {
        $updated = $avatars->remove($vehicle);

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa ảnh đại diện xe.',
            'data' => ['id' => $updated->id, 'avatar_url' => null],
        ]);
    }

    /**
     * GET /api/vehicle-avatars/{file} — tên file là UUID ngẫu nhiên nên thẻ img hiển thị được mà không lộ danh sách ảnh.
     */
    public function avatar(string $file, VehicleAvatarService $avatars): StreamedResponse
    {
        return $avatars->response($file);
    }

    /**
     * GET /api/customers/{customerId}/vehicles
     *
     * Admin/Advisor xem xe của một khách hàng.
     */
    public function byCustomer($customerId)
    {
        $vehicles = Vehicle::with([
            ...self::CATALOG_RELATIONS,
            // ADV-02/03: quầy tiếp nhận cần biết xe nào đang có phiếu chưa kết thúc (không tạo được phiếu thứ hai).
            'repairOrders' => fn ($q) => $q->select('id', 'vehicle_id', 'repair_order_code', 'status')
                ->whereNotIn('status', [RepairOrder::HANDED_OVER, RepairOrder::CLOSED]),
        ])
            ->where('customer_id', $customerId)
            ->latest()
            ->get()
            ->each(function (Vehicle $vehicle): void {
                $vehicle->setAttribute('open_repair_order_code', $vehicle->repairOrders->first()?->repair_order_code);
                $vehicle->unsetRelation('repairOrders');
            });

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách xe của khách hàng thành công.',
            'data' => $vehicles,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER - QUẢN LÝ XE CỦA CHÍNH MÌNH
    |--------------------------------------------------------------------------
    |
    | Không nhận customer_id từ phía client.
    | Customer được xác định từ Bearer Token:
    |
    | Account đăng nhập
    |      ↓
    | Customer
    |      ↓
    | customer_id
    |
    */

    /**
     * GET /api/me/vehicles
     *
     * Customer xem danh sách xe của chính mình.
     */
    public function myVehicles(Request $request)
    {
        $customer = $this->getAuthenticatedCustomer($request);

        if (! $customer) {
            return $this->customerProfileNotFoundResponse();
        }

        // repair_orders_count > 0 → xe đã có lịch sử, giao diện khóa các trường xác định xe.
        $vehicles = Vehicle::with(self::CATALOG_RELATIONS)
            ->withCount('repairOrders')
            ->where('customer_id', $customer->id)
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách xe của bạn thành công.',
            'data' => $vehicles,
        ]);
    }

    /**
     * POST /api/me/vehicles
     *
     * Customer tự thêm xe.
     *
     * customer_id KHÔNG lấy từ request.
     */
    public function storeMyVehicle(Request $request)
    {
        $customer = $this->getAuthenticatedCustomer($request);

        if (! $customer) {
            return $this->customerProfileNotFoundResponse();
        }

        $modelNames = [
            'Vios',
            'Camry',
            'Corolla Altis',
            'Raize',
            'Corolla Cross',
            'Fortuner',
            'Innova Cross',
            'Hilux',
        ];

        $this->normalizePlateInput($request);
        $this->normalizeVinInput($request);

        // Khách thêm lại biển số của chính xe mình đã xóa → khôi phục xe cũ để nối lại lịch sử.
        $restored = $this->restoreDeletedVehicleByPlate($request, $customer->id);
        if ($restored) {
            return response()->json([
                'success' => true,
                'restored' => true,
                'message' => 'Đã khôi phục xe có biển số này cùng toàn bộ lịch sử bảo dưỡng.',
                'data' => $restored,
            ]);
        }

        $validated = $request->validate([
            'model_id' => [
                'nullable',
                'required_without:model_name',
                'exists:vehicle_models,id',
            ],
            'model_name' => [
                'nullable',
                'required_without:model_id',
                Rule::in($modelNames),
            ],

            'trim_id' => [
                'nullable',
                'integer',
            ],

            'variant' => [
                'nullable',
                'string',
                'max:100',
            ],

            'year' => [
                'nullable',
                'integer',
                'min:1900',
                'max:'.(date('Y') + 1),
            ],

            'license_plate' => [
                'nullable',
                'string',
                'max:20',
                LicensePlate::rule(),
                VehicleIdentity::plateUnique(),
            ],

            'vin' => [
                'nullable',
                'string',
                'regex:'.VehicleVin::PATTERN,
                VehicleIdentity::vinUnique(),
            ],

            'mileage' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'note' => [
                'nullable',
                'string',
            ],
        ], self::IDENTITY_MESSAGES);

        if (! empty($validated['model_name'])) {
            $brand = VehicleBrand::firstOrCreate(
                ['name' => 'Toyota'],
                ['status' => 'ACTIVE'],
            );
            $model = VehicleModel::firstOrCreate([
                'brand_id' => $brand->id,
                'name' => $validated['model_name'],
            ]);
            $validated['model_id'] = $model->id;
            unset($validated['model_name']);
        }

        $validated = VehicleCatalogSelection::apply($validated);

        // Không cho client tự chọn customer_id.
        $validated['customer_id'] = $customer->id;

        $vehicle = Vehicle::create($validated);

        $vehicle->load(self::CATALOG_RELATIONS);

        return response()->json([
            'success' => true,
            'message' => 'Thêm xe của bạn thành công.',
            'data' => $vehicle,
        ], 201);
    }

    /**
     * GET /api/me/vehicles/{vehicle}
     *
     * Customer chỉ xem được xe thuộc chính mình.
     */
    public function showMyVehicle(Request $request, Vehicle $vehicle)
    {
        $customer = $this->getAuthenticatedCustomer($request);

        if (! $customer) {
            return $this->customerProfileNotFoundResponse();
        }

        $this->authorize('own', $vehicle);

        $vehicle->load(self::CATALOG_RELATIONS);

        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin xe thành công.',
            'data' => $vehicle,
        ]);
    }

    /**
     * PATCH /api/me/vehicles/{vehicle}
     *
     * Customer chỉ sửa xe thuộc chính mình.
     *
     * Không cho phép sửa customer_id.
     */
    public function updateMyVehicle(
        Request $request,
        Vehicle $vehicle
    ) {
        $customer = $this->getAuthenticatedCustomer($request);

        if (! $customer) {
            return $this->customerProfileNotFoundResponse();
        }

        $this->authorize('own', $vehicle);
        $this->normalizePlateInput($request);
        $this->normalizeVinInput($request);

        $validated = $request->validate([
            'model_id' => [
                'sometimes',
                'exists:vehicle_models,id',
            ],

            'trim_id' => [
                'nullable',
                'integer',
            ],

            'variant' => [
                'nullable',
                'string',
                'max:100',
            ],

            'year' => [
                'nullable',
                'integer',
                'min:1900',
                'max:'.(date('Y') + 1),
            ],

            'license_plate' => [
                'nullable',
                'string',
                'max:20',
                LicensePlate::rule($vehicle->license_plate),
                VehicleIdentity::plateUnique($vehicle->id),
            ],

            'vin' => [
                'nullable',
                'string',
                VehicleVin::rule($vehicle->vin),
                VehicleIdentity::vinUnique($vehicle->id),
            ],

            'mileage' => [
                'nullable',
                'integer',
                'min:0',
            ],

            'note' => [
                'nullable',
                'string',
            ],
        ], self::IDENTITY_MESSAGES);

        $this->ensureIdentityUnchangedWhenHasHistory($vehicle, $validated);

        $vehicle->update(VehicleCatalogSelection::apply($validated, $vehicle));

        $vehicle->load(self::CATALOG_RELATIONS)->loadCount('repairOrders');

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật xe của bạn thành công.',
            'data' => $vehicle,
        ]);
    }

    /**
     * DELETE /api/me/vehicles/{vehicle}
     *
     * Customer chỉ xóa được xe thuộc chính mình.
     */
    public function destroyMyVehicle(
        Request $request,
        Vehicle $vehicle
    ) {
        $customer = $this->getAuthenticatedCustomer($request);

        if (! $customer) {
            return $this->customerProfileNotFoundResponse();
        }

        $this->authorize('own', $vehicle);

        if ($vehicle->hasOpenRepairOrder()) {
            return response()->json([
                'success' => false,
                'message' => 'Xe đang được xử lý tại garage nên chưa thể xóa. Bạn có thể xóa sau khi đã nhận lại xe.',
            ], 422);
        }

        if ($vehicle->hasActiveAppointment()) {
            return response()->json([
                'success' => false,
                'message' => 'Xe đang có lịch hẹn chưa hoàn tất. Hãy hủy lịch hẹn trước khi xóa xe.',
            ], 422);
        }

        // Xóa mềm: xe ẩn khỏi danh sách, lịch hẹn và lịch sử sửa chữa vẫn giữ nguyên.
        $vehicle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa xe khỏi danh sách. Lịch sử bảo dưỡng vẫn được lưu.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | PRIVATE HELPERS
    |--------------------------------------------------------------------------
    */

    /** Chuẩn hoá biển số trước khi kiểm tra trùng để "30a12345" và "30A-123.45" được coi là một. */
    private function normalizePlateInput(Request $request): void
    {
        $plate = $request->input('license_plate');
        if (is_string($plate)) {
            $normalized = LicensePlate::normalize($plate);
            $request->merge(['license_plate' => $normalized === '' ? null : $normalized]);
        }
    }

    /** Viết hoa, bỏ khoảng trắng; để trống là xe chưa có số khung. */
    private function normalizeVinInput(Request $request): void
    {
        $vin = $request->input('vin');
        if (is_string($vin)) {
            $normalized = VehicleVin::normalize($vin);
            $request->merge(['vin' => $normalized === '' ? null : $normalized]);
        }
    }

    /**
     * Xe đã có phiếu sửa chữa: không cho đổi hãng/dòng/phiên bản/năm/số khung,
     * vì lịch sử cũ trỏ vào hồ sơ xe này (đổi là lịch sử thành của "xe khác").
     * Biển số, ODO, ghi chú vẫn sửa được.
     *
     * @param  array<string, mixed>  $validated
     */
    private function ensureIdentityUnchangedWhenHasHistory(Vehicle $vehicle, array $validated): void
    {
        if (! $vehicle->repairOrders()->exists()) {
            return;
        }

        $message = 'Xe đã có lịch sử bảo dưỡng nên không thể đổi thông tin này. Nếu là xe khác, hãy thêm xe mới.';
        $errors = [];
        foreach (['model_id', 'trim_id', 'year', 'vin'] as $field) {
            if (! array_key_exists($field, $validated)) {
                continue;
            }
            $current = $vehicle->getAttribute($field);
            $incoming = $validated[$field];
            $isSame = in_array($field, ['model_id', 'trim_id', 'year'], true)
                ? ($current === null ? null : (int) $current) === ($incoming === null || $incoming === '' ? null : (int) $incoming)
                : (string) ($current ?? '') === (string) ($incoming ?? '');
            if (! $isSame) {
                $errors[$field] = [$message];
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * Biển số (hoặc VIN) trùng với xe đã xóa (mềm) của chính khách này → khôi phục xe đó kèm lịch sử,
     * cập nhật ODO (chỉ khi tăng) và ghi chú nếu có gửi kèm. Xe đã xoá của khách KHÁC không ảnh hưởng (VehicleIdentity).
     */
    private function restoreDeletedVehicleByPlate(Request $request, int $customerId): ?Vehicle
    {
        $vehicle = VehicleIdentity::findDeletedOwned($customerId, $request->input('license_plate'), $request->input('vin'));
        if (! $vehicle) {
            return null;
        }

        $request->validate([
            'mileage' => ['nullable', 'integer', 'min:0'],
            'note' => ['nullable', 'string'],
        ]);

        VehicleIdentity::restore($vehicle);

        $mileage = $request->input('mileage');
        if ($mileage !== null && (int) $mileage > (int) ($vehicle->mileage ?? 0)) {
            $vehicle->mileage = (int) $mileage;
        }
        if ($request->filled('note')) {
            $vehicle->note = $request->input('note');
        }
        $vehicle->save();

        return $vehicle->load(self::CATALOG_RELATIONS)->loadCount('repairOrders');
    }

    /**
     * Lấy Customer tương ứng với Account đang đăng nhập.
     */
    private function getAuthenticatedCustomer(Request $request)
    {
        $account = $request->user();

        if (! $account) {
            return null;
        }

        return $account->customer;
    }

    /**
     * Response khi Account CUSTOMER chưa có hồ sơ Customer.
     */
    private function customerProfileNotFoundResponse()
    {
        return response()->json([
            'success' => false,
            'message' => 'Không tìm thấy hồ sơ khách hàng của tài khoản này.',
        ], 404);
    }

    /**
     * Response khi Customer cố truy cập xe của người khác.
     */
    private function vehicleForbiddenResponse()
    {
        return response()->json([
            'success' => false,
            'message' => 'Bạn không có quyền truy cập xe này.',
        ], 403);
    }
}
