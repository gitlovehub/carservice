<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AppliesSort;
use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleTrim;
use App\Support\VehicleName;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Quản trị danh mục xe 3 cấp (chỉ ADMIN).
 *
 * Hãng xe và dòng xe KHÔNG xoá được (chỉ ẩn bằng status INACTIVE) vì là gốc của hồ sơ xe, lịch hẹn, gói bảo dưỡng.
 * Phiên bản xoá được khi chưa gắn với hồ sơ xe nào (kể cả xe đã xoá mềm).
 */
class AdminVehicleCatalogController extends Controller
{
    use AppliesSort;

    private const STATUSES = ['ACTIVE', 'INACTIVE'];

    private const BODY_TYPES = ['SEDAN', 'SUV', 'HATCHBACK', 'MPV', 'PICKUP', 'OTHER'];

    private const SOURCE = 'ADMIN';

    /* ----------------------------------------------------------------- Hãng xe */

    /** GET /api/admin/vehicle-brands?search=&status=&per_page= */
    public function brandIndex(Request $request): JsonResponse
    {
        $filters = $this->listFilters($request);

        $brands = VehicleBrand::query()
            ->withCount(['models', 'trims'])
            ->tap(fn (Builder $query) => $this->applyFilters($query, $filters))
            ->tap(fn (Builder $q) => $this->applySort($q, $request, [
                'created' => 'created_at', 'name' => 'name', 'models' => 'models_count', 'trims' => 'trims_count', 'status' => 'status',
            ]))
            ->paginate($filters['per_page']);

        return $this->ok('Lấy danh sách hãng xe thành công.', $brands);
    }

    /** POST /api/admin/vehicle-brands */
    public function brandStore(Request $request): JsonResponse
    {
        $data = $this->validateNamed($request, 100);
        $this->assertUniqueName(VehicleBrand::query(), $data['name']);

        $brand = VehicleBrand::create($data + ['status' => 'ACTIVE', 'source' => self::SOURCE]);

        return $this->ok('Thêm hãng xe thành công.', $brand->loadCount(['models', 'trims']), 201);
    }

    /** PATCH /api/admin/vehicle-brands/{brand} */
    public function brandUpdate(Request $request, VehicleBrand $brand): JsonResponse
    {
        $data = $this->validateNamed($request, 100, partial: true);
        if (isset($data['name'])) {
            $this->assertUniqueName(VehicleBrand::query(), $data['name'], $brand->id);
        }

        $brand->update($data);

        return $this->ok('Cập nhật hãng xe thành công.', $brand->fresh()->loadCount(['models', 'trims']));
    }

    /* ----------------------------------------------------------------- Dòng xe */

    /** GET /api/admin/vehicle-models?brand_id=&search=&status=&per_page= */
    public function modelIndex(Request $request): JsonResponse
    {
        $filters = $this->listFilters($request, ['brand_id' => ['nullable', 'integer']]);

        $models = VehicleModel::query()
            ->with('brand:id,name,status')
            ->withCount(['trims', 'vehicles' => fn (Builder $query) => $query->withTrashed()])
            ->when($filters['brand_id'] ?? null, fn (Builder $query, $brandId) => $query->where('brand_id', $brandId))
            ->tap(fn (Builder $query) => $this->applyFilters($query, $filters))
            ->tap(fn (Builder $q) => $this->applySort($q, $request, [
                'created' => 'vehicle_models.created_at', 'name' => 'vehicle_models.name', 'body' => 'body_type',
                'trims' => 'trims_count', 'vehicles' => 'vehicles_count', 'status' => 'vehicle_models.status',
                'brand' => fn (Builder $q, string $dir) => $q->orderBy(VehicleBrand::query()->select('name')->whereColumn('vehicle_brands.id', 'vehicle_models.brand_id'), $dir),
            ], tieBreaker: 'vehicle_models.id'))
            ->paginate($filters['per_page']);

        return $this->ok('Lấy danh sách dòng xe thành công.', $models);
    }

