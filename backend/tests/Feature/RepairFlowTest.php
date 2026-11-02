<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Assignment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Inspection;
use App\Models\InspectionRecommendation;
use App\Models\Part;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\Service;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use App\Models\WorkItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Luồng sau chẩn đoán: báo giá → khách duyệt → sửa chữa → thanh toán → bàn giao.
 */
class RepairFlowTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $customerAccount;

    private Account $technicianAccount;

    private RepairOrder $repairOrder;

    private Service $service;

    private Part $part;

    protected function setUp(): void
    {
        parent::setUp();

        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);

        $this->technicianAccount = Account::factory()->technician()->create();
        $technician = TechnicianProfile::factory()->create([
            'employee_id' => Employee::factory()->create(['account_id' => $this->technicianAccount->id])->id,
        ]);

        $this->customerAccount = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $this->customerAccount->id]);

        $this->service = Service::factory()->create(['name' => 'Công thay má phanh', 'base_price' => 300000, 'status' => 'ACTIVE']);
        $this->part = Part::query()->create([
            'sku' => 'BRK-01', 'name' => 'Má phanh trước', 'unit' => 'Bộ', 'sell_price' => 450000, 'status' => 'ACTIVE',
        ]);

        $this->repairOrder = RepairOrder::query()->create([
            'repair_order_code' => 'RO-TEST',
            'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'advisor_id' => $this->advisor->employee->id,
            'status' => RepairOrder::QUOTING,
            'received_at' => now(),
        ]);

        Assignment::query()->create([
            'repair_order_id' => $this->repairOrder->id,
            'technician_id' => $technician->id,
            'status' => Assignment::ASSIGNED,
            'assigned_at' => now(),
        ]);

        $inspection = Inspection::query()->create([
            'repair_order_id' => $this->repairOrder->id,
            'technician_id' => $technician->id,
            'diagnosis' => 'Má phanh mòn',
            'inspected_at' => now(),
        ]);

        InspectionRecommendation::query()->create([
            'inspection_id' => $inspection->id,
            'item_type' => InspectionRecommendation::TYPE_PART,
            'part_id' => $this->part->id,
            'quantity' => 1,
        ]);
    }

    /**
     * Cố vấn lập + gửi báo giá 2 dòng (công + phụ tùng), trả về báo giá đã gửi.
     */
    private function sendQuotation(): Quotation
    {
        $quotationId = $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/quotations", [
                'items' => [
                    ['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 1],
                    ['item_type' => 'PART', 'part_id' => $this->part->id, 'quantity' => 2],
                ],
            ])
            ->assertCreated()
            ->json('id');

        $this->actingAs($this->advisor)->postJson("/api/quotations/{$quotationId}/send")->assertOk();

        return Quotation::query()->with('items')->findOrFail($quotationId);
    }

    /**
     * Khách duyệt toàn bộ báo giá rồi Cố vấn bắt đầu sửa.
     */
    private function approveAndStartRepair(): Quotation
    {
        $quotation = $this->sendQuotation();

        $this->actingAs($this->customerAccount)
            ->postJson("/api/me/quotations/{$quotation->id}/respond", [
                'responses' => $quotation->items->map(fn ($item) => ['item_id' => $item->id, 'is_approved' => true])->all(),
            ])
            ->assertOk();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/start-repair")->assertOk();

        return $quotation->fresh('items');
    }

    public function test_quotation_uses_catalog_price_and_name_when_omitted(): void
    {
        $quotation = $this->sendQuotation();

        $this->assertSame(RepairOrder::WAITING_APPROVAL, $this->repairOrder->fresh()->status);
        $this->assertEqualsCanonicalizing(
            [['Công thay má phanh', 300000.0], ['Má phanh trước', 900000.0]],
            $quotation->items->map(fn ($item) => [$item->description, (float) $item->amount])->all()
        );
    }

    public function test_customer_partial_approval_creates_work_items_only_for_approved_services(): void
    {
        $quotation = $this->sendQuotation();
        $serviceItem = $quotation->items->firstWhere('item_type', 'SERVICE');
        $partItem = $quotation->items->firstWhere('item_type', 'PART');

        $this->actingAs($this->customerAccount)
            ->postJson("/api/me/quotations/{$quotation->id}/respond", [
                'responses' => [
                    ['item_id' => $serviceItem->id, 'is_approved' => true],
                    ['item_id' => $partItem->id, 'is_approved' => false],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', Quotation::PARTIALLY_APPROVED);

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/start-repair")->assertOk();

        $this->assertSame(RepairOrder::IN_PROGRESS, $this->repairOrder->fresh()->status);
        $this->assertSame(1, WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->count());
    }

    public function test_repair_cannot_start_before_customer_approves(): void
    {
        $this->sendQuotation();

        $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/start-repair")
            ->assertUnprocessable();
    }
}
