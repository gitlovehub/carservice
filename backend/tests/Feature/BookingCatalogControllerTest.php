<?php

namespace Tests\Feature;

use App\Models\MaintenancePackage;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingCatalogControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_groups_packages_first_then_categories_with_active_services_only(): void
    {
        $oilChange = Service::factory()->create([
            'name' => 'Thay dầu',
            'category' => 'Bảo dưỡng',
            'base_price' => 350000,
        ]);
        Service::factory()->create(['name' => 'Kiểm tra phanh', 'category' => 'Phanh', 'base_price' => 0]);
        Service::factory()->create(['name' => 'Dịch vụ đã ẩn', 'category' => 'Phanh', 'status' => 'INACTIVE']);
        $package = MaintenancePackage::factory()->create([
            'vehicle_model_id' => null,
            'description' => 'Bảo dưỡng nhỏ.',
        ]);
        $package->services()->attach($oilChange->id, ['quantity' => 1]);

        $response = $this->getJson('/api/booking-catalog')->assertOk();

        $this->assertSame(
            ['packages', 'category:Bảo dưỡng', 'category:Phanh'],
            array_column($response->json('groups'), 'key')
        );
        $response
            ->assertJsonPath('groups.0.items.0.key', "package:{$package->id}")
            ->assertJsonPath('groups.0.items.0.summary', 'Bảo dưỡng nhỏ.')
            ->assertJsonPath('groups.0.items.0.includes', 'Thay dầu')
            ->assertJsonPath('groups.0.items.0.included_service_ids', [$oilChange->id])
            ->assertJsonPath('groups.1.items.0.key', "service:{$oilChange->id}")
            ->assertJsonPath('groups.2.items.0.name', 'Kiểm tra phanh')
            ->assertJsonPath('groups.2.items.0.price', null)
            ->assertJsonCount(1, 'groups.2.items');
    }

    public function test_items_carry_the_admin_category_icon(): void
    {
        $brakes = ServiceCategory::query()->create(['name' => 'Gầm - Phanh', 'icon' => 'disc']);
        $brake = Service::factory()->create(['name' => 'Thay má phanh', 'category' => 'Gầm - Phanh', 'category_id' => $brakes->id]);
        $loose = Service::factory()->create(['name' => 'Rửa xe', 'category' => 'Khác', 'category_id' => null]);
        $package = MaintenancePackage::factory()->create(['vehicle_model_id' => null]);
        $package->services()->attach($brake->id, ['quantity' => 1]);

        $groups = collect($this->getJson('/api/booking-catalog')->assertOk()->json('groups'))->keyBy('key');

        $this->assertSame('layers', $groups['packages']['icon']);
        $this->assertSame('layers', $groups['packages']['items'][0]['icon']);
        $this->assertSame('disc', $groups['category:Gầm - Phanh']['icon']);
        $this->assertSame('disc', $groups['category:Gầm - Phanh']['items'][0]['icon']);
        $this->assertSame('wrench', collect($groups['category:Khác']['items'])->firstWhere('id', $loose->id)['icon']);
    }

    public function test_filters_packages_by_vehicle_model_name_and_recommends_next_mileage_milestone(): void
    {
        $service = Service::factory()->create();
        $brand = VehicleBrand::factory()->create(['name' => 'Toyota']);
        $vios = VehicleModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Vios']);
        $packages = [
            'shared10k' => MaintenancePackage::factory()->create(['vehicle_model_id' => null, 'mileage_milestone' => 10000]),
            'vios20k' => MaintenancePackage::factory()->create(['vehicle_model_id' => $vios->id, 'mileage_milestone' => 20000]),
            // Dòng xe khác cùng hãng: tránh factory sinh ngẫu nhiên lại tên hãng "Toyota" (UNIQUE) — QA-01.
            'otherModel' => MaintenancePackage::factory()->create(['vehicle_model_id' => VehicleModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Corolla Altis'])->id]),
            'inactive' => MaintenancePackage::factory()->create(['vehicle_model_id' => null, 'status' => 'INACTIVE']),
        ];
        MaintenancePackage::factory()->create(['vehicle_model_id' => null]);

        foreach ($packages as $package) {
            $package->services()->attach($service->id, ['quantity' => 1]);
        }

        $response = $this->getJson('/api/booking-catalog?brand=Toyota&model=Vios&mileage=19500')
            ->assertOk()
            ->assertJsonPath('groups.0.key', 'packages');

        $items = collect($response->json('groups.0.items'));

        $this->assertSame([$packages['shared10k']->id, $packages['vios20k']->id], $items->pluck('id')->all());
        $this->assertSame([false, true], $items->pluck('recommended')->all());
        $this->assertSame([10000, 20000], $items->pluck('mileage_milestone')->all());

        // Chỉ "phù hợp" khi xe thật sự tới hạn (cách mốc ≤ 1.000 km): xe mới / giữa hai mốc → không gợi ý gói nào.
        $recommendedAt = fn (int $km) => collect($this->getJson("/api/booking-catalog?brand=Toyota&model=Vios&mileage={$km}")
            ->json('groups.0.items'))->pluck('recommended')->all();
        $this->assertSame([false, false], $recommendedAt(2000), 'Xe 2.000 km chưa tới hạn gói 10.000 km');
        $this->assertSame([false, false], $recommendedAt(15000), 'Giữa hai mốc: không gói nào tới hạn');
        $this->assertSame([true, false], $recommendedAt(10800), 'Vừa qua mốc 10.000 km vẫn tới hạn gói đó');
        $this->assertSame([true, false], $recommendedAt(9000), 'Sắp tới mốc (còn 1.000 km)');
    }
}
