<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Inspection;
use App\Models\RepairOrder;
use App\Models\Service;
use App\Models\Vehicle;
use App\Models\WorkItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** P5-A — bước chuẩn dịch vụ: công việc theo bước, phút chuẩn, giờ dự kiến xong; không đổi tiền. */
class ServiceStepsTest extends TestCase
{
    use RefreshDatabase;

    private Account $admin;

    private Account $advisor;

    private Account $customerAccount;

    private RepairOrder $order;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = Account::factory()->create(['role' => Account::ROLE_ADMIN]);
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $this->customerAccount = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $this->customerAccount->id]);
        $this->order = RepairOrder::query()->create([
            'repair_order_code' => 'RO-STEP', 'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'advisor_id' => $this->advisor->employee->id, 'status' => RepairOrder::QUOTING, 'received_at' => now(),
        ]);
        Inspection::query()->create(['repair_order_id' => $this->order->id, 'diagnosis' => 'x', 'inspected_at' => now()]);
    }

    private function approveAndStart(Service $service): void
    {
        $id = $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/quotations", [
            'items' => [['item_type' => 'SERVICE', 'service_id' => $service->id, 'quantity' => 1]],
        ])->assertCreated()->json('id');
        $this->actingAs($this->advisor)->postJson("/api/quotations/{$id}/send")->assertOk();
        $itemId = $this->order->fresh()->latestQuotation->items()->value('id');
        $this->actingAs($this->customerAccount)->postJson("/api/me/quotations/{$id}/respond", ['responses' => [['item_id' => $itemId, 'is_approved' => true]]])->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/start-repair")->assertOk();
    }

    public function test_admin_configures_steps_and_level(): void
    {
        $service = Service::factory()->create(['estimated_minutes' => 10]);

        $this->actingAs($this->advisor)->putJson("/api/admin/services/{$service->id}/steps", ['steps' => []])->assertForbidden();
        $this->actingAs($this->admin)->putJson("/api/admin/services/{$service->id}/steps", ['steps' => [
            ['name' => 'Xả dầu cũ', 'standard_minutes' => 10],
            ['name' => 'Thay lọc + châm dầu', 'standard_minutes' => 15, 'requires_photo' => true],
        ]])->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.1.step_order', 2)->assertJsonPath('service.estimated_minutes', 25);

        $this->actingAs($this->admin)->patchJson("/api/admin/services/{$service->id}", ['service_level' => 'QUICK', 'requires_vehicle_stay' => false])
            ->assertOk()->assertJsonPath('data.service_level', 'QUICK');
        $this->actingAs($this->admin)->patchJson("/api/admin/services/{$service->id}", ['service_level' => 'SUPER'])->assertUnprocessable();
        $this->assertSame('STANDARD', Service::factory()->create()->fresh()->service_level);
    }

    public function test_work_items_follow_steps_and_ready_time_is_estimated(): void
    {
        $service = Service::factory()->create(['base_price' => 400000, 'status' => 'ACTIVE']);
        $service->steps()->createMany([
            ['step_order' => 1, 'name' => 'Tháo', 'standard_minutes' => 30],
            ['step_order' => 2, 'name' => 'Lắp', 'standard_minutes' => 45],
        ]);

        $this->freezeSecond();
        $this->approveAndStart($service);

        $items = WorkItem::query()->where('repair_order_id', $this->order->id)->orderBy('id')->get();
        $this->assertCount(2, $items);
        $this->assertSame([30, 45], $items->pluck('standard_minutes')->all());
        $this->assertNotNull($items[0]->service_step_id);
        $this->assertTrue($this->order->fresh()->estimated_ready_at->equalTo(now()->addMinutes(75)));

        // Tiền không đổi: hóa đơn vẫn 1 dòng dịch vụ theo báo giá.
        WorkItem::query()->where('repair_order_id', $this->order->id)->update(['status' => WorkItem::COMPLETED]);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/complete")->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/invoice")->assertCreated()
            ->assertJsonCount(1, 'items')->assertJsonPath('total_amount', '400000.00');
    }

    public function test_service_without_steps_uses_estimated_minutes(): void
    {
        $service = Service::factory()->create(['estimated_minutes' => 40, 'status' => 'ACTIVE']);
        $this->freezeSecond();
        $this->approveAndStart($service);

        $item = WorkItem::query()->where('repair_order_id', $this->order->id)->sole();
        $this->assertSame(40, $item->standard_minutes);
        $this->assertNull($item->service_step_id);
        $this->assertTrue($this->order->fresh()->estimated_ready_at->equalTo(now()->addMinutes(40)));
    }
}
