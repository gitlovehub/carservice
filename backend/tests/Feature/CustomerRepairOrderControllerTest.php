<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\Part;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\RepairOrder;
use App\Models\TechnicianProfile;
use App\Models\UsedPart;
use App\Models\Vehicle;
use App\Models\WorkItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerRepairOrderControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_only_list_their_own_repair_orders(): void
    {
        [$account, $customer] = $this->createCustomer();
        $ownRepairOrder = $this->createRepairOrder($customer);
        $otherCustomer = Customer::factory()->create();
        $otherRepairOrder = $this->createRepairOrder($otherCustomer);

        $this->actingAs($account)
            ->getJson('/api/me/repair-orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownRepairOrder->id)
            ->assertJsonMissing(['id' => $otherRepairOrder->id]);
    }

    public function test_billing_list_returns_quotations_and_invoices_in_one_request(): void
    {
        [$account, $customer] = $this->createCustomer();
        $repairOrder = $this->createRepairOrder($customer);
        $sent = Quotation::query()->create(['repair_order_id' => $repairOrder->id, 'advisor_id' => $repairOrder->advisor_id, 'quotation_code' => 'QT-SENT', 'version' => 1, 'subtotal' => 100, 'discount_amount' => 0, 'total_amount' => 100, 'status' => Quotation::SENT]);
        QuotationItem::query()->create(['quotation_id' => $sent->id, 'item_type' => 'SERVICE', 'description' => 'Thay dầu', 'quantity' => 1, 'unit_price' => 100, 'amount' => 100]);
        Quotation::query()->create(['repair_order_id' => $repairOrder->id, 'advisor_id' => $repairOrder->advisor_id, 'quotation_code' => 'QT-DRAFT', 'version' => 2, 'subtotal' => 0, 'discount_amount' => 0, 'total_amount' => 0, 'status' => Quotation::DRAFT]);
        $invoice = Invoice::query()->create(['repair_order_id' => $repairOrder->id, 'invoice_code' => 'INV-B1', 'subtotal' => 100, 'discount_amount' => 0, 'total_amount' => 100, 'status' => Invoice::UNPAID]);
        $invoice->items()->create(['item_type' => 'SERVICE', 'description' => 'Thay dầu', 'quantity' => 1, 'unit_price' => 100, 'amount' => 100]);

        $this->actingAs($account)->getJson('/api/me/repair-orders?include=billing&per_page=100')->assertOk()
            ->assertJsonCount(1, 'data.0.quotations') // bản nháp không lộ cho khách
            ->assertJsonPath('data.0.quotations.0.quotation_code', 'QT-SENT')
            ->assertJsonPath('data.0.quotations.0.items.0.description', 'Thay dầu')
            ->assertJsonPath('data.0.invoice.items.0.description', 'Thay dầu')
            ->assertJsonCount(0, 'data.0.invoice.payments');

        // Không xin billing → danh sách gọn như cũ.
        $this->actingAs($account)->getJson('/api/me/repair-orders')->assertOk()->assertJsonMissingPath('data.0.quotations');
    }

    public function test_customer_cannot_view_another_customers_repair_order_or_invoice(): void
    {
        [$account] = $this->createCustomer();
        $otherCustomer = Customer::factory()->create();
        $repairOrder = $this->createRepairOrder($otherCustomer);

        $this->actingAs($account)
            ->getJson("/api/me/repair-orders/{$repairOrder->id}")
            ->assertNotFound();

        $this->actingAs($account)
            ->getJson("/api/me/repair-orders/{$repairOrder->id}/invoice")
            ->assertNotFound();
    }

    public function test_customer_can_read_their_repair_order_and_invoice(): void
    {
        [$account, $customer] = $this->createCustomer();
        $repairOrder = $this->createRepairOrder($customer);
        $invoice = Invoice::query()->create([
            'repair_order_id' => $repairOrder->id,
            'invoice_code' => 'INV-CUSTOMER-1',
            'subtotal' => 100,
            'discount_amount' => 0,
            'total_amount' => 100,
            'status' => Invoice::UNPAID,
        ]);

        $this->actingAs($account)
            ->getJson("/api/me/repair-orders/{$repairOrder->id}")
            ->assertOk()
            ->assertJsonPath('id', $repairOrder->id);

        $this->actingAs($account)
            ->getJson("/api/me/repair-orders/{$repairOrder->id}/invoice")
            ->assertOk()
            ->assertJsonPath('id', $invoice->id);
    }

    public function test_repair_order_detail_includes_staff_names_and_used_parts_without_private_staff_data(): void
    {
        [$account, $customer] = $this->createCustomer();
        $repairOrder = $this->createRepairOrder($customer);
        $advisor = $repairOrder->advisor;
        $technicianEmployee = Employee::factory()->technicianRole()->create(['full_name' => 'Nguyễn Văn Long']);
        $technician = TechnicianProfile::query()->create(['employee_id' => $technicianEmployee->id, 'is_available' => true]);
        $workItem = WorkItem::query()->create(['repair_order_id' => $repairOrder->id, 'technician_id' => $technician->id, 'description' => 'Thay dầu', 'status' => 'COMPLETED']);
        $part = Part::query()->create(['sku' => 'P-OIL-1', 'name' => 'Dầu nhớt 5W30', 'unit' => 'lít', 'cost_price' => 90000, 'sell_price' => 120000, 'status' => 'ACTIVE']);
        UsedPart::query()->create(['repair_order_id' => $repairOrder->id, 'work_item_id' => $workItem->id, 'part_id' => $part->id, 'quantity' => 4, 'unit_price' => 120000]);

        $response = $this->actingAs($account)
            ->getJson("/api/me/repair-orders/{$repairOrder->id}")
            ->assertOk()
            ->assertJsonPath('advisor.full_name', $advisor->full_name)
            ->assertJsonPath('work_items.0.technician.employee.full_name', 'Nguyễn Văn Long')
            ->assertJsonPath('used_parts.0.part.name', 'Dầu nhớt 5W30')
            ->assertJsonPath('used_parts.0.quantity', 4);

        // Chỉ tên người phụ trách — không lộ số điện thoại / tài khoản nhân viên.
        $this->assertArrayNotHasKey('phone', $response->json('advisor'));
        $this->assertArrayNotHasKey('account_id', $response->json('advisor'));
        $this->assertArrayNotHasKey('phone', $response->json('work_items.0.technician.employee'));
    }

    public function test_customer_can_respond_to_their_sent_quotation(): void
    {
        [$account, $customer] = $this->createCustomer();
        $repairOrder = $this->createRepairOrder($customer);
        $quotation = $this->createQuotation($repairOrder, Quotation::SENT);
        $item = $this->createQuotationItem($quotation);

        $this->actingAs($account)
            ->postJson("/api/me/quotations/{$quotation->id}/respond", [
                'responses' => [
                    ['item_id' => $item->id, 'is_approved' => true],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', Quotation::APPROVED)
            ->assertJsonPath('items.0.is_approved', true);
    }

    public function test_customer_cannot_respond_using_an_item_from_another_quotation(): void
    {
        [$account, $customer] = $this->createCustomer();
        $repairOrder = $this->createRepairOrder($customer);
        $quotation = $this->createQuotation($repairOrder, Quotation::SENT);
        $otherRepairOrder = $this->createRepairOrder($customer);
        $otherQuotation = $this->createQuotation($otherRepairOrder, Quotation::SENT);
        $otherItem = $this->createQuotationItem($otherQuotation);

        $this->actingAs($account)
            ->postJson("/api/me/quotations/{$quotation->id}/respond", [
                'responses' => [
                    ['item_id' => $otherItem->id, 'is_approved' => true],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('responses.0.item_id');
    }

    public function test_customer_without_a_profile_receives_not_found(): void
    {
        $account = Account::factory()->customer()->create();

        $this->actingAs($account)
            ->getJson('/api/me/repair-orders')
            ->assertNotFound();
    }

    /**
     * @return array{0: Account, 1: Customer}
     */
    private function createCustomer(): array
    {
        $account = Account::factory()->customer()->create();
        $customer = Customer::factory()->create(['account_id' => $account->id]);

        return [$account, $customer];
    }

    private function createRepairOrder(Customer $customer): RepairOrder
    {
        $advisor = Employee::factory()->create();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);

        return RepairOrder::query()->create([
            'repair_order_code' => 'RO-'.uniqid(),
            'customer_id' => $customer->id,
            'vehicle_id' => $vehicle->id,
            'advisor_id' => $advisor->id,
            'status' => RepairOrder::WAITING_APPROVAL,
            'received_at' => now(),
        ]);
    }

    private function createQuotation(RepairOrder $repairOrder, string $status): Quotation
    {
        $advisor = Employee::factory()->create();

        return Quotation::query()->create([
            'quotation_code' => 'QT-'.uniqid(),
            'repair_order_id' => $repairOrder->id,
            'advisor_id' => $advisor->id,
            'version' => 1,
            'subtotal' => 100,
            'discount_amount' => 0,
            'total_amount' => 100,
            'status' => $status,
        ]);
    }

    private function createQuotationItem(Quotation $quotation): QuotationItem
    {
        return QuotationItem::query()->create([
            'quotation_id' => $quotation->id,
            'item_type' => QuotationItem::TYPE_SERVICE,
            'description' => 'Service item',
            'quantity' => 1,
            'unit_price' => 100,
            'amount' => 100,
        ]);
    }
}
