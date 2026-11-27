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

    public function test_admin_permanently_deletes_stopped_unused_service_with_its_steps(): void
    {
        $service = Service::factory()->create(['status' => 'INACTIVE', 'is_visible' => false]);
        $step = $service->steps()->create(['step_order' => 1, 'name' => 'Kiểm tra', 'standard_minutes' => 10]);

        $this->actingAs(Account::factory()->admin()->create())
            ->deleteJson("/api/admin/services/{$service->id}/permanent")
            ->assertOk()
            ->assertJsonPath('message', 'Đã xóa vĩnh viễn dịch vụ.');

        $this->assertModelMissing($service);
        $this->assertModelMissing($step);
    }

    public function test_permanent_delete_refuses_active_service(): void
    {
        $service = Service::factory()->create(['status' => 'ACTIVE']);

        $this->actingAs(Account::factory()->admin()->create())
            ->deleteJson("/api/admin/services/{$service->id}/permanent")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Hãy tắt cả Đang áp dụng và Hiển thị cho khách trước khi xóa vĩnh viễn.');

        $this->assertModelExists($service);
    }

    public function test_permanent_delete_refuses_stopped_service_still_flagged_visible(): void
    {
        $service = Service::factory()->create(['status' => 'INACTIVE', 'is_visible' => true]);

        $this->actingAs(Account::factory()->admin()->create())
            ->deleteJson("/api/admin/services/{$service->id}/permanent")
            ->assertUnprocessable();

        $this->assertModelExists($service);
    }

    public function test_uncategorized_service_cannot_be_activated(): void
    {
        $admin = Account::factory()->admin()->create();
        $draft = Service::factory()->create(['category' => null, 'status' => 'INACTIVE', 'is_visible' => false]);

        $this->actingAs($admin)->patchJson("/api/admin/services/{$draft->id}", ['status' => 'ACTIVE'])
            ->assertUnprocessable()->assertJsonValidationErrors('status');
        $this->postJson('/api/admin/services', ['name' => 'Nháp mới', 'base_price' => 100000, 'estimated_minutes' => 30, 'status' => 'ACTIVE'])
            ->assertUnprocessable()->assertJsonValidationErrors('status');

        $this->assertSame('INACTIVE', $draft->fresh()->status);
    }

    public function test_visibility_requires_active_and_follows_it_off(): void
    {
        $admin = Account::factory()->admin()->create();
        $stopped = Service::factory()->create(['status' => 'INACTIVE', 'is_visible' => false]);
        $this->actingAs($admin)->patchJson("/api/admin/services/{$stopped->id}", ['is_visible' => true])
            ->assertUnprocessable()->assertJsonValidationErrors('is_visible');

        $running = Service::factory()->create(['status' => 'ACTIVE', 'is_visible' => true]);
        $this->patchJson("/api/admin/services/{$running->id}", ['status' => 'INACTIVE'])->assertOk()
            ->assertJsonPath('data.is_visible', false);
        $this->patchJson("/api/admin/services/{$running->id}", ['status' => 'ACTIVE'])->assertOk()
            ->assertJsonPath('data.status', 'ACTIVE')->assertJsonPath('data.is_visible', false);
    }

    public function test_removing_category_turns_both_states_off(): void
    {
        $service = Service::factory()->create(['status' => 'ACTIVE', 'is_visible' => true]);

        $this->actingAs(Account::factory()->admin()->create())
            ->patchJson("/api/admin/services/{$service->id}", ['category_id' => null])->assertOk()
            ->assertJsonPath('data.status', 'INACTIVE')->assertJsonPath('data.is_visible', false);
    }

    public function test_active_service_keeps_price_and_steps_control_minutes(): void
    {
        $admin = Account::factory()->admin()->create();
        $service = Service::factory()->create(['status' => 'ACTIVE', 'base_price' => 200000, 'estimated_minutes' => 30]);
        $this->actingAs($admin)->patchJson("/api/admin/services/{$service->id}", ['base_price' => 0])
            ->assertUnprocessable()->assertJsonValidationErrors('base_price');

        $service->steps()->create(['step_order' => 1, 'name' => 'Tháo', 'standard_minutes' => 30]);
        $this->patchJson("/api/admin/services/{$service->id}", ['estimated_minutes' => 99])
            ->assertUnprocessable()->assertJsonValidationErrors('estimated_minutes');
    }

    public function test_steps_reject_blank_duplicate_and_zero_minutes(): void
    {
        $service = Service::factory()->create();
        $this->actingAs(Account::factory()->admin()->create());

        $this->putJson("/api/admin/services/{$service->id}/steps", ['steps' => [['name' => '', 'standard_minutes' => 10]]])
            ->assertJsonValidationErrors('steps.0.name');
        $this->putJson("/api/admin/services/{$service->id}/steps", ['steps' => [['name' => 'Tháo', 'standard_minutes' => 10], ['name' => 'THÁO', 'standard_minutes' => 10]]])
            ->assertJsonValidationErrors('steps.1.name');
        $this->putJson("/api/admin/services/{$service->id}/steps", ['steps' => [['name' => 'Tháo', 'standard_minutes' => 0]]])
            ->assertJsonValidationErrors('steps.0.standard_minutes');
    }

    public function test_permanent_delete_refuses_service_in_use_and_list_flags_it(): void
    {
        $admin = Account::factory()->admin()->create();
        $used = Service::factory()->create(['status' => 'INACTIVE', 'is_visible' => false]);
        $unused = Service::factory()->create(['status' => 'INACTIVE', 'is_visible' => false]);
        MaintenancePackage::factory()->create()->services()->attach($used->id, ['quantity' => 1]);

        $rows = collect($this->actingAs($admin)->getJson('/api/admin/services')->assertOk()->json('data.data'))->keyBy('id');
        $this->assertTrue($rows[$used->id]['is_in_use']);
        $this->assertFalse($rows[$unused->id]['is_in_use']);

        $this->deleteJson("/api/admin/services/{$used->id}/permanent")->assertConflict();
        $this->assertModelExists($used);
    }

    public function test_advisor_cannot_permanently_delete_service(): void
    {
        $service = Service::factory()->create(['status' => 'INACTIVE']);

        $this->actingAs(Account::factory()->advisor()->create())
            ->deleteJson("/api/admin/services/{$service->id}/permanent")
            ->assertForbidden();

        $this->assertModelExists($service);
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
