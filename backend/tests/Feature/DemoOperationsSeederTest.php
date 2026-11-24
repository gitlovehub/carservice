<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\RepairOrder;
use App\Models\Review;
use App\Models\Vehicle;
use Database\Seeders\DemoAccountsSeeder;
use Database\Seeders\DemoOperationsSeeder;
use Database\Seeders\PartInventorySeeder;
use Database\Seeders\ServiceCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoOperationsSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([ServiceCatalogSeeder::class, PartInventorySeeder::class, DemoAccountsSeeder::class]);
        Customer::factory()->count(8)->create()->each(fn (Customer $customer) => Vehicle::factory()->create(['customer_id' => $customer->id]));
    }

    public function test_seeds_a_consistent_two_month_operation(): void
    {
        $this->seed(DemoOperationsSeeder::class);

        $orders = RepairOrder::query()->with(['statusHistory', 'invoice.items', 'invoice.payments'])->get();
        $this->assertGreaterThan(60, Appointment::count());
        $this->assertGreaterThan(40, $orders->count());
        $this->assertGreaterThan(20, Invoice::count());
        $this->assertGreaterThan(0, Review::count());

        // Lịch tương lai chưa tiếp nhận; mọi phiếu đều từ lịch đã tiếp nhận.
        $this->assertSame(0, Appointment::query()->where('appointment_date', '>', now()->toDateString())->where('status', 'CHECKED_IN')->count());
        $this->assertSame(0, RepairOrder::query()->whereHas('appointment', fn ($q) => $q->where('status', '!=', 'CHECKED_IN'))->count());

        foreach ($orders as $order) {
            // Lịch sử trạng thái theo đúng thứ tự thời gian, kết thúc ở trạng thái hiện tại, các bước hợp lệ.
            $history = $order->statusHistory->sortBy('id')->values();
            $this->assertSame($order->status, $history->last()->status, $order->repair_order_code);
            $previous = null;
            foreach ($history as $step) {
                if ($previous) {
                    $this->assertTrue($step->created_at->greaterThanOrEqualTo($previous->created_at));
                    $this->assertContains($step->status, RepairOrder::TRANSITIONS[$previous->status], "{$previous->status} → {$step->status}");
                }
                $previous = $step;
            }
            $this->assertTrue($order->received_at->lessThanOrEqualTo(now()));

            $invoice = $order->invoice;
            if (in_array($order->status, [RepairOrder::COMPLETED, RepairOrder::HANDED_OVER], true)) {
                $this->assertNotNull($invoice, $order->repair_order_code);
                $this->assertEqualsWithDelta((float) $invoice->items->sum('amount'), (float) $invoice->subtotal, 0.01);
                $this->assertEqualsWithDelta((float) $invoice->subtotal - (float) $invoice->discount_amount, (float) $invoice->total_amount, 0.01);
                $paid = (float) $invoice->payments->where('status', Payment::SUCCESS)->sum('amount');
                $expected = match ($invoice->status) {
                    Invoice::PAID => (float) $invoice->total_amount,
                    Invoice::UNPAID => 0.0,
                    default => $paid,
                };
                $this->assertEqualsWithDelta($expected, $paid, 0.01);
            } else {
                $this->assertNull($invoice, $order->repair_order_code);
            }
            if ($order->status === RepairOrder::HANDED_OVER) {
                $this->assertSame(Invoice::PAID, $invoice->status);
            }
        }

        // Đánh giá chỉ cho phiếu đã bàn giao.
        $this->assertSame(0, Review::query()->whereHas('repairOrder', fn ($q) => $q->where('status', '!=', RepairOrder::HANDED_OVER))->count());

        // Tồn kho khớp sổ nhập − xuất và không âm.
        foreach (Inventory::all() as $inventory) {
            $this->assertGreaterThanOrEqual(0, $inventory->quantity);
        }
        $this->assertGreaterThan(0, InventoryTransaction::query()->where('transaction_type', 'OUT')->count());

        $this->assertGreaterThan(0, DB::table('audit_logs')->where('action', 'appointment.checked_in')->count());
        $this->assertSame(0, DB::table('audit_logs')->where('created_at', '>', now())->count(), 'Không có nhật ký ở tương lai');
        $this->assertSame(0, Review::query()->where('created_at', '>', now())->count());
        $this->assertSame(0, Payment::query()->where('paid_at', '>', now())->count());
    }

    public function test_running_twice_adds_nothing(): void
    {
        $this->seed(DemoOperationsSeeder::class);
        $counts = [Appointment::count(), RepairOrder::count(), Invoice::count(), Payment::count(), Review::count()];

        $this->seed(DemoOperationsSeeder::class);

        $this->assertSame($counts, [Appointment::count(), RepairOrder::count(), Invoice::count(), Payment::count(), Review::count()]);
    }
}
