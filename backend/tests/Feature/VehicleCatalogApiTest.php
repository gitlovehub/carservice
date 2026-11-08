<?php

namespace Tests\Feature;

use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleTrim;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VehicleCatalogApiTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: VehicleBrand, 1: VehicleModel, 2: VehicleTrim} */
    private function toyotaVios(): array
    {
        $brand = VehicleBrand::factory()->create(['name' => 'Toyota']);
        $model = VehicleModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Vios']);
        $trim = VehicleTrim::factory()->create(['model_id' => $model->id, 'name' => '1.5G-CVT']);

        return [$brand, $model, $trim];
    }

    public function test_lists_only_active_brands_with_active_models(): void
    {
        [$toyota] = $this->toyotaVios();
        VehicleModel::factory()->create(['brand_id' => $toyota->id, 'status' => 'INACTIVE']);
        $hidden = VehicleBrand::factory()->create(['name' => 'Honda', 'status' => 'INACTIVE']);
        VehicleModel::factory()->create(['brand_id' => $hidden->id]);
        VehicleBrand::factory()->create(['name' => 'Kia']); // chưa có dòng xe nào

        $this->getJson('/api/vehicle-catalog/brands')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Toyota')
            ->assertJsonPath('data.0.models_count', 1);
    }

    public function test_brand_search_is_case_insensitive_and_escapes_wildcards(): void
    {
        $this->toyotaVios();
        $lynk = VehicleBrand::factory()->create(['name' => 'Lynk & Co']);
        VehicleModel::factory()->create(['brand_id' => $lynk->id, 'name' => '01']);

        $this->getJson('/api/vehicle-catalog/brands?search=toy')->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Toyota');
        $this->getJson('/api/vehicle-catalog/brands?search='.urlencode('& co'))->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Lynk & Co');
        $this->getJson('/api/vehicle-catalog/brands?search=%25')->assertJsonCount(0, 'data');
    }

    public function test_lists_models_of_a_brand_and_trims_of_a_model(): void
    {
        [$brand, $model, $trim] = $this->toyotaVios();
        VehicleTrim::factory()->create(['model_id' => $model->id, 'name' => '1.5E-MT', 'status' => 'INACTIVE']);
        $other = VehicleModel::factory()->create(['brand_id' => VehicleBrand::factory()->create(['name' => 'Honda'])->id]);

        $this->getJson("/api/vehicle-catalog/brands/{$brand->id}/models")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $model->id)
            ->assertJsonPath('data.0.trims_count', 1)
            ->assertJsonMissing(['id' => $other->id]);

        $this->getJson("/api/vehicle-catalog/models/{$model->id}/trims")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $trim->id)
            ->assertJsonPath('data.0.name', '1.5G-CVT');

        $this->getJson("/api/vehicle-catalog/models/{$model->id}/trims?search=e-mt")->assertJsonCount(0, 'data');
    }

    public function test_hidden_parents_return_not_found(): void
    {
        [$brand, $model] = $this->toyotaVios();

        $model->update(['status' => 'INACTIVE']);
        $this->getJson("/api/vehicle-catalog/models/{$model->id}/trims")->assertNotFound();

        $model->update(['status' => 'ACTIVE']);
        $brand->update(['status' => 'INACTIVE']);
        $this->getJson("/api/vehicle-catalog/brands/{$brand->id}/models")->assertNotFound();
        $this->getJson("/api/vehicle-catalog/models/{$model->id}/trims")->assertNotFound();
        $this->getJson('/api/vehicle-catalog/brands/999999/models')->assertNotFound();
    }

    public function test_search_returns_brands_models_and_trims_with_parents(): void
    {
        [, $model, $trim] = $this->toyotaVios();
        $cross = VehicleModel::factory()->create(['brand_id' => $model->brand_id, 'name' => 'Corolla Cross']);
        VehicleTrim::factory()->create(['model_id' => $cross->id, 'name' => '1.8V', 'status' => 'INACTIVE']);

        $this->getJson('/api/vehicle-catalog/search?q=vios')
            ->assertOk()
            ->assertJsonCount(1, 'data.models')
            ->assertJsonPath('data.models.0.brand.name', 'Toyota');

        $this->getJson('/api/vehicle-catalog/search?q=1.5g')
            ->assertJsonCount(1, 'data.trims')
            ->assertJsonPath('data.trims.0.id', $trim->id)
            ->assertJsonPath('data.trims.0.model.name', 'Vios')
            ->assertJsonPath('data.trims.0.model.brand.name', 'Toyota');

        $this->getJson('/api/vehicle-catalog/search?q=1.8V')->assertJsonCount(0, 'data.trims');
        $this->getJson('/api/vehicle-catalog/search')->assertUnprocessable();
    }

    public function test_catalog_is_public_and_read_only(): void
    {
        [$brand] = $this->toyotaVios();

        $this->postJson('/api/vehicle-catalog/brands', ['name' => 'X'])->assertStatus(405);
        $this->deleteJson("/api/vehicle-catalog/brands/{$brand->id}/models")->assertStatus(405);
    }
}
