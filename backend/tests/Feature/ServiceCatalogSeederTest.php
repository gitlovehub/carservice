<?php

namespace Tests\Feature;

use App\Models\MaintenancePackage;
use App\Models\Service;
use Database\Seeders\PartInventorySeeder;
use Database\Seeders\ServiceCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceCatalogSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_packages_have_fixed_services_and_parts_and_rerun_cleans_legacy_data(): void
    {
        (new PartInventorySeeder)->run();
        Service::factory()->create(['name' => 'Bảo dưỡng định kỳ', 'status' => 'ACTIVE']);
        Service::factory()->count(2)->create(['name' => 'Đảo lốp xe', 'status' => 'ACTIVE']);
        $legacyPackage = MaintenancePackage::factory()->create([
            'vehicle_model_id' => null,
            'name' => 'Bảo dưỡng cấp 1 (5.000km)',
        ]);

        $seeder = new ServiceCatalogSeeder;
        $seeder->run();
        $seeder->run();

        $this->assertSame('INACTIVE', Service::query()->where('name', 'Bảo dưỡng định kỳ')->value('status'));
        $this->assertSame(1, Service::query()->where('name', 'Đảo lốp xe')->where('status', 'ACTIVE')->count());

        $packages = MaintenancePackage::query()->where('status', 'ACTIVE')->with(['services', 'parts'])->orderBy('mileage_milestone')->get();

        $this->assertSame([5000, 10000, 20000, 40000], $packages->pluck('mileage_milestone')->all());
        $this->assertSame($legacyPackage->id, $packages->first()->id);
        $this->assertSame('Bảo dưỡng 5.000 km', $packages->first()->name);
        $this->assertSame(['Kiểm tra tổng quát', 'Thay dầu động cơ'], $packages->first()->services->pluck('name')->sort()->values()->all());
        $packages->each(function (MaintenancePackage $package): void {
            $this->assertNotEmpty($package->description);
            $this->assertTrue($package->parts->isNotEmpty(), "{$package->name} thiếu phụ tùng.");
        });
    }
}
