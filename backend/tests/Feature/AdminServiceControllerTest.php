<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\MaintenancePackage;
use App\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminServiceControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_service_admin_routes_require_an_admin_account(): void
    {
        $this->getJson('/api/admin/services')->assertUnauthorized();

        $account = Account::factory()->create(['role' => Account::ROLE_ADVISOR]);
        $token = $account->createToken('service-test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/services')
            ->assertForbidden();
    }

    public function test_admin_can_create_list_filter_and_show_services(): void
    {
        $admin = Account::factory()->admin()->create();
        $token = $admin->createToken('service-test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/admin/services', [
                'name' => 'Thay dầu động cơ',
                'category' => 'Bảo dưỡng',
                'description' => 'Thay dầu và kiểm tra động cơ.',
                'base_price' => 500000,
                'estimated_minutes' => 45,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Thay dầu động cơ')
            ->assertJsonPath('data.status', 'ACTIVE');

        $service = Service::query()->firstOrFail();

        $this->getJson('/api/admin/services?category=B%E1%BA%A3o+d%C6%B0%E1%BB%A1ng&status=ACTIVE&search=d%E1%BA%A7u')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id', $service->id);

        $this->getJson('/api/admin/services/'.$service->id)
            ->assertOk()
            ->assertJsonPath('data.id', $service->id);
    }

    public function test_admin_can_update_and_soft_delete_service(): void
    {
        $admin = Account::factory()->admin()->create();
        $token = $admin->createToken('service-test')->plainTextToken;
        $service = Service::factory()->create([
            'name' => 'Dịch vụ cũ',
            'status' => 'ACTIVE',
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson('/api/admin/services/'.$service->id, [
                'name' => 'Dịch vụ đã cập nhật',
                'base_price' => 750000,
                'status' => 'ACTIVE',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Dịch vụ đã cập nhật')
            ->assertJsonPath('data.base_price', '750000.00');

        $this->deleteJson('/api/admin/services/'.$service->id)
            ->assertOk()
            ->assertJsonPath('data.status', 'INACTIVE');

        $this->assertDatabaseHas('services', [
            'id' => $service->id,
            'status' => 'INACTIVE',
        ]);
    }

    public function test_admin_can_set_booking_display_fields_and_sees_active_package_usage(): void
    {
        $admin = Account::factory()->admin()->create();
        $token = $admin->createToken('service-test')->plainTextToken;
        $service = Service::factory()->create();
        MaintenancePackage::factory()->create()->services()->attach($service->id, ['quantity' => 1]);
        MaintenancePackage::factory()->create(['status' => 'INACTIVE'])->services()->attach($service->id, ['quantity' => 1]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->patchJson('/api/admin/services/'.$service->id, ['is_popular' => true, 'sort_order' => 3])
            ->assertOk()
            ->assertJsonPath('data.is_popular', true)
            ->assertJsonPath('data.sort_order', 3);

        $this->getJson('/api/admin/services')
            ->assertOk()
            ->assertJsonPath('data.data.0.active_packages_count', 1);
    }

    public function test_service_validation_rejects_invalid_and_duplicate_data(): void
    {
        $admin = Account::factory()->admin()->create();
        $token = $admin->createToken('service-test')->plainTextToken;
        Service::factory()->create(['name' => 'Tên đã dùng']);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/admin/services', [
                'name' => 'Tên đã dùng',
                'base_price' => -1,
                'estimated_minutes' => 0,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'base_price', 'estimated_minutes']);
    }
}
