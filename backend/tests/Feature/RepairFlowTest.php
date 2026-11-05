<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Assignment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Inspection;
use App\Models\InspectionRecommendation;
use App\Models\Inventory;
use App\Models\MaintenancePackage;
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

    public function test_technician_uses_approved_part_and_stock_is_exported(): void
    {
        $this->approveAndStartRepair();
        $inventory = Inventory::query()->create(['part_id' => $this->part->id, 'quantity' => 5]);

        $this->actingAs($this->technicianAccount)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/used-parts", ['part_id' => $this->part->id, 'quantity' => 2])
            ->assertCreated()
            ->assertJsonPath('unit_price', '450000.00');

        $this->assertSame(3, $inventory->fresh()->quantity);
        $this->assertDatabaseHas('inventory_transactions', [
            'inventory_id' => $inventory->id,
            'repair_order_id' => $this->repairOrder->id,
            'transaction_type' => 'OUT',
            'quantity' => 2,
        ]);
    }

    public function test_using_part_beyond_stock_is_rejected_without_changes(): void
    {
        $this->approveAndStartRepair();
        $inventory = Inventory::query()->create(['part_id' => $this->part->id, 'quantity' => 1]);

        $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/used-parts", ['part_id' => $this->part->id, 'quantity' => 2])
            ->assertUnprocessable();

        $this->assertSame(1, $inventory->fresh()->quantity);
        $this->assertDatabaseCount('used_parts', 0);
    }

    public function test_order_completes_only_after_all_work_items_are_done(): void
    {
        $this->approveAndStartRepair();
        $workItem = WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->firstOrFail();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/complete")->assertUnprocessable();

        $this->actingAs($this->technicianAccount)
            ->patchJson("/api/work-items/{$workItem->id}/status", ['status' => WorkItem::COMPLETED])
            ->assertOk();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/complete")->assertOk();
        $this->assertSame(RepairOrder::COMPLETED, $this->repairOrder->fresh()->status);
    }

    /**
     * Đưa phiếu đến COMPLETED và xuất hóa đơn, trả về id hóa đơn.
     */
    private function completeAndInvoice(): int
    {
        $this->approveAndStartRepair();
        WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->update(['status' => WorkItem::COMPLETED]);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/complete")->assertOk();

        return $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/invoice")
            ->assertCreated()
            ->assertJsonPath('total_amount', '1200000.00')
            ->json('id');
    }

    public function test_cash_payment_then_hand_over_then_customer_review(): void
    {
        $invoiceId = $this->completeAndInvoice();
        $orderId = $this->repairOrder->id;

        $this->actingAs($this->advisor)->postJson("/api/invoices/{$invoiceId}/payments", ['amount' => 200000])
            ->assertCreated()
            ->assertJsonPath('payment_method', 'DIRECT')
            ->assertJsonPath('status', 'SUCCESS');

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/hand-over")->assertUnprocessable();

        $this->actingAs($this->customerAccount)
            ->postJson('/api/me/reviews', ['repair_order_id' => $orderId, 'overall_rating' => 5])
            ->assertUnprocessable();

        $this->actingAs($this->advisor)->postJson("/api/invoices/{$invoiceId}/payments", ['amount' => 1000000])->assertCreated();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/hand-over")->assertOk();
        $this->assertSame(RepairOrder::HANDED_OVER, $this->repairOrder->fresh()->status);

        $this->actingAs($this->customerAccount)
            ->postJson('/api/me/reviews', ['repair_order_id' => $orderId, 'overall_rating' => 5])
            ->assertCreated();
    }

    public function test_only_cash_payment_is_accepted_and_overpayment_is_rejected(): void
    {
        $invoiceId = $this->completeAndInvoice();

        $this->actingAs($this->advisor)
            ->postJson("/api/invoices/{$invoiceId}/payments", ['payment_method' => 'QR', 'amount' => 1000])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payment_method');

        $this->actingAs($this->advisor)
            ->postJson("/api/invoices/{$invoiceId}/payments", ['amount' => 1300000])
            ->assertUnprocessable();

        $this->assertDatabaseCount('payments', 0);
    }

    public function test_order_detail_includes_what_the_customer_requested_when_booking(): void
    {
        $package = MaintenancePackage::factory()->create(['name' => 'Bảo dưỡng 5.000 km']);
        $package->services()->attach($this->service->id, ['quantity' => 1]);
        $package->parts()->attach($this->part->id, ['quantity' => 2]);
        $extraService = Service::factory()->create(['name' => 'Kiểm tra điều hòa']);

        $appointment = Appointment::query()->create([
            'appointment_code' => 'APT-RO-TEST',
            'customer_id' => $this->repairOrder->customer_id,
            'vehicle_id' => $this->repairOrder->vehicle_id,
            'appointment_date' => now()->toDateString(),
            'appointment_time' => '09:00:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Phanh kêu khi dừng',
            'status' => 'CHECKED_IN',
        ]);
        $appointment->syncRequestedItems([$extraService->id], [$package->id]);
        $this->repairOrder->update(['appointment_id' => $appointment->id]);

        $this->actingAs($this->advisor)
            ->getJson("/api/repair-orders/{$this->repairOrder->id}")
            ->assertOk()
            ->assertJsonPath('appointment.symptom_description', 'Phanh kêu khi dừng')
            ->assertJsonPath('appointment.services.0.name', 'Kiểm tra điều hòa')
            ->assertJsonPath('appointment.packages.0.name', 'Bảo dưỡng 5.000 km')
            ->assertJsonPath('appointment.packages.0.services.0.id', $this->service->id)
            ->assertJsonPath('appointment.packages.0.parts.0.id', $this->part->id)
            ->assertJsonPath('appointment.packages.0.parts.0.pivot.quantity', 2);
    }

    public function test_order_detail_includes_invoice_items_and_newest_history_first(): void
    {
        $this->completeAndInvoice();

        $response = $this->actingAs($this->advisor)->getJson("/api/repair-orders/{$this->repairOrder->id}")->assertOk();

        $this->assertCount(2, $response->json('invoice.items'));
        $this->assertSame(RepairOrder::COMPLETED, $response->json('status_history.0.status'));
    }
}
