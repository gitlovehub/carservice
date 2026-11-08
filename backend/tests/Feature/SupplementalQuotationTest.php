<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Inspection;
use App\Models\InspectionRecommendation;
use App\Models\Inventory;
use App\Models\Part;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\Service;
use App\Models\Vehicle;
use App\Models\WorkItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** P3-B — báo giá phát sinh: cộng thêm vào báo giá gốc, khách duyệt từng dòng, chỉ dòng được duyệt vào hóa đơn. */
class SupplementalQuotationTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $customerAccount;

    private RepairOrder $order;

    private Inspection $inspection;

    private Service $initialService;

    private Service $extraService;

    private Part $extraPart;

    protected function setUp(): void
    {
        parent::setUp();
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $this->customerAccount = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $this->customerAccount->id]);
        $this->initialService = Service::factory()->create(['name' => 'Thay dầu', 'base_price' => 300000, 'status' => 'ACTIVE']);
        $this->extraService = Service::factory()->create(['name' => 'Vệ sinh kim phun', 'base_price' => 200000, 'status' => 'ACTIVE']);
        $this->extraPart = Part::query()->create(['sku' => 'BG-1', 'name' => 'Bugi', 'unit' => 'Cái', 'sell_price' => 150000, 'status' => 'ACTIVE']);
        Inventory::query()->create(['part_id' => $this->extraPart->id, 'quantity' => 10]);

        $this->order = RepairOrder::query()->create([
            'repair_order_code' => 'RO-SUP', 'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'advisor_id' => $this->advisor->employee->id, 'status' => RepairOrder::QUOTING, 'received_at' => now(),
        ]);
        $this->inspection = Inspection::query()->create(['repair_order_id' => $this->order->id, 'diagnosis' => 'Đến hạn thay dầu', 'inspected_at' => now()]);

        // Báo giá gốc: 1 dịch vụ 300.000, khách duyệt, bắt đầu sửa.
        $initial = $this->quote(['items' => [['item_type' => 'SERVICE', 'service_id' => $this->initialService->id, 'quantity' => 1]]])->assertCreated()->json('id');
        $this->sendAndRespond($initial, fn () => true);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/start-repair")->assertOk();
    }

    private function quote(array $payload)
    {
        return $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/quotations", $payload);
    }

    private function sendAndRespond(int $quotationId, callable $decide): Quotation
    {
        $this->actingAs($this->advisor)->postJson("/api/quotations/{$quotationId}/send")->assertOk();
        $quotation = Quotation::query()->with('items')->findOrFail($quotationId);
        $this->actingAs($this->customerAccount)->postJson("/api/me/quotations/{$quotationId}/respond", [
            'responses' => $quotation->items->map(fn ($item) => ['item_id' => $item->id, 'is_approved' => $decide($item)])->all(),
        ])->assertOk();

        return $quotation->fresh('items');
    }

    private function supplement(array $overrides = [])
    {
        InspectionRecommendation::query()->firstOrCreate(
            ['inspection_id' => $this->inspection->id, 'item_type' => 'PART', 'part_id' => $this->extraPart->id],
            ['quantity' => 1, 'note' => 'Phát hiện khi sửa'],
        );

        return $this->quote([
            'type' => 'SUPPLEMENT', 'reason' => 'Bugi mòn, kim phun bẩn phát hiện khi tháo máy',
            'items' => [
                ['item_type' => 'SERVICE', 'service_id' => $this->extraService->id, 'quantity' => 1],
                ['item_type' => 'PART', 'part_id' => $this->extraPart->id, 'quantity' => 1],
            ],
            ...$overrides,
        ]);
    }

    private function finishAndInvoice(): array
    {
        WorkItem::query()->where('repair_order_id', $this->order->id)->update(['status' => WorkItem::COMPLETED]);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/complete")->assertOk();

        return $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/invoice")->assertCreated()->json();
    }

    public function test_partially_approved_supplement_adds_only_approved_lines_to_work_and_invoice(): void
    {
        $id = $this->supplement()->assertCreated()->assertJsonPath('type', 'SUPPLEMENT')->json('id');
        $supplement = $this->sendAndRespond($id, fn ($item) => $item->item_type === 'SERVICE');

        $this->assertSame(Quotation::PARTIALLY_APPROVED, $supplement->status);
        $this->assertSame(RepairOrder::IN_PROGRESS, $this->order->fresh()->status);
        $this->assertSame(Quotation::TYPE_INITIAL, $this->order->fresh()->latestQuotation->type, 'Supplement must not replace the initial quotation');
        $this->assertSame(2, WorkItem::query()->where('repair_order_id', $this->order->id)->count());
        $this->assertTrue(WorkItem::query()->where('service_id', $this->extraService->id)->exists());

        // Phụ tùng bị khách từ chối: không được xuất kho.
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/used-parts", ['part_id' => $this->extraPart->id, 'quantity' => 1])
            ->assertUnprocessable();

        $invoice = $this->finishAndInvoice();
        $this->assertSame('500000.00', $invoice['total_amount']);
        $this->assertCount(2, $invoice['items']);
    }

    public function test_approved_supplement_part_can_be_used_and_is_billed(): void
    {
        $id = $this->supplement()->assertCreated()->json('id');
        $this->sendAndRespond($id, fn () => true);

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/used-parts", ['part_id' => $this->extraPart->id, 'quantity' => 1])
            ->assertCreated();

        $invoice = $this->finishAndInvoice();
        $this->assertSame('650000.00', $invoice['total_amount']);
        $this->assertCount(3, $invoice['items']);
    }

    public function test_rejected_supplement_changes_nothing(): void
    {
        $id = $this->supplement()->assertCreated()->json('id');
        $this->assertSame(Quotation::REJECTED, $this->sendAndRespond($id, fn () => false)->status);

        $this->assertSame(1, WorkItem::query()->where('repair_order_id', $this->order->id)->count());
        $this->assertSame('300000.00', $this->finishAndInvoice()['total_amount']);
    }

    public function test_supplement_rules(): void
    {
        $this->supplement(['reason' => null])->assertUnprocessable();
        $this->supplement(['reason' => 'abc'])->assertUnprocessable();
        $this->supplement(['discount_amount' => 10000])->assertUnprocessable();
        // Báo giá gốc mới khi đang sửa vẫn bị chặn (P0).
        $this->quote(['items' => [['item_type' => 'SERVICE', 'service_id' => $this->extraService->id, 'quantity' => 1]]])->assertUnprocessable();

        $id = $this->supplement()->assertCreated()->json('id');
        $this->supplement()->assertUnprocessable();

        $this->actingAs($this->advisor)->postJson("/api/quotations/{$id}/send")->assertOk();
        WorkItem::query()->where('repair_order_id', $this->order->id)->update(['status' => WorkItem::COMPLETED]);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/complete")->assertUnprocessable();
    }

    public function test_supplement_not_allowed_before_repair_starts(): void
    {
        $this->order->update(['status' => RepairOrder::WAITING_APPROVAL]);

        $this->supplement()->assertUnprocessable();
    }
}
