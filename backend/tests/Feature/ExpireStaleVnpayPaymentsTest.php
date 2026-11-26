<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/** Giao dịch VNPay còn "chờ" quá hạn lâu được huỷ; giao dịch còn trong hạn / đã có kết quả giữ nguyên. */
class ExpireStaleVnpayPaymentsTest extends TestCase
{
    use RefreshDatabase;

    private Invoice $invoice;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.vnpay.query_on_return' => false]);
        $customer = Customer::factory()->create();
        $order = Model::unguarded(fn () => RepairOrder::query()->create([
            'repair_order_code' => 'RO-VNP-1', 'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'advisor_id' => Employee::factory()->create()->id, 'status' => RepairOrder::COMPLETED, 'received_at' => now()->subDays(3),
        ]));
        $this->invoice = Invoice::query()->create(['repair_order_id' => $order->id, 'invoice_code' => 'INV-VNP-1',
            'subtotal' => 500000, 'discount_amount' => 0, 'total_amount' => 500000, 'status' => Invoice::UNPAID]);
    }

    private function vnpay(string $status, string $expiresAt): Payment
    {
        return Payment::query()->create([
            'invoice_id' => $this->invoice->id, 'amount' => 500000, 'payment_method' => Payment::VNPAY,
            'status' => $status, 'gateway_txn_ref' => Str::upper((string) Str::ulid()), 'expires_at' => $expiresAt,
        ]);
    }

    public function test_cancels_only_pending_vnpay_payments_expired_longer_than_the_grace_period(): void
    {
        $stale = $this->vnpay(Payment::PENDING, now()->subDays(2)->toDateTimeString());
        $recent = $this->vnpay(Payment::PENDING, now()->subHours(2)->toDateTimeString());
        $paid = $this->vnpay(Payment::SUCCESS, now()->subDays(2)->toDateTimeString());

        $this->artisan('payments:expire-vnpay')->assertSuccessful();

        $this->assertSame(Payment::CANCELLED, $stale->fresh()->status);
        $this->assertSame(Payment::PENDING, $recent->fresh()->status);
        $this->assertSame(Payment::SUCCESS, $paid->fresh()->status);
        $this->assertSame(Invoice::UNPAID, $this->invoice->fresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'VNPAY_EXPIRED', 'auditable_id' => $stale->id]);
    }
}
