<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleTrim;
use App\Support\VehicleName;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Danh mục xe công khai cho bộ chọn Hãng → Dòng xe → Phiên bản.
 * Chỉ trả bản ghi ACTIVE và có cấp cha đang ACTIVE.
 */
class VehicleCatalogController extends Controller
{
    private const SEARCH_LIMIT = 20;

    /** GET /api/vehicle-catalog/brands?search= */
    public function brands(Request $request): JsonResponse
    {
        $search = $this->searchTerm($request);

        $brands = VehicleBrand::query()
            ->where('status', 'ACTIVE')
            ->whereHas('models', fn (Builder $query) => $query->where('status', 'ACTIVE'))
            ->withCount(['models' => fn (Builder $query) => $query->where('status', 'ACTIVE')])
            ->when($search !== '', fn (Builder $query) => $query->where('name', 'like', VehicleName::like($search)))
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json(['data' => $brands]);
    }

    /** GET /api/vehicle-catalog/brands/{brand}/models?search= */
    public function models(Request $request, VehicleBrand $brand): JsonResponse
    {
        abort_if($brand->status !== 'ACTIVE', 404, 'Hãng xe không tồn tại hoặc đã ngừng hiển thị.');
        $search = $this->searchTerm($request);

        $models = $brand->models()
            ->where('status', 'ACTIVE')
            ->withCount(['trims' => fn (Builder $query) => $query->where('status', 'ACTIVE')])
            ->when($search !== '', fn (Builder $query) => $query->where('name', 'like', VehicleName::like($search)))
            ->orderBy('name')
            ->get(['id', 'brand_id', 'name', 'body_type']);

        return response()->json(['data' => $models]);
    }

    /** GET /api/vehicle-catalog/models/{model}/trims?search= */
    public function trims(Request $request, VehicleModel $model): JsonResponse
    {
        $model->loadMissing('brand:id,status');
        abort_if(
            $model->status !== 'ACTIVE' || $model->brand?->status !== 'ACTIVE',
            404,
            'Dòng xe không tồn tại hoặc đã ngừng hiển thị.'
        );
        $search = $this->searchTerm($request);

        $trims = $model->trims()
            ->where('status', 'ACTIVE')
            ->when($search !== '', fn (Builder $query) => $query->where('name', 'like', VehicleName::like($search)))
            ->orderBy('name')
            ->get(['id', 'model_id', 'name']);

        return response()->json(['data' => $trims]);
    }

    /**
     * GET /api/vehicle-catalog/search?q=
     * Tìm đồng thời hãng, dòng xe và phiên bản (tối đa 20 kết quả mỗi loại).
     */
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate(['q' => ['required', 'string', 'min:1', 'max:100']]);
        $like = VehicleName::like($validated['q']);
        $activeBrand = fn (Builder $query) => $query->where('status', 'ACTIVE');
        $activeModel = fn (Builder $query) => $query->where('status', 'ACTIVE')->whereHas('brand', $activeBrand);

        $brands = VehicleBrand::query()
            ->where('status', 'ACTIVE')
            ->where('name', 'like', $like)
            ->orderBy('name')
            ->limit(self::SEARCH_LIMIT)
            ->get(['id', 'name']);

        $models = VehicleModel::query()
            ->tap($activeModel)
            ->where('name', 'like', $like)
            ->with('brand:id,name')
            ->orderBy('name')
            ->limit(self::SEARCH_LIMIT)
            ->get(['id', 'brand_id', 'name']);

        $trims = VehicleTrim::query()
            ->where('status', 'ACTIVE')
            ->whereHas('model', $activeModel)
            ->where('name', 'like', $like)
            ->with(['model:id,brand_id,name', 'model.brand:id,name'])
            ->orderBy('name')
            ->limit(self::SEARCH_LIMIT)
            ->get(['id', 'model_id', 'name']);

        return response()->json(['data' => compact('brands', 'models', 'trims')]);
    }

    /** Từ khóa lọc tùy chọn (?search=) cho các danh sách. */
    private function searchTerm(Request $request): string
    {
        $validated = $request->validate(['search' => ['nullable', 'string', 'max:100']]);

        return VehicleName::clean((string) ($validated['search'] ?? ''));
    }
}
