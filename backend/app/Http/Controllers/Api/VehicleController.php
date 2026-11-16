<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Support\VehicleCatalogSelection;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class VehicleController extends Controller
{
    /** Hãng, dòng xe và phiên bản để giao diện hiển thị đủ tên xe. */
    private const CATALOG_RELATIONS = ['model.brand:id,name', 'trim:id,model_id,name,status'];

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
        $query = Vehicle::with(['customer', ...self::CATALOG_RELATIONS]);

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('license_plate', 'like', "%{$search}%")
                    ->orWhere('vin', 'like', "%{$search}%")
                    ->orWhere('variant', 'like', "%{$search}%");
            });
        }

        $vehicles = $query
            ->latest()
            ->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách xe thành công.',
            'data' => $vehicles,
        ]);
    }

    /**
     * POST /api/vehicles
     *
     * Admin/Advisor thêm xe cho khách hàng.
     */
    public function store(Request $request)
    {
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
                'unique:vehicles,license_plate',
            ],

            'vin' => [
                'nullable',
                'string',
                'max:50',
                'unique:vehicles,vin',
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
        ]);

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
        $vehicle->load(['customer', ...self::CATALOG_RELATIONS]);

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
                Rule::unique('vehicles', 'license_plate')
                    ->ignore($vehicle->id),
            ],

            'vin' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('vehicles', 'vin')
                    ->ignore($vehicle->id),
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
        ]);

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
        $vehicle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa xe thành công.',
        ]);
    }

    /**
     * GET /api/customers/{customerId}/vehicles
     *
     * Admin/Advisor xem xe của một khách hàng.
     */
    public function byCustomer($customerId)
    {
        $vehicles = Vehicle::with(self::CATALOG_RELATIONS)
            ->where('customer_id', $customerId)
            ->latest()
            ->get();

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
                'unique:vehicles,license_plate',
            ],

            'vin' => [
                'nullable',
                'string',
                'max:50',
                'unique:vehicles,vin',
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
        ]);

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
                Rule::unique('vehicles', 'license_plate')
                    ->ignore($vehicle->id),
            ],

            'vin' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('vehicles', 'vin')
                    ->ignore($vehicle->id),
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
        ]);

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
     * Biển số trùng với xe đã xóa (mềm) của chính khách này → khôi phục xe đó,
     * cập nhật ODO (chỉ khi tăng) và ghi chú nếu có gửi kèm.
     */
    private function restoreDeletedVehicleByPlate(Request $request, int $customerId): ?Vehicle
    {
        $plate = strtoupper(trim((string) $request->input('license_plate', '')));
        if ($plate === '') {
            return null;
        }

        $vehicle = Vehicle::onlyTrashed()
            ->where('customer_id', $customerId)
            ->where('license_plate', $plate)
            ->first();
        if (! $vehicle) {
            return null;
        }

        $request->validate([
            'mileage' => ['nullable', 'integer', 'min:0'],
            'note' => ['nullable', 'string'],
        ]);

        $vehicle->restore();

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
