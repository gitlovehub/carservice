<?php

namespace Tests\Feature;

use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleTrim;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VehicleCatalogSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_brand_model_trim_relationships(): void
    {
        $brand = VehicleBrand::factory()->create(['name' => 'Toyota']);
        $model = VehicleModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Vios']);
        $trim = VehicleTrim::factory()->create(['model_id' => $model->id, 'name' => '1.5G-CVT']);
        $vehicle = Vehicle::factory()->create(['model_id' => $model->id, 'trim_id' => $trim->id]);

        $this->assertTrue($trim->model->is($model));
        $this->assertTrue($model->trims->first()->is($trim));
        $this->assertSame(1, $brand->trims()->count());
        $this->assertTrue($vehicle->trim->is($trim));
        $this->assertTrue($trim->vehicles->first()->is($vehicle));
    }

    public function test_vehicle_trim_is_optional(): void
    {
        $vehicle = Vehicle::factory()->create();

        $this->assertNull($vehicle->trim_id);
        $this->assertNull($vehicle->trim);
    }

    public function test_trim_name_is_unique_within_a_model(): void
    {
        $model = VehicleModel::factory()->create();
        VehicleTrim::factory()->create(['model_id' => $model->id, 'name' => 'Premium']);
        VehicleTrim::factory()->create(['name' => 'Premium']);

        $this->expectException(QueryException::class);
        VehicleTrim::factory()->create(['model_id' => $model->id, 'name' => 'Premium']);
    }

    public function test_model_name_is_unique_within_a_brand(): void
    {
        $brand = VehicleBrand::factory()->create();
        VehicleModel::factory()->create(['brand_id' => $brand->id, 'name' => 'CX-5', 'year_from' => null, 'year_to' => null]);

        $this->expectException(QueryException::class);
        VehicleModel::factory()->create(['brand_id' => $brand->id, 'name' => 'CX-5', 'year_from' => 2020, 'year_to' => null]);
    }
}
