<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Part;
use App\Models\Service;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/** Bảng Admin: mặc định mới tạo lên đầu; ?sort=&dir= theo cột cho phép; khoá lạ quay về mặc định. */
class AdminTableSortingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAs(Account::factory()->create(['role' => Account::ROLE_ADMIN]));
    }

    public function test_services_default_newest_first_and_sort_by_column(): void
    {
        Carbon::setTestNow('2026-11-01 08:00');
        Service::factory()->create(['name' => 'B cũ', 'base_price' => 300, 'sort_order' => 1]);
        Carbon::setTestNow('2026-11-05 08:00');
        Service::factory()->create(['name' => 'A mới', 'base_price' => 100, 'sort_order' => 2]);
        Carbon::setTestNow();

        $names = fn (string $query) => collect($this->getJson("/api/admin/services{$query}")->assertOk()->json('data.data'))->pluck('name')->all();
        $this->assertSame(['A mới', 'B cũ'], $names(''));
        $this->assertSame(['B cũ', 'A mới'], $names('?sort=price&dir=desc'));
        $this->assertSame(['A mới', 'B cũ'], $names('?sort=name'));          // chữ: mặc định A→Z
        $this->assertSame(['B cũ', 'A mới'], $names('?sort=order&dir=asc'));  // thứ tự kéo thả
        $this->assertSame(['A mới', 'B cũ'], $names('?sort=password&dir=asc; drop table')); // khoá lạ → mặc định
    }

    public function test_parts_and_vehicle_models_sort_by_computed_and_related_columns(): void
    {
        Carbon::setTestNow('2026-11-01 08:00');
        $old = Part::query()->create(['sku' => 'P-OLD', 'name' => 'Lọc dầu', 'unit' => 'cái', 'cost_price' => 100, 'sell_price' => 500, 'status' => 'ACTIVE']);
        Carbon::setTestNow('2026-11-02 08:00');
        Part::query()->create(['sku' => 'P-NEW', 'name' => 'Má phanh', 'unit' => 'bộ', 'cost_price' => 400, 'sell_price' => 450, 'status' => 'ACTIVE']);
        Carbon::setTestNow();

        $skus = fn (string $query) => collect($this->getJson("/api/admin/parts{$query}")->assertOk()->json('data'))->pluck('sku')->all();
        $this->assertSame(['P-NEW', 'P-OLD'], $skus(''));
        $this->assertSame(['P-OLD', 'P-NEW'], $skus('?sort=margin&dir=desc')); // lãi 400 > 50
        $this->assertSame($old->sku, $skus('?sort=cost&dir=asc')[0]);

        $zed = VehicleBrand::query()->create(['name' => 'Zeta']);
        $alpha = VehicleBrand::query()->create(['name' => 'Alpha']);
        VehicleModel::factory()->create(['brand_id' => $zed->id, 'name' => 'Z1']);
        VehicleModel::factory()->create(['brand_id' => $alpha->id, 'name' => 'A1']);
        $this->getJson('/api/admin/vehicle-models?sort=brand&dir=asc')->assertOk()->assertJsonPath('data.data.0.name', 'A1');
        $this->getJson('/api/admin/vehicle-models?sort=brand&dir=desc')->assertOk()->assertJsonPath('data.data.0.name', 'Z1');
    }
}
