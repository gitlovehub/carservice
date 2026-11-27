<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Employee;
use App\Models\MaintenancePackage;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\Vehicle;
use App\Models\VehicleModel;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Thiết kế lại Lịch hẹn / Dịch vụ / Gói bảo dưỡng (Admin): danh mục, kéo thả, hiển thị, lọc tuần, khách không đến. */
class AdminCatalogRedesignTest extends TestCase
{
    use RefreshDatabase;

    private Account $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = Account::factory()->create(['role' => Account::ROLE_ADMIN]);
    }

    public function test_service_categories_crud_counts_and_string_sync(): void
    {
        $this->actingAs($this->admin);
        $id = $this->postJson('/api/admin/service-categories', ['name' => '  Điều   hoà ', 'icon' => 'snowflake'])
            ->assertCreated()->assertJsonPath('data.name', 'Điều hoà')->json('data.id');
        $this->postJson('/api/admin/service-categories', ['name' => 'Điều hoà', 'icon' => 'bolt'])->assertUnprocessable();
        $this->postJson('/api/admin/service-categories', ['name' => 'Lạ', 'icon' => 'rocket'])->assertUnprocessable();

        $service = Service::factory()->create(['name' => 'Nạp gas', 'category_id' => $id]);
        $this->assertSame('Điều hoà', $service->fresh()->category);

        // Gửi chuỗi (API cũ) → tự tạo / gắn danh mục cùng tên.
        $legacy = Service::factory()->create(['name' => 'Đảo lốp', 'category' => 'Lốp - mâm']);
        $this->assertSame('Lốp - mâm', $legacy->fresh()->serviceCategory->name);
        $this->assertSame('tire', $legacy->fresh()->serviceCategory->icon);

        $this->getJson('/api/admin/service-categories')->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonFragment(['name' => 'Điều hoà', 'services_count' => 1, 'active_services_count' => 1]);

        // Đổi tên kéo theo chuỗi category; danh mục còn dịch vụ thì không xoá được.
        $this->patchJson("/api/admin/service-categories/{$id}", ['name' => 'Điều hoà ô tô', 'icon' => 'snowflake'])->assertOk();
        $this->assertSame('Điều hoà ô tô', $service->fresh()->category);
        $this->deleteJson("/api/admin/service-categories/{$id}")->assertUnprocessable();

        $service->update(['category_id' => null]);
        $this->assertNull($service->fresh()->category);
        $this->deleteJson("/api/admin/service-categories/{$id}")->assertOk();
        $this->assertDatabaseMissing('service_categories', ['id' => $id]);
    }

    public function test_admin_services_filter_by_category_newest_first_and_reorder_is_gone(): void
    {
        $category = ServiceCategory::query()->create(['name' => 'Phanh', 'icon' => 'disc']);
        foreach (['A', 'B', 'C', 'D'] as $i => $n) {
            Service::factory()->create([
                'name' => "DV {$n}", 'category_id' => in_array($n, ['B', 'D'], true) ? $category->id : null,
                'created_at' => now()->subMinutes(10 - $i),
            ]);
        }

        // D-018: mặc định dịch vụ mới tạo lên đầu, không còn đổi thứ tự thủ công.
        $this->actingAs($this->admin)->getJson("/api/admin/services?category_id={$category->id}&per_page=8")->assertOk()
            ->assertJsonPath('data.total', 2)->assertJsonPath('data.data.0.name', 'DV D')
            ->assertJsonPath('data.data.0.service_category.icon', 'disc');

        // Route reorder đã gỡ: URL cũ rơi vào admin/services/{service} với "reorder" không phải id → 404.
        $this->putJson('/api/admin/services/reorder', ['ids' => [1]])->assertNotFound();
    }

    public function test_hidden_service_is_not_offered_to_customers_but_staff_still_see_it(): void
    {
        $hidden = Service::factory()->create(['name' => 'Ẩn khỏi đặt lịch', 'is_visible' => false]);
        Service::factory()->create(['name' => 'Hiện cho khách']);

        $names = collect($this->getJson('/api/services')->assertOk()->json())->pluck('name');
        $this->assertNotContains('Ẩn khỏi đặt lịch', $names);
        $this->getJson("/api/services/{$hidden->id}")->assertNotFound();

        $advisor = Account::factory()->advisor()->create();
        $token = $advisor->createToken('t')->plainTextToken;
        $staffNames = collect($this->withHeader('Authorization', "Bearer {$token}")->getJson('/api/services')->json())->pluck('name');
        $this->assertContains('Ẩn khỏi đặt lịch', $staffNames);

        $this->flushHeaders();
        $this->app['auth']->forgetGuards();
        $this->actingAs($this->admin)->patchJson("/api/admin/services/{$hidden->id}", ['is_visible' => true])
            ->assertOk()->assertJsonPath('data.is_visible', true);
    }

    public function test_packages_filter_by_brand_and_general(): void
    {
        $model = VehicleModel::factory()->create();
        MaintenancePackage::query()->create(['name' => 'Gói riêng', 'vehicle_model_id' => $model->id, 'mileage_milestone' => 10000]);
        MaintenancePackage::query()->create(['name' => 'Gói chung', 'mileage_milestone' => 5000]);

        $this->actingAs($this->admin);
        $this->getJson("/api/admin/maintenance-packages?brand_id={$model->brand_id}")->assertOk()
            ->assertJsonPath('data.total', 1)->assertJsonPath('data.data.0.name', 'Gói riêng')
            ->assertJsonPath('data.data.0.vehicle_model.brand.id', $model->brand_id);
        $this->getJson('/api/admin/maintenance-packages?brand_id=general&per_page=5')->assertOk()
            ->assertJsonPath('data.total', 1)->assertJsonPath('data.data.0.name', 'Gói chung');
    }

    public function test_appointments_week_filter_counts_estimates_and_no_show(): void
    {
        Employee::factory()->create(['account_id' => $this->admin->id]);
        $vehicle = Vehicle::factory()->create();
        $monday = CarbonImmutable::today()->startOfWeek();
        $oil = Service::factory()->create(['estimated_minutes' => 45, 'base_price' => 300000]);
        $make = function (string $status, CarbonImmutable $date, string $type = 'MAINTENANCE', string $time = '09:00:00') use ($vehicle) {
            return Appointment::query()->create([
                'appointment_code' => 'APT-'.uniqid(), 'customer_id' => $vehicle->customer_id, 'vehicle_id' => $vehicle->id,
                'appointment_date' => $date->toDateString(), 'appointment_time' => $time, 'request_type' => $type, 'status' => $status,
            ]);
        };
        $first = $make('PENDING', $monday);
        $first->services()->attach($oil->id, ['estimated_price' => 280000]);
        $make('CONFIRMED', $monday->addDay(), 'REPAIR');
        $make('CANCELLED', $monday->addDays(2));
        $make('PENDING', $monday->addWeeks(2)); // ngoài tuần

        $this->actingAs($this->admin);
        $range = 'date_from='.$monday->toDateString().'&date_to='.$monday->endOfWeek()->toDateString();
        $res = $this->getJson("/api/advisor/appointments?{$range}&status=PENDING")->assertOk()
            ->assertJsonPath('counts.ALL', 3)->assertJsonPath('counts.PENDING', 1)->assertJsonPath('counts.CONFIRMED', 1)
            ->assertJsonPath('pagination.total', 1);
        $row = $res->json('data.0');
        $this->assertSame(45, $row['estimated_minutes']);
        $this->assertSame('09:45', $row['end_time']);
        $this->assertEquals(280000, $row['estimated_total']);

        $this->getJson("/api/advisor/appointments?{$range}&request_type=REPAIR")->assertOk()->assertJsonPath('pagination.total', 1);

        // Khách không đến: lịch tương lai bị chặn, lịch đã qua giờ thì được.
        $future = $make('CONFIRMED', CarbonImmutable::today()->addDays(3));
        $this->postJson("/api/advisor/appointments/{$future->id}/no-show")->assertStatus(400);
        $past = $make('CONFIRMED', CarbonImmutable::today()->subDay());
        $this->postJson("/api/advisor/appointments/{$past->id}/no-show")->assertOk();
        $this->assertSame('NO_SHOW', $past->fresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'appointment.no_show', 'auditable_id' => $past->id]);
        $this->postJson("/api/advisor/appointments/{$past->id}/no-show")->assertStatus(400);
    }
}
