<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Inspection;
use App\Models\InspectionRecommendation;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Notification;
use App\Models\Part;
use App\Models\PartRequest;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** P6 — phụ tùng chờ: tự tạo yêu cầu khi thiếu hàng, ETA, nhập kho khi về, báo khách, chặn tiếp tục nếu chưa về. */
class PartRequestTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $customerAccount;

    private RepairOrder $order;

    private Part $part;

    protected function setUp(): void
    {
        parent::setUp();
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $this->customerAccount = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $this->customerAccount->id]);
        $this->part = Part::query()->create(['sku' => 'BP-1', 'name' => 'Bơm xăng', 'unit' => 'Cái', 'sell_price' => 1200000, 'status' => 'ACTIVE']);
        $this->order = RepairOrder::query()->create([
            'repair_order_code' => 'RO-PART', 'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'advisor_id' => $this->advisor->employee->id, 'status' => RepairOrder::QUOTING, 'received_at' => now(),
        ]);
        $inspection = Inspection::query()->create(['repair_order_id' => $this->order->id, 'diagnosis' => 'Bơm xăng yếu', 'inspected_at' => now()]);
        InspectionRecommendation::query()->create(['inspection_id' => $inspection->id, 'item_type' => 'PART', 'part_id' => $this->part->id, 'quantity' => 2]);
    }

    private function approveAndStart(int $stock): void
    {
        Inventory::query()->create(['part_id' => $this->part->id, 'quantity' => $stock]);
        $id = $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/quotations", [
            'items' => [['item_type' => 'PART', 'part_id' => $this->part->id, 'quantity' => 2]],
        ])->assertCreated()->json('id');
        $this->actingAs($this->advisor)->postJson("/api/quotations/{$id}/send")->assertOk();
        $itemId = $this->order->fresh()->latestQuotation->items()->value('id');
        $this->actingAs($this->customerAccount)->postJson("/api/me/quotations/{$id}/respond", ['responses' => [['item_id' => $itemId, 'is_approved' => true]]])->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/start-repair")->assertOk();
    }

    public function test_shortage_creates_request_and_receiving_restocks_and_notifies(): void
    {
        $this->approveAndStart(0);
        $request = PartRequest::query()->sole();
        $this->assertSame(2, $request->quantity);
        $this->assertSame(PartRequest::REQUESTED, $request->status);

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/waiting-for-parts")->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/resume")->assertUnprocessable();

        $this->actingAs($this->advisor)->postJson("/api/part-requests/{$request->id}/order", ['eta_date' => now()->addDays(3)->toDateString(), 'supplier_note' => 'NCC A'])
            ->assertOk()->assertJsonPath('status', 'ORDERED');
        $this->actingAs($this->customerAccount)->getJson("/api/me/repair-orders/{$this->order->id}")->assertOk()
            ->assertJsonPath('part_requests.0.status', 'ORDERED')
            ->assertJsonPath('part_requests.0.eta_date', now()->addDays(3)->toDateString())
            ->assertJsonMissingPath('part_requests.0.supplier_note');

        $this->actingAs($this->advisor)->postJson("/api/part-requests/{$request->id}/receive")->assertOk()->assertJsonPath('status', 'RECEIVED');
        $this->assertSame(2, Inventory::query()->where('part_id', $this->part->id)->value('quantity'));
        $this->assertSame(1, InventoryTransaction::query()->where('transaction_type', 'IN')->count());
        $this->assertSame($this->customerAccount->id, Notification::query()->where('type', 'PART_ARRIVED')->sole()->account_id);
        $this->actingAs($this->advisor)->postJson("/api/part-requests/{$request->id}/receive")->assertUnprocessable();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/resume")->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/used-parts", ['part_id' => $this->part->id, 'quantity' => 2])->assertCreated();
        $this->assertSame(0, Inventory::query()->where('part_id', $this->part->id)->value('quantity'));
    }

    public function test_enough_stock_creates_no_request(): void
    {
        $this->approveAndStart(5);
        $this->assertSame(0, PartRequest::query()->count());
    }

    public function test_partial_stock_requests_only_missing_quantity(): void
    {
        $this->approveAndStart(1);
        $this->assertSame(1, PartRequest::query()->sole()->quantity);
    }

    public function test_resume_with_reason_allowed_and_cancel_requires_reason(): void
    {
        $this->approveAndStart(0);
        $request = PartRequest::query()->sole();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/waiting-for-parts")->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/resume", ['note' => 'Làm hạng mục khác trước'])->assertOk();

        $this->actingAs($this->advisor)->postJson("/api/part-requests/{$request->id}/cancel", ['reason' => 'x'])->assertUnprocessable();
        $this->actingAs($this->advisor)->postJson("/api/part-requests/{$request->id}/cancel", ['reason' => 'Khách tự mua'])->assertOk()->assertJsonPath('status', 'CANCELLED');
        $this->actingAs($this->advisor)->postJson("/api/part-requests/{$request->id}/order", ['eta_date' => now()->addDay()->toDateString()])->assertUnprocessable();
    }

    public function test_list_filters_overdue_and_customers_cannot_access(): void
    {
        $this->approveAndStart(0);
        $request = PartRequest::query()->sole();
        $this->actingAs($this->advisor)->postJson("/api/part-requests/{$request->id}/order", ['eta_date' => now()->addDay()->toDateString()])->assertOk();

        $this->actingAs($this->advisor)->getJson('/api/part-requests?status=OPEN')->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($this->advisor)->getJson('/api/part-requests?overdue=1')->assertOk()->assertJsonCount(0, 'data');
        $this->travel(3)->days();
        $this->actingAs($this->advisor)->getJson('/api/part-requests?overdue=1')->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($this->customerAccount)->getJson('/api/part-requests')->assertForbidden();
        $this->actingAs($this->customerAccount)->postJson("/api/part-requests/{$request->id}/receive")->assertForbidden();
    }
}
