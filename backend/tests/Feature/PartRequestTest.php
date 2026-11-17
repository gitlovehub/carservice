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

/**
 * P6 + ADV-01 (D-020) — phụ tùng chờ.
 * Cố vấn báo thiếu (tự động khi khách duyệt mà thiếu hàng, hoặc báo tay); Admin / kho đặt hàng + nhận hàng (nhập kho một lần).
 */
class PartRequestTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $admin;

    private Account $customerAccount;

    private RepairOrder $order;

    private Part $part;

    protected function setUp(): void
    {
        parent::setUp();
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $this->admin = Account::factory()->admin()->create();
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

    public function test_shortage_creates_request_and_admin_orders_and_receives_once(): void
    {
        $this->approveAndStart(0);
        $request = PartRequest::query()->sole();
        $this->assertSame(2, $request->quantity);
        $this->assertSame(PartRequest::REQUESTED, $request->status);

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/waiting-for-parts")->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/resume")->assertUnprocessable();

        $this->actingAs($this->admin)->postJson("/api/part-requests/{$request->id}/order", ['eta_date' => now()->addDays(3)->toDateString(), 'supplier_note' => 'NCC A'])
            ->assertOk()->assertJsonPath('status', 'ORDERED');
        $this->actingAs($this->customerAccount)->getJson("/api/me/repair-orders/{$this->order->id}")->assertOk()
            ->assertJsonPath('part_requests.0.status', 'ORDERED')
            ->assertJsonPath('part_requests.0.eta_date', now()->addDays(3)->toDateString())
            ->assertJsonMissingPath('part_requests.0.supplier_note');

        $this->actingAs($this->admin)->postJson("/api/part-requests/{$request->id}/receive")->assertOk()->assertJsonPath('status', 'RECEIVED');
        $this->assertSame(2, Inventory::query()->where('part_id', $this->part->id)->value('quantity'));
        $this->assertSame(1, InventoryTransaction::query()->where('transaction_type', 'IN')->count());
        $this->assertSame($this->customerAccount->id, Notification::query()->where('type', 'PART_ARRIVED')->sole()->account_id);
        $this->actingAs($this->admin)->postJson("/api/part-requests/{$request->id}/receive")->assertUnprocessable();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/resume")->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/used-parts", ['part_id' => $this->part->id, 'quantity' => 2])->assertCreated();
        $this->assertSame(0, Inventory::query()->where('part_id', $this->part->id)->value('quantity'));
    }

    public function test_advisor_only_reports_and_cannot_order_or_receive(): void
    {
        $this->approveAndStart(0);
        $request = PartRequest::query()->sole();

        $this->actingAs($this->advisor)->postJson("/api/part-requests/{$request->id}/order", ['eta_date' => now()->addDay()->toDateString()])->assertForbidden();
        $this->actingAs($this->advisor)->postJson("/api/part-requests/{$request->id}/receive")->assertForbidden();
        $this->assertSame(0, Inventory::query()->where('part_id', $this->part->id)->value('quantity'));
        $this->assertSame(PartRequest::REQUESTED, $request->fresh()->status);
    }

    public function test_waiting_for_parts_requires_an_open_request_or_reported_parts(): void
    {
        $this->approveAndStart(5); // đủ hàng → không tự tạo yêu cầu
        $this->assertSame(0, PartRequest::query()->count());

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/waiting-for-parts")->assertUnprocessable();
        $this->assertSame(RepairOrder::IN_PROGRESS, $this->order->fresh()->status);

        $other = Part::query()->create(['sku' => 'LG-1', 'name' => 'Lọc gió', 'unit' => 'Cái', 'sell_price' => 150000, 'status' => 'ACTIVE']);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/waiting-for-parts", [
            'parts' => [['part_id' => $other->id, 'quantity' => 1, 'note' => 'Phát hiện rách khi tháo']],
        ])->assertOk();

        $this->assertSame(RepairOrder::WAITING_FOR_PARTS, $this->order->fresh()->status);
        $request = PartRequest::query()->sole();
        $this->assertSame($other->id, $request->part_id);
        $this->assertSame('Phát hiện rách khi tháo', $request->request_note);
        $this->assertSame($this->advisor->id, $request->created_by_account_id);
    }

    public function test_advisor_reports_shortage_once_per_part_while_repairing(): void
    {
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/part-requests", ['part_id' => $this->part->id, 'quantity' => 1])
            ->assertUnprocessable(); // phiếu chưa sửa

        $this->approveAndStart(5);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/part-requests", ['part_id' => $this->part->id, 'quantity' => 1, 'note' => 'Cần dự phòng'])
            ->assertCreated()->assertJsonPath('status', 'REQUESTED')->assertJsonPath('request_note', 'Cần dự phòng');
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/part-requests", ['part_id' => $this->part->id, 'quantity' => 2])
            ->assertUnprocessable();
        $this->actingAs($this->customerAccount)->postJson("/api/repair-orders/{$this->order->id}/part-requests", ['part_id' => $this->part->id, 'quantity' => 1])
            ->assertForbidden();
    }

    public function test_receive_already_in_stock_closes_without_adding_stock_twice(): void
    {
        $this->approveAndStart(0);
        $request = PartRequest::query()->sole();

        // Kho đã nhập hàng bằng phiếu nhập thường (chưa đủ) → không cho đóng kiểu "đã có trong kho".
        $this->actingAs($this->admin)->postJson("/api/admin/parts/{$this->part->id}/stock", ['type' => 'IN', 'quantity' => 1])->assertOk();
        $this->actingAs($this->admin)->postJson("/api/part-requests/{$request->id}/receive", ['already_in_stock' => true])->assertUnprocessable();

        $this->actingAs($this->admin)->postJson("/api/admin/parts/{$this->part->id}/stock", ['type' => 'IN', 'quantity' => 1])->assertOk();
        $this->actingAs($this->admin)->getJson('/api/admin/parts?search=BP-1')->assertOk()->assertJsonPath('data.0.requested', 2);
        $this->actingAs($this->admin)->postJson("/api/part-requests/{$request->id}/receive", ['already_in_stock' => true])->assertOk()->assertJsonPath('status', 'RECEIVED');

        $this->assertSame(2, Inventory::query()->where('part_id', $this->part->id)->value('quantity'));
        $this->assertSame(2, InventoryTransaction::query()->where('transaction_type', 'IN')->count()); // chỉ 2 phiếu nhập thường
        $this->actingAs($this->admin)->getJson('/api/admin/parts?search=BP-1')->assertOk()->assertJsonPath('data.0.requested', 0);
    }

    public function test_resume_with_reason_and_cancel_rules(): void
    {
        $this->approveAndStart(0);
        $request = PartRequest::query()->sole();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/waiting-for-parts")->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/resume", ['note' => 'Làm hạng mục khác trước'])->assertOk();

        // Kho đã đặt hàng → cố vấn không tự hủy được, Admin hủy được.
        $this->actingAs($this->admin)->postJson("/api/part-requests/{$request->id}/order", ['eta_date' => now()->addDay()->toDateString()])->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/part-requests/{$request->id}/cancel", ['reason' => 'Khách tự mua'])->assertForbidden();
        $this->actingAs($this->admin)->postJson("/api/part-requests/{$request->id}/cancel", ['reason' => 'x'])->assertUnprocessable();
        $this->actingAs($this->admin)->postJson("/api/part-requests/{$request->id}/cancel", ['reason' => 'Khách tự mua'])->assertOk()->assertJsonPath('status', 'CANCELLED');
        $this->actingAs($this->admin)->postJson("/api/part-requests/{$request->id}/order", ['eta_date' => now()->addDay()->toDateString()])->assertUnprocessable();
    }

    public function test_advisor_can_withdraw_request_before_it_is_ordered(): void
    {
        $this->approveAndStart(0);
        $request = PartRequest::query()->sole();
        $this->actingAs($this->advisor)->postJson("/api/part-requests/{$request->id}/cancel", ['reason' => 'Khách tự mua'])->assertOk()->assertJsonPath('status', 'CANCELLED');
    }

    public function test_list_filters_overdue_and_customers_cannot_access(): void
    {
        $this->approveAndStart(0);
        $request = PartRequest::query()->sole();
        $this->actingAs($this->admin)->postJson("/api/part-requests/{$request->id}/order", ['eta_date' => now()->addDay()->toDateString()])->assertOk();

        $this->actingAs($this->advisor)->getJson('/api/part-requests?status=OPEN')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.repair_order.repair_order_code', 'RO-PART');
        $this->actingAs($this->admin)->getJson('/api/part-requests?overdue=1')->assertOk()->assertJsonCount(0, 'data');
        $this->travel(3)->days();
        $this->actingAs($this->admin)->getJson('/api/part-requests?overdue=1')->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($this->customerAccount)->getJson('/api/part-requests')->assertForbidden();
        $this->actingAs($this->customerAccount)->postJson("/api/part-requests/{$request->id}/receive")->assertForbidden();
    }

    public function test_admin_order_detail_lists_part_requests(): void
    {
        $this->approveAndStart(0);
        $this->actingAs($this->admin)->getJson("/api/admin/repair-orders/{$this->order->id}")->assertOk()
            ->assertJsonPath('data.part_requests.0.part', 'Bơm xăng')
            ->assertJsonPath('data.part_requests.0.status', 'REQUESTED')
            ->assertJsonPath('data.part_requests.0.quantity', 2);
    }
}
