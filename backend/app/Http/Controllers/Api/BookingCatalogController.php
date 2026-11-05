<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenancePackage;
use App\Models\Service;
use App\Models\VehicleModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Danh mục cho trang đặt lịch: gộp gói bảo dưỡng và dịch vụ lẻ thành các nhóm.
 * Dữ liệu vẫn nằm ở hai bảng riêng; đây chỉ là lớp hiển thị.
 */
class BookingCatalogController extends Controller
{
    /**
     * GET /api/booking-catalog?model_id=&brand=&model=&mileage=
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'model_id' => ['nullable', 'integer'],
            'brand' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'mileage' => ['nullable', 'integer', 'min:0'],
        ]);

        $vehicleModelId = $this->resolveVehicleModelId($validated);
        $mileage = isset($validated['mileage']) ? (int) $validated['mileage'] : null;

        $groups = collect([$this->packageGroup($vehicleModelId, $mileage)])
            ->merge($this->serviceGroups())
            ->filter(fn (array $group) => $group['items'] !== [])
            ->values();

        return response()->json(['groups' => $groups]);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function resolveVehicleModelId(array $validated): ?int
    {
        if (! empty($validated['model_id'])) {
            return (int) $validated['model_id'];
        }

        if (empty($validated['brand']) || empty($validated['model'])) {
            return null;
        }

        $modelId = VehicleModel::query()
            ->where('name', trim($validated['model']))
            ->whereHas('brand', fn ($query) => $query->where('name', trim($validated['brand'])))
            ->value('id');

        return $modelId === null ? null : (int) $modelId;
    }

    /**
     * @return array{key: string, name: string, items: array<int, array<string, mixed>>}
     */
    private function packageGroup(?int $vehicleModelId, ?int $mileage): array
    {
        $packages = MaintenancePackage::query()
            ->availableFor($vehicleModelId)
            ->with([
                'services' => fn ($query) => $query->where('status', 'ACTIVE')->orderBy('sort_order')->orderBy('name'),
                'parts',
            ])
            ->orderBy('mileage_milestone')
            ->orderBy('name')
            ->get()
            ->filter(fn (MaintenancePackage $package) => $package->services->isNotEmpty())
            ->values();

        $recommendedId = $mileage === null ? null : $packages
            ->filter(fn (MaintenancePackage $package) => $package->mileage_milestone !== null && $package->mileage_milestone >= $mileage)
            ->sortBy('mileage_milestone')
            ->first()?->id;

        return [
            'key' => 'packages',
            'name' => 'Gói bảo dưỡng',
            'items' => $packages->map(fn (MaintenancePackage $package) => [
                'key' => "package:{$package->id}",
                'type' => 'package',
                'id' => $package->id,
                'name' => $package->name,
                'summary' => (string) ($package->description ?: $package->shortSummary()),
                'includes' => $package->shortSummary(4),
                'price' => $this->displayPrice($package->calculateEstimatedPrice()),
                'minutes' => $this->packageMinutes($package),
                'recommended' => $package->id === $recommendedId,
                'included_service_ids' => $package->services->modelKeys(),
            ])->all(),
        ];
    }

    /**
     * Nhóm "Phổ biến" đứng đầu, sau đó mỗi danh mục một nhóm.
     *
     * @return Collection<int, array{key: string, name: string, items: array<int, array<string, mixed>>}>
     */
    private function serviceGroups(): Collection
    {
        $services = Service::query()
            ->where('status', 'ACTIVE')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $popular = [
            'key' => 'popular',
            'name' => 'Phổ biến',
            'items' => $services->where('is_popular', true)->map(fn (Service $service) => $this->serviceItem($service))->values()->all(),
        ];

        $byCategory = $services
            ->groupBy(fn (Service $service) => $service->category ?: 'Khác')
            ->sortKeys()
            ->map(fn (Collection $items, string $category) => [
                'key' => "category:{$category}",
                'name' => $category,
                'items' => $items->map(fn (Service $service) => $this->serviceItem($service))->values()->all(),
            ])
            ->values();

        return collect([$popular])->merge($byCategory);
    }

    /**
     * @return array<string, mixed>
     */
    private function serviceItem(Service $service): array
    {
        return [
            'key' => "service:{$service->id}",
            'type' => 'service',
            'id' => $service->id,
            'name' => $service->name,
            'summary' => (string) $service->description,
            'price' => $this->displayPrice((float) $service->base_price),
            'minutes' => $service->estimated_minutes,
            'recommended' => false,
        ];
    }

    private function packageMinutes(MaintenancePackage $package): ?int
    {
        $minutes = $package->services->sum(
            fn (Service $service) => (int) $service->estimated_minutes * (int) ($service->pivot->quantity ?? 1)
        );

        return $minutes > 0 ? $minutes : null;
    }

    /**
     * Giá 0 nghĩa là "báo giá tại garage"; trả null để giao diện hiển thị đúng.
     */
    private function displayPrice(float $price): ?float
    {
        return $price > 0 ? $price : null;
    }
}