    /** POST /api/admin/vehicle-models */
    public function modelStore(Request $request): JsonResponse
    {
        $data = $this->validateNamed($request, 100, extra: [
            'brand_id' => ['required', 'integer', 'exists:vehicle_brands,id'],
            'body_type' => ['nullable', Rule::in(self::BODY_TYPES)],
        ]);
        $this->assertUniqueName(VehicleModel::query()->where('brand_id', $data['brand_id']), $data['name']);

        $model = VehicleModel::create($data + ['status' => 'ACTIVE', 'source' => self::SOURCE]);

        return $this->ok('Thêm dòng xe thành công.', $this->modelPayload($model), 201);
    }

    /** PATCH /api/admin/vehicle-models/{model} — không đổi hãng để không làm sai hồ sơ xe đã lưu. */
    public function modelUpdate(Request $request, VehicleModel $model): JsonResponse
    {
        $data = $this->validateNamed($request, 100, partial: true, extra: [
            'brand_id' => ['prohibited'],
            'body_type' => ['sometimes', 'nullable', Rule::in(self::BODY_TYPES)],
        ]);
        if (isset($data['name'])) {
            $this->assertUniqueName(VehicleModel::query()->where('brand_id', $model->brand_id), $data['name'], $model->id);
        }

        $model->update($data);

        return $this->ok('Cập nhật dòng xe thành công.', $this->modelPayload($model->fresh()));
    }

    /* -------------------------------------------------------------- Phiên bản */

    /** GET /api/admin/vehicle-trims?model_id=&brand_id=&search=&status=&per_page= */
    public function trimIndex(Request $request): JsonResponse
    {
        $filters = $this->listFilters($request, [
            'model_id' => ['nullable', 'integer'],
            'brand_id' => ['nullable', 'integer'],
        ]);

        $trims = VehicleTrim::query()
            ->with(['model:id,brand_id,name,status', 'model.brand:id,name,status'])
            ->withCount(['vehicles' => fn (Builder $query) => $query->withTrashed()])
            ->when($filters['model_id'] ?? null, fn (Builder $query, $modelId) => $query->where('model_id', $modelId))
            ->when($filters['brand_id'] ?? null, fn (Builder $query, $brandId) => $query->whereHas('model', fn (Builder $q) => $q->where('brand_id', $brandId)))
            ->tap(fn (Builder $query) => $this->applyFilters($query, $filters))
            ->tap(fn (Builder $q) => $this->applySort($q, $request, [
                'created' => 'vehicle_trims.created_at', 'name' => 'vehicle_trims.name', 'vehicles' => 'vehicles_count', 'status' => 'vehicle_trims.status',
                'model' => fn (Builder $q, string $dir) => $q->orderBy(VehicleModel::query()->select('name')->whereColumn('vehicle_models.id', 'vehicle_trims.model_id'), $dir),
            ], tieBreaker: 'vehicle_trims.id'))
            ->paginate($filters['per_page']);

        return $this->ok('Lấy danh sách phiên bản thành công.', $trims);
    }

    /** POST /api/admin/vehicle-trims */
    public function trimStore(Request $request): JsonResponse
    {
        $data = $this->validateNamed($request, 150, extra: [
            'model_id' => ['required', 'integer', 'exists:vehicle_models,id'],
        ]);
        $this->assertUniqueName(VehicleTrim::query()->where('model_id', $data['model_id']), $data['name']);

        $trim = VehicleTrim::create($data + ['status' => 'ACTIVE', 'source' => self::SOURCE]);

        return $this->ok('Thêm phiên bản thành công.', $this->trimPayload($trim), 201);
    }

    /** PATCH /api/admin/vehicle-trims/{trim} */
    public function trimUpdate(Request $request, VehicleTrim $trim): JsonResponse
    {
        $data = $this->validateNamed($request, 150, partial: true, extra: [
            'model_id' => ['prohibited'],
        ]);
        if (isset($data['name'])) {
            $this->assertUniqueName(VehicleTrim::query()->where('model_id', $trim->model_id), $data['name'], $trim->id);
        }

        $trim->update($data);

        return $this->ok('Cập nhật phiên bản thành công.', $this->trimPayload($trim->fresh()));
    }

