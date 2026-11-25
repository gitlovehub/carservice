<?php

namespace Tests\Feature;

use App\Mail\QuotationReviewRequestMail;
use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\CustomerConfirmation;
use App\Models\Employee;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\Service;
use App\Models\Vehicle;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** Gửi báo giá → email kèm link có chữ ký → khách duyệt từng dòng không cần đăng nhập (PO 19/11/2026). */
class QuotationEmailReviewTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private RepairOrder $order;

    private Service $brake;

    private Service $wash;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();

        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $customer = Customer::factory()->create(['email' => 'khach@example.test']);
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $appointment = Appointment::query()->create([
            'appointment_code' => 'APT-QT', 'customer_id' => $customer->id, 'vehicle_id' => $vehicle->id,
            'appointment_date' => CarbonImmutable::today()->toDateString(), 'appointment_time' => '09:00:00',
            'request_type' => 'MAINTENANCE', 'status' => 'CHECKED_IN',
        ]);
        $this->order = RepairOrder::query()->create([
            'repair_order_code' => 'RO-QT', 'customer_id' => $customer->id, 'vehicle_id' => $vehicle->id,
            'appointment_id' => $appointment->id, 'advisor_id' => $this->advisor->employee->id,
            'status' => RepairOrder::QUOTING, 'received_at' => now(),
        ]);
        $this->brake = Service::factory()->create(['name' => 'Kiểm tra phanh', 'base_price' => 300000, 'status' => 'ACTIVE']);
        $this->wash = Service::factory()->create(['name' => 'Rửa khoang máy', 'base_price' => 200000, 'status' => 'ACTIVE']);
    }

    private function sendQuotation(): Quotation
    {
        $id = $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/quotations", [
            'items' => [
                ['item_type' => 'SERVICE', 'service_id' => $this->brake->id, 'quantity' => 1],
                ['item_type' => 'SERVICE', 'service_id' => $this->wash->id, 'quantity' => 1],
            ],
        ])->assertCreated()->json('id');
        $this->actingAs($this->advisor)->postJson("/api/quotations/{$id}/send")->assertOk()->assertJsonPath('emailed_to', 'khach@example.test');
        auth()->forgetGuards();

        return Quotation::query()->with('items')->findOrFail($id);
    }

    private function sentUrl(): string
    {
        $url = null;
        Mail::assertSent(QuotationReviewRequestMail::class, function (QuotationReviewRequestMail $mail) use (&$url) {
            $url = $mail->reviewUrl;

            return $mail->hasTo('khach@example.test') && str_contains($mail->render(), 'Kiểm tra phanh');
        });

        return (string) $url;
    }

    public function test_customer_reviews_each_line_from_email_link_without_login(): void
    {
        $quotation = $this->sendQuotation();
        $url = $this->sentUrl();
        [$brake, $wash] = [$quotation->items->firstWhere('service_id', $this->brake->id), $quotation->items->firstWhere('service_id', $this->wash->id)];

        // GET chỉ hiển thị (trình quét link không duyệt hộ).
        $this->get($url)->assertOk()->assertSee('Duyệt báo giá')->assertSee('Kiểm tra phanh');
        $this->assertSame(Quotation::SENT, $quotation->fresh()->status);

        $this->post($url, ['decision' => [$brake->id => 'approve', $wash->id => 'reject']])
            ->assertOk()->assertSee('Đã gửi lựa chọn cho gara');
        $this->assertSame(Quotation::PARTIALLY_APPROVED, $quotation->fresh()->status);
        $this->assertTrue($brake->fresh()->is_approved);
        $this->assertFalse($wash->fresh()->is_approved);
        $this->assertSame(CustomerConfirmation::METHOD_EMAIL_LINK, CustomerConfirmation::query()->where('confirmable_id', $quotation->id)->value('method'));

        // Dùng một lần: mở / gửi lại chỉ báo đã duyệt, không ghi thêm.
        $this->post($url, ['decision' => [$brake->id => 'reject', $wash->id => 'reject']])->assertOk()->assertSee('Báo giá đã được duyệt');
        $this->assertTrue($brake->fresh()->is_approved);
        $this->assertSame(1, CustomerConfirmation::query()->count());
    }

    public function test_tampered_link_is_rejected(): void
    {
        $quotation = $this->sendQuotation();
        $item = $quotation->items->first();

        $this->post($this->sentUrl().'x', ['decision' => [$item->id => 'approve']])->assertOk()->assertSee('Link đã hết hạn');
        $this->assertSame(Quotation::SENT, $quotation->fresh()->status);
    }

    public function test_walk_in_order_without_booking_consent_gets_no_email(): void
    {
        $this->order->update(['appointment_id' => null]);
        $id = $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/quotations", [
            'items' => [['item_type' => 'SERVICE', 'service_id' => $this->brake->id, 'quantity' => 1]],
        ])->json('id');

        $this->actingAs($this->advisor)->postJson("/api/quotations/{$id}/send")->assertOk()->assertJsonPath('emailed_to', null);
        Mail::assertNotSent(QuotationReviewRequestMail::class);
    }
}
