<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Employee;
use App\Models\RepairOrder;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\Vehicle;
use App\Models\WorkItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServiceControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_only_active_services_and_applies_filters(): void
    {
        Service::factory()->create([
            'name' => 'Bảo dưỡng phanh',
            'category' => 'Bảo dưỡng',
            'status' => 'ACTIVE',
        ]);
        Service::factory()->create([
            'name' => 'Thay dầu',
            'category' => 'Bảo dưỡng',
            'status' => 'ACTIVE',
        ]);
        Service::factory()->create([
            'name' => 'Bảo dưỡng máy lạnh',
            'category' => 'Điện - Lạnh',
            'status' => 'ACTIVE',
        ]);
        Service::factory()->create([
            'name' => 'Bảo dưỡng cũ',
            'category' => 'Bảo dưỡng',
            'status' => 'INACTIVE',
        ]);

        $this->getJson('/api/services?category=B%E1%BA%A3o+d%C6%B0%E1%BB%A1ng&search=B%E1%BA%A3o+d%C6%B0%E1%BB%A1ng')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Bảo dưỡng phanh');
    }

    public function test_index_treats_all_as_no_category_filter_and_orders_results(): void
    {
        Service::factory()->create([
            'name' => 'Thay dầu',
            'category' => 'Bảo dưỡng',
        ]);
        Service::factory()->create([
            'name' => 'Kiểm tra điện',
            'category' => 'Điện - Lạnh',
        ]);

        $this->getJson('/api/services?category=T%E1%BA%A5t+c%E1%BA%A3')
            ->assertOk()
            ->assertJsonPath('0.category', 'Bảo dưỡng')
            ->assertJsonPath('1.category', 'Điện - Lạnh');
    }

    public function test_public_categories_return_admin_icons_and_skip_empty_categories(): void
    {
        $brakes = ServiceCategory::query()->create(['name' => 'Gầm - Phanh', 'icon' => 'disc', 'sort_order' => 2]);
        $oil = ServiceCategory::query()->create(['name' => 'Bảo dưỡng', 'icon' => 'droplet', 'sort_order' => 1]);
        $hidden = ServiceCategory::query()->create(['name' => 'Ẩn', 'icon' => 'bolt', 'sort_order' => 3]);
        ServiceCategory::query()->create(['name' => 'Rỗng', 'icon' => 'gauge', 'sort_order' => 4]);
        Service::factory()->create(['category_id' => $brakes->id, 'status' => 'ACTIVE', 'is_visible' => true]);
        Service::factory()->count(2)->create(['category_id' => $oil->id, 'status' => 'ACTIVE', 'is_visible' => true]);
        Service::factory()->create(['category_id' => $oil->id, 'status' => 'INACTIVE', 'is_visible' => true]);
        Service::factory()->create(['category_id' => $hidden->id, 'status' => 'ACTIVE', 'is_visible' => false]);

        $this->getJson('/api/service-categories')->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Bảo dưỡng')
            ->assertJsonPath('data.0.icon', 'droplet')
            ->assertJsonPath('data.0.services_count', 2)
            ->assertJsonPath('data.1.icon', 'disc');
    }

    public function test_index_ranks_services_by_real_usage_without_exposing_counts(): void
    {
        $oil = Service::factory()->create(['name' => 'Thay dầu']);
        $brake = Service::factory()->create(['name' => 'Kiểm tra phanh']);
        $unused = Service::factory()->create(['name' => 'Rửa xe']);
        $order = $this->repairOrder();
        foreach ([WorkItem::COMPLETED, WorkItem::COMPLETED, WorkItem::IN_PROGRESS] as $status) {
            WorkItem::query()->create(['repair_order_id' => $order->id, 'service_id' => $oil->id, 'status' => $status, 'description' => 'Công việc']);
        }
        WorkItem::query()->create(['repair_order_id' => $order->id, 'service_id' => $brake->id, 'status' => WorkItem::COMPLETED, 'description' => 'Công việc']);
        // Công việc đã hủy không tính là đã dùng.
        WorkItem::query()->create(['repair_order_id' => $order->id, 'service_id' => $brake->id, 'status' => WorkItem::CANCELLED, 'description' => 'Công việc']);
        WorkItem::query()->create(['repair_order_id' => $order->id, 'service_id' => $unused->id, 'status' => WorkItem::CANCELLED, 'description' => 'Công việc']);

        $rows = collect($this->getJson('/api/services')->assertOk()->json())->keyBy('name');

        $this->assertSame(1, $rows['Thay dầu']['popularity_rank']);
        $this->assertSame(2, $rows['Kiểm tra phanh']['popularity_rank']);
        $this->assertNull($rows['Rửa xe']['popularity_rank']);
        $this->assertArrayNotHasKey('usage_count', $rows['Thay dầu'], 'Số lần dùng thật không lộ ra API công khai');
    }

    private function repairOrder(): RepairOrder
    {
        $customer = Customer::factory()->create();

        return RepairOrder::query()->create([
            'repair_order_code' => 'RO-POP-1',
            'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'advisor_id' => Employee::factory()->create()->id,
            'status' => RepairOrder::IN_PROGRESS,
            'received_at' => now(),
        ]);
    }

    public function test_show_hides_inactive_services(): void
    {
        $service = Service::factory()->create(['status' => 'INACTIVE']);

        $this->getJson("/api/services/{$service->id}")
            ->assertNotFound();
    }
}