    /** DELETE /api/admin/vehicle-trims/{trim} */
    public function trimDestroy(VehicleTrim $trim): JsonResponse
    {
        $vehicles = Vehicle::withTrashed()->where('trim_id', $trim->id)->count();
        if ($vehicles > 0) {
            return $this->blocked("Không thể xóa phiên bản {$trim->name} vì đang gắn với {$vehicles} hồ sơ xe. Hãy chuyển sang Ẩn nếu không muốn hiển thị.");
        }

        $trim->delete();

        return $this->ok('Đã xóa phiên bản.');
    }

    /* ---------------------------------------------------------------- Helpers */

    /**
     * @param  array<string, array<int, mixed>>  $extra
     * @return array<string, mixed>
     */
    private function listFilters(Request $request, array $extra = []): array
    {
        $filters = $request->validate($extra + [
            'search' => ['nullable', 'string', 'max:150'],
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);
        $filters['per_page'] = (int) ($filters['per_page'] ?? 15);

        return $filters;
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyFilters(Builder $query, array $filters): void
    {
        $query->when($filters['status'] ?? null, fn (Builder $q, $status) => $q->where('status', $status));

        $search = VehicleName::clean((string) ($filters['search'] ?? ''));
        if ($search !== '') {
            $query->where('name', 'like', VehicleName::like($search));
        }
    }

    /**
     * @param  array<string, array<int, mixed>>  $extra
     * @return array<string, mixed>
     */
    private function validateNamed(Request $request, int $max, bool $partial = false, array $extra = []): array
    {
        $required = $partial ? ['sometimes', 'required'] : ['required'];

        $data = $request->validate($extra + [
            'name' => [...$required, 'string', 'max:'.$max],
            'status' => ['sometimes', 'required', Rule::in(self::STATUSES)],
        ], [
            'name.required' => 'Vui lòng nhập tên.',
            'name.max' => "Tên không được quá {$max} ký tự.",
            'status.in' => 'Trạng thái không hợp lệ.',
            'brand_id.prohibited' => 'Không thể chuyển dòng xe sang hãng khác.',
            'model_id.prohibited' => 'Không thể chuyển phiên bản sang dòng xe khác.',
        ]);

        if (array_key_exists('name', $data)) {
            $data['name'] = VehicleName::clean((string) $data['name']);
            if ($data['name'] === '') {
                throw ValidationException::withMessages(['name' => 'Vui lòng nhập tên.']);
            }
        }

        return $data;
    }

    /**
     * Tên không trùng trong cùng cấp cha, không phân biệt hoa/thường.
     */
    private function assertUniqueName(Builder $scope, string $name, ?int $ignoreId = null): void
    {
        $taken = $scope
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->when($ignoreId, fn (Builder $query) => $query->whereKeyNot($ignoreId))
            ->exists();

        if ($taken) {
            throw ValidationException::withMessages(['name' => 'Tên này đã tồn tại.']);
        }
    }

    private function modelPayload(VehicleModel $model): VehicleModel
    {
        return $model->load('brand:id,name,status')
            ->loadCount(['trims', 'vehicles' => fn (Builder $query) => $query->withTrashed()]);
    }

    private function trimPayload(VehicleTrim $trim): VehicleTrim
    {
        return $trim->load(['model:id,brand_id,name,status', 'model.brand:id,name,status'])
            ->loadCount(['vehicles' => fn (Builder $query) => $query->withTrashed()]);
    }

    private function blocked(string $message): JsonResponse
    {
        return response()->json(['success' => false, 'message' => $message], 422);
    }

    private function ok(string $message, mixed $data = null, int $status = 200): JsonResponse
    {
        $body = ['success' => true, 'message' => $message];
        if ($data !== null) {
            $body['data'] = $data;
        }

        return response()->json($body, $status);
    }
}
