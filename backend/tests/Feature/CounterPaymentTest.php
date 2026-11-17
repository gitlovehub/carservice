<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use App\Support\GarageDay;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Trang Thanh toán (PO 17/11/2026): cố vấn thu tại quầy bằng tiền mặt / chuyển khoản / thẻ / ví điện tử;
 * trừ tiền mặt bắt buộc mã giao dịch, không ghi trùng mã; ghi người thu; danh sách chờ / đã thanh toán + doanh thu.
 */
class CounterPaymentTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
    }

    private function invoice(string $code, float $total = 1000000, string $status = Invoice::UNPAID): Invoice
    {
        $customer = Customer::factory()->create();
        $order = RepairOrder::query()->create([
            'repair_order_code' => $code, 'customer_id' => $customer->id, 'status' => RepairOrder::COMPLETED, 'received_at' => now()->subDay(),
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id, 'advisor_id' => $this->advisor->employee->id,
        ]);

        return Invoice::query()->create(['repair_order_id' => $order->id, 'invoice_code' => 'INV-'.$code, 'status' => $status, 'subtotal' => $total, 'discount_amount' => 0, 'total_amount' => $total]);
    }

    private function pay(Invoice $invoice, array $body)
    {
        return $this->actingAs($this->advisor)->postJson("/api/invoices/{$invoice->id}/payments", $body);
    }

    public function test_transfer_card_and_ewallet_require_unique_transaction_code_and_record_collector(): void
    {
        $invoice = $this->invoice('RO-1');

        $this->pay($invoice, ['payment_method' => 'TRANSFER', 'amount' => 300000])->assertUnprocessable()->assertJsonValidationErrors('transaction_code');
        $this->pay($invoice, ['payment_method' => 'TRANSFER', 'amount' => 300000, 'transaction_code' => ' FT2611 '])->assertCreated()
            ->assertJsonPath('status', Payment::SUCCESS)->assertJsonPath('transaction_code', 'FT2611')->assertJsonPath('recorded_by', $this->advisor->id);
        $this->pay($invoice, ['payment_method' => 'TRANSFER', 'amount' => 100000, 'transaction_code' => 'FT2611'])->assertUnprocessable();
        $this->pay($invoice, ['payment_method' => 'CARD', 'amount' => 200000, 'transaction_code' => 'POS-778'])->assertCreated();
        $this->pay($invoice, ['payment_method' => 'EWALLET', 'amount' => 100000, 'transaction_code' => 'MOMO-1'])->assertCreated();
        $this->pay($invoice, ['payment_method' => 'DIRECT', 'amount' => 400000])->assertCreated()->assertJsonPath('transaction_code', null);

        $this->assertSame(Invoice::PAID, $invoice->fresh()->status);
        $this->pay($invoice, ['payment_method' => 'VNPAY', 'amount' => 1])->assertUnprocessable();
    }

    public function test_billing_list_and_collected_revenue_use_garage_day(): void
    {
        $this->travelTo(Carbon::parse('2026-11-16 22:30:00', 'UTC')); // 05:30 sáng 17/11 giờ Việt Nam.
        $unpaid = $this->invoice('RO-UNPAID');
        $paid = $this->invoice('RO-PAID', 500000);
        $this->pay($paid, ['payment_method' => 'DIRECT', 'amount' => 500000])->assertCreated();
        $this->assertSame('2026-11-17', GarageDay::today());

        $response = $this->actingAs($this->advisor)->getJson('/api/repair-orders?with_billing=1&billing=unpaid')->assertOk()
            ->assertJsonPath('billing.unpaid', 1)->assertJsonPath('billing.paid', 1)
            ->assertJsonPath('data.0.repair_order_code', 'RO-UNPAID')->assertJsonPath('data.0.invoice.status', Invoice::UNPAID);
        $this->assertEquals(500000, $response->json('billing.revenue_today'));
        $this->assertEquals(500000, $response->json('billing.revenue_month'));
        $this->assertSame(['RO-PAID'], collect($this->actingAs($this->advisor)->getJson('/api/repair-orders?billing=paid')->json('data'))->pluck('repair_order_code')->all());
        $this->assertNotNull($unpaid);
    }
}
