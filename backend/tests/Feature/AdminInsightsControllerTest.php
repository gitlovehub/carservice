<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\Part;
use App\Models\Payment;
use App\Models\RepairOrder;
use App\Models\Review;
use App\Models\Service;
use App\Models\Vehicle;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminInsightsControllerTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;

    private Vehicle $vehicle;

    private Employee $advisor;

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(CarbonImmutable::parse('2026-11-20 10:00:00'));
        Model::unguard();
        $this->customer = Customer::factory()->create(['full_name' => 'Nguyễn Văn A', 'phone' => '0900000001']);
        $this->vehicle = Vehicle::factory()->create(['customer_id' => $this->customer->id, 'license_plate' => '30A-111.11']);
        $this->advisor = Employee::factory()->create();
        Sanctum::actingAs(Account::factory()->admin()->create());
    }

    protected function tearDown(): void
    {
        Model::reguard();
        parent::tearDown();
    }

    private function order(string $status, string $receivedAt, array $extra = []): RepairOrder
    {
        return RepairOrder::query()->create([
            'repair_order_code' => 'RO-T-'.(++$this->seq),
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'advisor_id' => $this->advisor->id,
            'status' => $status,
            'received_at' => $receivedAt,
        ] + $extra);
    }

    private function invoice(RepairOrder $order, string $at, array $lines, float $discount = 0, string $status = Invoice::PAID): Invoice
    {
        $subtotal = array_sum(array_column($lines, 'amount'));
        $invoice = Invoice::query()->create([
            'repair_order_id' => $order->id, 'invoice_code' => 'INV-T-'.$order->id, 'subtotal' => $subtotal,
            'discount_amount' => $discount, 'total_amount' => $subtotal - $discount, 'status' => $status, 'created_at' => $at,
        ]);
        foreach ($lines as $line) {
            $invoice->items()->create($line + ['quantity' => 1, 'unit_price' => $line['amount'], 'description' => $line['description'] ?? 'Dòng']);
        }

        return $invoice;
    }

    private function pay(Invoice $invoice, float $amount, string $at, string $method = Payment::DIRECT, string $status = Payment::SUCCESS): void
    {
        Payment::query()->create(['invoice_id' => $invoice->id, 'amount' => $amount, 'payment_method' => $method, 'status' => $status, 'paid_at' => $at]);
    }

    public function test_requires_admin(): void
    {
        Sanctum::actingAs(Account::factory()->create(['role' => Account::ROLE_ADVISOR]));
        $this->getJson('/api/admin/dashboard')->assertForbidden();
        $this->getJson('/api/admin/reports')->assertForbidden();
    }

    public function test_dashboard_kpis_series_and_lists(): void
    {
        // Doanh thu: tháng 11 = 3tr + 1tr (VNPAY pending không tính); cùng kỳ tháng 10 (1–20/10) = 2tr; 25/10 không tính.
        $done = $this->order(RepairOrder::HANDED_OVER, '2026-11-18 09:00', ['handed_over_at' => '2026-11-18 16:00']);
        $inv = $this->invoice($done, '2026-11-18 15:00', [['item_type' => 'SERVICE', 'amount' => 4_000_000]]);
        $this->pay($inv, 3_000_000, '2026-11-18 16:00');
        $this->pay($inv, 1_000_000, '2026-11-20 08:00', Payment::QR);
        $this->pay($inv, 500_000, '2026-11-20 08:30', Payment::VNPAY, Payment::PENDING);
        $old = $this->order(RepairOrder::HANDED_OVER, '2026-10-05 09:00', ['handed_over_at' => '2026-10-05 17:00']);
        $oldInv = $this->invoice($old, '2026-10-05 16:00', [['item_type' => 'SERVICE', 'amount' => 2_000_000]]);
        $this->pay($oldInv, 2_000_000, '2026-10-05 17:00');
        $late = $this->order(RepairOrder::HANDED_OVER, '2026-10-25 09:00', ['handed_over_at' => '2026-10-25 17:00']);
        $this->pay($this->invoice($late, '2026-10-25 16:00', [['item_type' => 'SERVICE', 'amount' => 9_000_000]]), 9_000_000, '2026-10-25 17:00');

        // Xe trong xưởng: 3 phiếu mở (1 nhận hôm nay) → hôm qua cuối ngày có 2.
        $this->order(RepairOrder::INSPECTING, '2026-11-20 08:00');
        $this->order(RepairOrder::IN_PROGRESS, '2026-11-19 09:00');
        $waiting = $this->order(RepairOrder::COMPLETED, '2026-11-17 09:00', ['completed_at' => '2026-11-19 15:00']);
        $this->invoice($waiting, '2026-11-19 15:00', [['item_type' => 'PART', 'amount' => 800_000]], 0, Invoice::UNPAID);

        // Lịch hẹn: hôm nay 2 (1 huỷ không tính), hôm qua 1; sắp tới: hôm nay 14:00 trước, ngày mai sau; lịch 09:00 hôm nay đã qua.
        $appointment = fn (string $date, string $time, string $status) => Appointment::query()->create([
            'appointment_code' => 'APT-T-'.(++$this->seq), 'customer_id' => $this->customer->id, 'vehicle_id' => $this->vehicle->id,
            'appointment_date' => $date, 'appointment_time' => $time, 'request_type' => 'MAINTENANCE', 'status' => $status,
        ]);
        $appointment('2026-11-20', '09:00:00', 'CHECKED_IN');
        $appointment('2026-11-20', '14:00:00', 'CONFIRMED');
        $appointment('2026-11-20', '15:00:00', 'CANCELLED');
        $appointment('2026-11-19', '09:00:00', 'CHECKED_IN');
        $appointment('2026-11-21', '08:00:00', 'PENDING');

        // Tồn kho thấp: chỉ phụ tùng dưới mức tối thiểu.
        $low = Part::query()->create(['sku' => 'LOW-1', 'name' => 'Má phanh', 'unit' => 'Bộ', 'cost_price' => 1, 'sell_price' => 2, 'status' => 'ACTIVE']);
        Inventory::query()->create(['part_id' => $low->id, 'quantity' => 2, 'min_quantity' => 10]);
        $ok = Part::query()->create(['sku' => 'OK-1', 'name' => 'Lọc dầu', 'unit' => 'Cái', 'cost_price' => 1, 'sell_price' => 2, 'status' => 'ACTIVE']);
        Inventory::query()->create(['part_id' => $ok->id, 'quantity' => 30, 'min_quantity' => 10]);

        $data = $this->getJson('/api/admin/dashboard?range=7d')->assertOk()->json('data');

        $this->assertEquals(4_000_000, $data['kpis']['revenue_month']['value']);
        $this->assertEquals(2_000_000, $data['kpis']['revenue_month']['previous']);
        $this->assertEquals(100.0, $data['kpis']['revenue_month']['delta']);
        $this->assertSame(2, $data['kpis']['appointments_today']['value']);
        $this->assertSame(1, $data['kpis']['appointments_today']['previous']);
        $this->assertSame(3, $data['kpis']['in_shop']['value']);
        $this->assertSame(2, $data['kpis']['in_shop']['previous']);
        $this->assertSame(1, $data['kpis']['unpaid_invoices']['value']);

        $this->assertCount(7, $data['revenue_series']);
        $this->assertSame('2026-11-20', end($data['revenue_series'])['date']);
        $this->assertEquals(1_000_000, end($data['revenue_series'])['revenue']);
        $this->assertEqualsWithDelta(4_000_000 / 7, end($data['revenue_series'])['avg7'], 0.01);

        $this->assertSame(['inspecting' => 1, 'quoting' => 0, 'waiting_parts' => 0, 'in_progress' => 1, 'waiting_payment' => 1], $data['repair_status']);
        $this->assertSame(['14:00', '08:00'], array_column($data['upcoming_appointments'], 'start'));
        $this->assertSame('Nguyễn Văn A', $data['upcoming_appointments'][0]['customer']);
        $this->assertSame(['LOW-1'], array_column($data['low_stock'], 'sku'));
        $this->assertSame(['pending_appointments' => 1, 'low_reviews_unreplied' => 0], $data['attention']);

        $this->getJson('/api/admin/dashboard?range=30d')->assertJsonCount(30, 'data.revenue_series');
        $this->getJson('/api/admin/dashboard?range=year')->assertJsonValidationErrors('range');
    }

    public function test_reports_split_revenue_rank_items_collection_and_operations(): void
    {
        $oil = Service::factory()->create(['name' => 'Thay dầu']);
        $brake = Service::factory()->create(['name' => 'Sửa phanh']);
        $part = Part::query()->create(['sku' => 'CS-5W30', 'name' => 'Dầu 5W-30', 'unit' => 'Can', 'cost_price' => 1, 'sell_price' => 2, 'status' => 'ACTIVE']);

        // Hoá đơn tháng 11: dịch vụ 1tr + 3tr, phụ tùng 1tr, giảm 10% → net 0.9 / 2.7 / 0.9.
        $a = $this->order(RepairOrder::HANDED_OVER, '2026-11-05 09:00');
        $inv = $this->invoice($a, '2026-11-05 15:00', [
            ['item_type' => 'SERVICE', 'service_id' => $oil->id, 'description' => 'Thay dầu', 'amount' => 1_000_000],
            ['item_type' => 'SERVICE', 'service_id' => $brake->id, 'description' => 'Sửa phanh', 'amount' => 3_000_000],
            ['item_type' => 'PART', 'part_id' => $part->id, 'description' => 'Dầu 5W-30', 'amount' => 1_000_000],
        ], 500_000);
        $this->pay($inv, 4_500_000, '2026-11-05 16:00', Payment::QR);
        // Tháng 10: dịch vụ 2tr. Hoá đơn huỷ tháng 11 không tính.
        $b = $this->order(RepairOrder::HANDED_OVER, '2026-10-10 09:00');
        $this->pay($this->invoice($b, '2026-10-10 15:00', [['item_type' => 'SERVICE', 'service_id' => $oil->id, 'description' => 'Thay dầu', 'amount' => 2_000_000]]), 2_000_000, '2026-10-10 16:00');
        $c = $this->order(RepairOrder::CLOSED, '2026-11-08 09:00');
        $this->invoice($c, '2026-11-08 15:00', [['item_type' => 'SERVICE', 'amount' => 9_000_000]], 0, Invoice::CANCELLED);

        Review::query()->create(['repair_order_id' => $a->id, 'customer_id' => $this->customer->id, 'overall_rating' => 5, 'created_at' => '2026-11-06 09:00']);

        $data = $this->getJson('/api/admin/reports?period=2026-11')->assertOk()->json('data');

        $this->assertSame('Tháng 11/2026', $data['label']);
        $this->assertEquals(3_600_000, $data['revenue']['service']['value']);
        $this->assertEquals(900_000, $data['revenue']['parts']['value']);
        $this->assertEquals(4_500_000, $data['revenue']['total']['value']);
        $this->assertEquals(2_000_000, $data['revenue']['service']['previous']);
        $this->assertEquals(80.0, $data['revenue']['service']['delta']);

        $this->assertSame(['Sửa phanh', 'Thay dầu'], array_column($data['top_services'], 'name'));
        $this->assertEquals(2_700_000, $data['top_services'][0]['revenue']);
        $this->assertSame('CS-5W30', $data['top_parts'][0]['sku']);

        // Thu tiền: 1 hoá đơn hợp lệ trong kỳ 4,5tr, đã thu đủ.
        $this->assertSame(1, $data['collection']['invoices']['value']);
        $this->assertEquals(4_500_000, $data['collection']['average_invoice']['value']);
        $this->assertEquals(4_500_000, $data['collection']['collected']);
        $this->assertEquals(0, $data['collection']['outstanding']);
        $this->assertEquals(100.0, $data['collection']['collection_rate']);

        $this->assertCount(8, $data['monthly']);
        $this->assertSame('2026-11', end($data['monthly'])['month']);
        $this->assertSame(2, end($data['monthly'])['orders']);

        // Vận hành: 2 phiếu nhận tháng 11, khách đã có phiếu tháng 10 → khách quay lại.
        $ops = $data['operations'];
        $this->assertSame(2, $ops['received']['value']);
        $this->assertSame(1, $ops['received']['previous']);
        $this->assertEquals(['total' => 1, 'returning' => 1, 'new' => 0, 'return_rate' => 100], $ops['customers']);
        $this->assertSame(1, $ops['satisfaction']['count']);
        $this->assertEquals(5.0, $ops['satisfaction']['average']['value']);
        $this->assertEquals(100.0, $ops['satisfaction']['positive_rate']);
        $this->assertSame(1, $ops['satisfaction']['distribution'][5]);
        $this->assertNull($ops['quotations']['approval_rate']);

        $this->assertSame('Quý 4/2026', $this->getJson('/api/admin/reports?period=2026-Q4')->json('data.label'));
        $this->assertEquals(5_600_000, $this->getJson('/api/admin/reports?period=2026')->json('data.revenue.service.value'));

        // Kỳ đang diễn ra so với cùng độ dài của kỳ trước: 1–20/11 so với 1–20/10 (hoá đơn 10/10 có trong cả hai cách tính).
        $d = $this->order(RepairOrder::HANDED_OVER, '2026-10-28 09:00');
        $this->invoice($d, '2026-10-28 15:00', [['item_type' => 'SERVICE', 'amount' => 7_000_000]]);
        $this->assertEquals(2_000_000, $this->getJson('/api/admin/reports?period=2026-11')->json('data.revenue.service.previous'));
        $this->assertEquals(9_000_000, $this->getJson('/api/admin/reports?period=2026-10')->json('data.revenue.service.value'));
        $this->getJson('/api/admin/reports?period=2026-13')->assertJsonValidationErrors('period');
    }
}
