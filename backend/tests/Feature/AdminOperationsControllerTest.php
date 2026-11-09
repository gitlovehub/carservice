<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\RepairOrder;
use App\Models\Review;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use App\Models\WorkItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminOperationsControllerTest extends TestCase
{
    use RefreshDatabase;

    private Employee $advisor;

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        Model::unguard();
        $this->advisor = Employee::factory()->create(['full_name' => 'Cố Vấn Một']);
        Sanctum::actingAs(Account::factory()->admin()->create());
    }

    protected function tearDown(): void
    {
        Model::reguard();
        parent::tearDown();
    }

    private function order(string $status, string $name = 'Khách A', ?string $plate = null, array $extra = []): RepairOrder
    {
        $customer = Customer::factory()->create(['full_name' => $name]);
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id, 'license_plate' => $plate ?? sprintf('29B-%03d.%02d', $this->seq + 1, $this->seq)]);

        return RepairOrder::query()->create([
            'repair_order_code' => 'RO-2026-T'.str_pad((string) ++$this->seq, 4, '0', STR_PAD_LEFT),
            'customer_id' => $customer->id, 'vehicle_id' => $vehicle->id, 'advisor_id' => $this->advisor->id,
            'status' => $status, 'received_at' => now()->subHours($this->seq),
        ] + $extra);
    }

    private function invoice(RepairOrder $order, float $total, string $status, float $paid = 0): Invoice
    {
        $invoice = Invoice::query()->create(['repair_order_id' => $order->id, 'invoice_code' => 'INV-T-'.$order->id,
            'subtotal' => $total, 'discount_amount' => 0, 'total_amount' => $total, 'status' => $status]);
        $invoice->items()->create(['item_type' => 'SERVICE', 'description' => 'Bảo dưỡng', 'quantity' => 1, 'unit_price' => $total, 'amount' => $total]);
        if ($paid > 0) {
            Payment::query()->create(['invoice_id' => $invoice->id, 'amount' => $paid, 'payment_method' => Payment::QR, 'status' => Payment::SUCCESS, 'paid_at' => now(), 'transaction_code' => 'PAY-'.$order->id]);
        }

        return $invoice;
    }

    public function test_endpoints_require_admin(): void
    {
        Sanctum::actingAs(Account::factory()->create(['role' => Account::ROLE_ADVISOR]));
        foreach (['repair-orders', 'invoices', 'payments', 'reviews', 'audit-logs'] as $path) {
            $this->getJson("/api/admin/{$path}")->assertForbidden();
        }
    }

    public function test_repair_orders_filter_search_summary_and_detail(): void
    {
        $tech = TechnicianProfile::factory()->create();
        $repair = $this->order(RepairOrder::IN_PROGRESS, 'Trần Minh Quân', '30A-123.45');
        WorkItem::query()->create(['repair_order_id' => $repair->id, 'technician_id' => $tech->id, 'description' => 'Thay má phanh', 'status' => WorkItem::IN_PROGRESS]);
        $repair->statusHistory()->create(['status' => RepairOrder::RECEIVED, 'changed_by_account_id' => $this->advisor->account_id]);
        $repair->statusHistory()->create(['status' => RepairOrder::IN_PROGRESS, 'changed_by_account_id' => $this->advisor->account_id]);
        $this->order(RepairOrder::WAITING_APPROVAL);
        $this->order(RepairOrder::HANDED_OVER);
        $this->order(RepairOrder::CLOSED);

        $response = $this->getJson('/api/admin/repair-orders')->assertOk();
        $response->assertJsonPath('meta.total', 4)
            ->assertJsonPath('summary.in_shop', 2)
            ->assertJsonPath('summary.groups.repair', 1)
            ->assertJsonPath('summary.groups.quote', 1)
            ->assertJsonPath('summary.groups.done', 1);
        $this->assertSame($tech->id, $response->json('technicians.0.id'));

        $this->getJson('/api/admin/repair-orders?group=repair')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.code', $repair->repair_order_code);
        $this->getJson("/api/admin/repair-orders?technician_id={$tech->id}")->assertJsonPath('meta.total', 1);
        $this->getJson('/api/admin/repair-orders?search=minh qu')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/admin/repair-orders?search=123.45')->assertJsonPath('data.0.plate', '30A-123.45');
        $this->getJson('/api/admin/repair-orders?group=nope')->assertJsonValidationErrors('group');

        $detail = $this->getJson("/api/admin/repair-orders/{$repair->id}")->assertOk()->json('data');
        $this->assertSame('Cố Vấn Một', $detail['advisor']);
        $this->assertSame('Thay má phanh', $detail['items'][0]['name']);
        $this->assertSame([RepairOrder::RECEIVED, RepairOrder::IN_PROGRESS], array_column($detail['timeline'], 'status'));
        $this->assertSame('Cố Vấn Một', $detail['timeline'][0]['by']);
    }

    public function test_invoices_payments_summary_and_detail(): void
    {
        $paid = $this->invoice($this->order(RepairOrder::HANDED_OVER, 'Lê Thu Hà'), 2_000_000, Invoice::PAID, 2_000_000);
        $this->invoice($this->order(RepairOrder::COMPLETED), 1_000_000, Invoice::PARTIALLY_PAID, 400_000);
        $this->invoice($this->order(RepairOrder::COMPLETED), 500_000, Invoice::UNPAID);
        $this->invoice($this->order(RepairOrder::CLOSED), 900_000, Invoice::CANCELLED);

        $this->getJson('/api/admin/invoices')->assertOk()
            ->assertJsonPath('meta.total', 4)
            ->assertJsonPath('summary.open', 2)
            ->assertJsonPath('summary.debt', 1_100_000)
            ->assertJsonPath('summary.collected', 2_400_000);
        $this->getJson('/api/admin/invoices?status=UNPAID')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/admin/invoices?search=thu h')->assertJsonPath('data.0.id', $paid->id)->assertJsonPath('data.0.paid', 2_000_000);

        $detail = $this->getJson("/api/admin/invoices/{$paid->id}")->assertOk()->json('data');
        $this->assertSame('Bảo dưỡng', $detail['lines'][0]['name']);
        $this->assertSame('BANK_TRANSFER', $detail['payments'][0]['method']);

        $this->getJson('/api/admin/payments')->assertJsonPath('meta.total', 2)->assertJsonPath('data.0.method', 'BANK_TRANSFER');
    }

    public function test_reviews_filters_summary_reply_and_hide(): void
    {
        $make = fn (int $rating, string $comment, bool $hidden = false) => Review::query()->create([
            'repair_order_id' => $this->order(RepairOrder::HANDED_OVER)->id, 'customer_id' => Customer::factory()->create()->id,
            'overall_rating' => $rating, 'comment' => $comment, 'is_hidden' => $hidden,
        ]);
        $five = $make(5, 'Rất tốt');
        $make(4, 'Ổn');
        $low = $make(2, 'Chờ lâu quá');
        $make(1, 'Spam', true);

        $this->getJson('/api/admin/reviews')->assertOk()
            ->assertJsonPath('meta.total', 3)
            ->assertJsonPath('summary.visible', 3)
            ->assertJsonPath('summary.hidden', 1)
            ->assertJsonPath('summary.average', 3.67)
            ->assertJsonPath('summary.distribution.5', 1);
        $this->getJson('/api/admin/reviews?rating=low')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $low->id);
        $this->getJson('/api/admin/reviews?rating=hidden')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/admin/reviews?search=chờ')->assertJsonPath('meta.total', 1);

        $this->postJson("/api/admin/reviews/{$low->id}/reply", ['reply' => '   '])->assertUnprocessable();
        $this->postJson("/api/admin/reviews/{$low->id}/reply", ['reply' => 'Xin lỗi anh/chị.'])->assertOk()->assertJsonPath('data.reply', 'Xin lỗi anh/chị.');
        $this->assertNotNull($low->fresh()->replied_at);

        $this->patchJson("/api/admin/reviews/{$five->id}", ['is_hidden' => true])->assertOk()->assertJsonPath('data.hidden', true);
        $this->getJson('/api/admin/reviews')->assertJsonPath('summary.visible', 2);
    }

    public function test_audit_logs_are_labelled_and_filterable(): void
    {
        $order = $this->order(RepairOrder::RECEIVED);
        $appointment = Appointment::query()->create(['appointment_code' => 'APT-T-1', 'customer_id' => $order->customer_id, 'vehicle_id' => $order->vehicle_id,
            'appointment_date' => now()->toDateString(), 'appointment_time' => '09:00:00', 'request_type' => 'MAINTENANCE', 'status' => 'CANCELLED']);
        $log = fn (string $action, array $extra = []) => AuditLog::query()->create([
            'account_id' => $this->advisor->account_id, 'action' => $action, 'auditable_type' => Appointment::class, 'auditable_id' => $appointment->id, 'ip_address' => '10.0.0.5',
        ] + $extra);
        $log('appointment.confirmed', ['old_values' => ['status' => 'PENDING'], 'new_values' => ['status' => 'CONFIRMED']]);
        $log('appointment.cancelled', ['reason' => 'Khách bận']);

        $rows = $this->getJson('/api/admin/audit-logs')->assertOk()->json('data');
        $this->assertCount(2, $rows);
        $cancel = collect($rows)->firstWhere('action', 'appointment.cancelled');
        $this->assertSame('DELETE', $cancel['category']);
        $this->assertSame('Lịch hẹn APT-T-1', $cancel['target']);
        $this->assertSame('Cố Vấn Một', $cancel['actor']);
        $this->assertStringContainsString('Lý do: Khách bận', $cancel['detail']);
        $this->assertStringContainsString('PENDING → CONFIRMED', collect($rows)->firstWhere('action', 'appointment.confirmed')['detail']);

        $this->getJson('/api/admin/audit-logs?category=STATUS')->assertJsonCount(1, 'data');
        $this->getJson('/api/admin/audit-logs?search=Cố Vấn')->assertJsonCount(2, 'data');
    }
}
