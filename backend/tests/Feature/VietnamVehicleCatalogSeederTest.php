<?php

namespace Tests\Feature;

use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Database\Seeders\RealDataSeeder;
use Database\Seeders\VietnamVehicleCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VietnamVehicleCatalogSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_the_catalog_and_is_idempotent(): void
    {
        $catalog = VietnamVehicleCatalogSeeder::catalog();
        $expectedModelCount = array_sum(array_map('count', $catalog));

        $seeder = new VietnamVehicleCatalogSeeder;
        $seeder->run();
        $seeder->run();

        $this->assertSame(count($catalog), VehicleBrand::query()->count());
        $this->assertSame($expectedModelCount, VehicleModel::query()->count());

        $xpander = VehicleModel::query()
            ->where('name', 'Xpander')
            ->whereHas('brand', fn ($query) => $query->where('name', 'Mitsubishi'))
            ->firstOrFail();

        $this->assertSame('MPV', $xpander->body_type);
        $this->assertSame(2018, $xpander->year_from);
        $this->assertNull($xpander->year_to);
    }

    public function test_it_reuses_models_created_by_the_real_data_seeder(): void
    {
        (new RealDataSeeder)->run();
        (new VietnamVehicleCatalogSeeder)->run();

        $vios = VehicleModel::query()
            ->where('name', 'Vios')
            ->whereHas('brand', fn ($query) => $query->where('name', 'Toyota'))
            ->sole();

        $this->assertSame('SEDAN', $vios->body_type);
        $this->assertSame(2003, $vios->year_from);
        $this->assertSame(1, VehicleBrand::query()->where('name', 'Toyota')->count());
    }
}
