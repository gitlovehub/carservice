<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\MaintenancePackage;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleTrim;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminVehicleCatalogApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): void
    {
        Sanctum::actingAs(Account::factory()->admin()->create());
    }

    public function test_admin_routes_require_admin_role(): void
    {
        $this->getJson('/api/admin/vehicle-brands')->assertUnauthorized();

        foreach ([Account::ROLE_ADVISOR, Account::ROLE_CUSTOMER] as $role) {
            Sanctum::actingAs(Account::factory()->create(['role' => $role]));
            $this->getJson('/api/admin/vehicle-brands')->assertForbidden();
            $this->postJson('/api/admin/vehicle-trims', ['name' => 'X', 'model_id' => 1])->assertForbidden();
        }
    }

    public function test_admin_can_create_update_and_toggle_each_level(): void
    {
        $this->actingAsAdmin();

        $brandId = $this->postJson('/api/admin/vehicle-brands', ['name' => '  Lynk   &  Co '])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Lynk & Co')
            ->assertJsonPath('data.status', 'ACTIVE')
            ->assertJsonPath('data.source', 'ADMIN')
            ->json('data.id');

        $modelId = $this->postJson('/api/admin/vehicle-models', ['brand_id' => $brandId, 'name' => '05', 'body_type' => 'SUV'])
            ->assertCreated()
            ->assertJsonPath('data.brand.name', 'Lynk & Co')
            ->json('data.id');

        $trimId = $this->postJson('/api/admin/vehicle-trims', ['model_id' => $modelId, 'name' => 'Halo (Nội thất Đen)'])
            ->assertCreated()
            ->assertJsonPath('data.model.brand.name', 'Lynk & Co')
            ->json('data.id');

        $this->patchJson("/api/admin/vehicle-trims/{$trimId}", ['status' => 'INACTIVE'])
            ->assertOk()->assertJsonPath('data.status', 'INACTIVE');
        $this->patchJson("/api/admin/vehicle-models/{$modelId}", ['name' => '05 Pro'])
            ->assertOk()->assertJsonPath('data.name', '05 Pro');
        $this->patchJson("/api/admin/vehicle-brands/{$brandId}", ['status' => 'INACTIVE'])
            ->assertOk()->assertJsonPath('data.status', 'INACTIVE');

        $this->getJson('/api/vehicle-catalog/brands')->assertJsonCount(0, 'data');
    }

    public function test_names_must_be_unique_within_parent_ignoring_case(): void
    {
        $this->actingAsAdmin();
        $brand = VehicleBrand::factory()->create(['name' => 'Toyota']);
        $model = VehicleModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Vios']);
        VehicleTrim::factory()->create(['model_id' => $model->id, 'name' => '1.5G-CVT']);

        $this->postJson('/api/admin/vehicle-brands', ['name' => 'toyota'])->assertJsonValidationErrors('name');
        $this->postJson('/api/admin/vehicle-models', ['brand_id' => $brand->id, 'name' => 'VIOS'])->assertJsonValidationErrors('name');
        $this->postJson('/api/admin/vehicle-trims', ['model_id' => $model->id, 'name' => '1.5g-cvt'])->assertJsonValidationErrors('name');
        $this->postJson('/api/admin/vehicle-trims', ['model_id' => $model->id, 'name' => '   '])->assertJsonValidationErrors('name');
        $this->postJson('/api/admin/vehicle-trims', ['model_id' => 999999, 'name' => 'X'])->assertJsonValidationErrors('model_id');
        $this->postJson('/api/admin/vehicle-brands', ['name' => str_repeat('a', 101)])->assertJsonValidationErrors('name');

        // Cùng tên ở dòng xe khác thì hợp lệ.
        $other = VehicleModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Camry']);
        $this->postJson('/api/admin/vehicle-trims', ['model_id' => $other->id, 'name' => '1.5G-CVT'])->assertCreated();

        // Không đổi cấp cha.
        $this->patchJson("/api/admin/vehicle-models/{$model->id}", ['brand_id' => VehicleBrand::factory()->create()->id])
            ->assertJsonValidationErrors('brand_id');
    }

    public function test_lists_with_counts_filters_and_pagination(): void
    {
        $this->actingAsAdmin();
        $brand = VehicleBrand::factory()->create(['name' => 'Toyota']);
        $vios = VehicleModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Vios']);
        VehicleModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Camry', 'status' => 'INACTIVE']);
        VehicleTrim::factory()->count(3)->create(['model_id' => $vios->id]);
        VehicleBrand::factory()->create(['name' => 'Honda']);

        $this->getJson('/api/admin/vehicle-brands?search=toy')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.models_count', 2)
            ->assertJsonPath('data.data.0.trims_count', 3);

        $this->getJson("/api/admin/vehicle-models?brand_id={$brand->id}&status=INACTIVE")
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.name', 'Camry');

        $this->getJson("/api/admin/vehicle-trims?brand_id={$brand->id}&per_page=5")
            ->assertJsonPath('data.total', 3)
            ->assertJsonPath('data.per_page', 5);

        $this->getJson('/api/admin/vehicle-trims?per_page=1000')->assertJsonValidationErrors('per_page');
        $this->getJson('/api/admin/vehicle-brands?status=DELETED')->assertJsonValidationErrors('status');
    }

    public function test_delete_is_blocked_while_in_use(): void
    {
        $this->actingAsAdmin();
        $brand = VehicleBrand::factory()->create();
        $model = VehicleModel::factory()->create(['brand_id' => $brand->id]);
        $trim = VehicleTrim::factory()->create(['model_id' => $model->id]);
        $vehicle = Vehicle::factory()->create(['model_id' => $model->id, 'trim_id' => $trim->id]);
        $vehicle->delete(); // xe đã xóa mềm vẫn giữ lịch sử

        $this->deleteJson("/api/admin/vehicle-trims/{$trim->id}")->assertUnprocessable()->assertJsonPath('success', false);
        $this->assertModelExists($trim);
    }

    public function test_brands_and_models_cannot_be_deleted_only_hidden(): void
    {
        $this->actingAsAdmin();
        $brand = VehicleBrand::factory()->create();
        $model = VehicleModel::factory()->create(['brand_id' => $brand->id]);
        MaintenancePackage::factory()->create(['vehicle_model_id' => $model->id]);

        $this->deleteJson("/api/admin/vehicle-models/{$model->id}")->assertStatus(405);
        $this->deleteJson("/api/admin/vehicle-brands/{$brand->id}")->assertStatus(405);
        $this->assertModelExists($model);
        $this->assertModelExists($brand);

        $this->patchJson("/api/admin/vehicle-models/{$model->id}", ['status' => 'INACTIVE'])->assertOk()->assertJsonPath('data.status', 'INACTIVE');
        $this->patchJson("/api/admin/vehicle-brands/{$brand->id}", ['status' => 'INACTIVE'])->assertOk()->assertJsonPath('data.status', 'INACTIVE');
    }

    public function test_unused_trim_can_be_deleted(): void
    {
        $this->actingAsAdmin();
        $trim = VehicleTrim::factory()->create();

        $this->deleteJson("/api/admin/vehicle-trims/{$trim->id}")->assertOk();

        $this->assertModelMissing($trim);
    }
}
