<?php

namespace Tests\Feature;

use App\Mail\InvoicePaymentRequestMail;
use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use App\Services\VnpayService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** Cố vấn gửi hoá đơn qua email → khách xem và trả VNPay từ link có chữ ký, không cần đăng nhập. */
class InvoiceEmailPaymentTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Customer $customer;

    private Invoice $invoice;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        config([
            'app.url' => 'http://localhost',
            'services.vnpay.tmn_code' => 'TESTCODE',
            'services.vnpay.hash_secret' => 'test-secret',
            'services.vnpay.payment_url' => 'https://sandbox.example.test/pay',
            'services.vnpay.return_url' => 'http://localhost:5173/payment/vnpay-return',
            'services.vnpay.confirm_on_return' => true,
            'services.vnpay.query_on_return' => false,
        ]);

        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $this->customer = Customer::factory()->create(['email' => 'khach@example.test']);
        $order = RepairOrder::query()->create([
            'repair_order_code' => 'RO-MAIL', 'customer_id' => $this->customer->id, 'status' => RepairOrder::COMPLETED, 'received_at' => now()->subDay(),
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $this->customer->id])->id, 'advisor_id' => $this->advisor->employee->id,
        ]);
        $this->invoice = Invoice::query()->create([
            'repair_order_id' => $order->id, 'invoice_code' => 'INV-MAIL', 'status' => Invoice::UNPAID,
            'subtotal' => 500000, 'discount_amount' => 0, 'total_amount' => 500000,
        ]);
        InvoiceItem::query()->create([
            'invoice_id' => $this->invoice->id, 'item_type' => 'PART', 'description' => 'Má phanh trước',
            'quantity' => 1, 'unit_price' => 500000, 'amount' => 500000,
        ]);
    }

    private function sendAndGetUrl(): string
    {
        $this->actingAs($this->advisor)->postJson("/api/invoices/{$this->invoice->id}/payment-email")
            ->assertOk()->assertJsonPath('emailed_to', 'khach@example.test');
        auth()->forgetGuards();

        $url = null;
        Mail::assertSent(InvoicePaymentRequestMail::class, function (InvoicePaymentRequestMail $mail) use (&$url) {
            $url = $mail->paymentUrl;

            return $mail->hasTo('khach@example.test') && str_contains($mail->render(), 'Má phanh trước');
        });

        return (string) $url;
    }

    /** @return array<string, string> */
    private function signedReturn(Payment $payment, string $responseCode = '00'): array
    {
        $params = [
            'vnp_Amount' => (string) ((int) $payment->amount * 100), 'vnp_ResponseCode' => $responseCode,
            'vnp_TransactionStatus' => $responseCode, 'vnp_TmnCode' => 'TESTCODE',
            'vnp_TxnRef' => $payment->gateway_txn_ref, 'vnp_TransactionNo' => '14000001',
        ];

        return $params + ['vnp_SecureHash' => app(VnpayService::class)->sign($params)];
    }

    public function test_customer_opens_link_and_pays_without_login(): void
    {
        $url = $this->sendAndGetUrl();

        // GET chỉ hiển thị: trình quét link của hộp thư không tạo giao dịch.
        $this->get($url)->assertOk()->assertSee('Thanh toán hoá đơn')->assertSee('Má phanh trước');
        $this->assertSame(0, Payment::query()->count());

        $redirect = $this->post($url)->assertRedirect()->headers->get('Location');
        $payment = Payment::query()->sole();
        $this->assertSame(Payment::PENDING, $payment->status);
        $this->assertStringStartsWith('https://sandbox.example.test/pay', $redirect);
        $this->assertStringContainsString(urlencode('/payments/vnpay/email-return'), $redirect);

        $query = http_build_query($this->signedReturn($payment));
        $location = $this->get("/payments/vnpay/email-return?{$query}")->assertRedirect()->headers->get('Location');
        $this->assertSame("http://localhost:5173/payment/vnpay-return?{$query}&via=email", $location);

        $this->getJson("/api/payments/vnpay/return?{$query}&via=email")->assertOk()
            ->assertJsonPath('result', Payment::SUCCESS)->assertJsonPath('retry_url', null);
        $this->assertSame(Invoice::PAID, $this->invoice->fresh()->status);

        $this->get($url)->assertOk()->assertSee('Hoá đơn đã thanh toán');
        $this->post($url)->assertOk()->assertSee('Hoá đơn đã thanh toán');
        $this->assertSame(1, Payment::query()->count());
    }

    public function test_forged_gateway_return_does_not_mark_invoice_paid(): void
    {
        $this->post($this->sendAndGetUrl());
        $payment = Payment::query()->sole();
        $params = ['vnp_SecureHash' => 'forged'] + $this->signedReturn($payment);

        $this->getJson('/api/payments/vnpay/return?'.http_build_query($params).'&via=email')->assertStatus(400);

        $this->assertSame(Invoice::UNPAID, $this->invoice->fresh()->status);
    }

    public function test_cancelled_email_payment_can_retry_for_a_short_time_only(): void
    {
        $this->post($this->sendAndGetUrl());
        $query = http_build_query($this->signedReturn(Payment::query()->sole(), '24'));

        $retryUrl = $this->getJson("/api/payments/vnpay/return?{$query}&via=email")->assertOk()
            ->assertJsonPath('result', Payment::CANCELLED)->json('retry_url');
        $this->get($retryUrl)->assertOk()->assertSee('Thanh toán hoá đơn');
        $this->getJson("/api/payments/vnpay/return?{$query}")->assertOk()->assertJsonMissingPath('retry_url');

        $this->travel(2)->hours();
        $this->getJson("/api/payments/vnpay/return?{$query}&via=email")->assertOk()->assertJsonPath('retry_url', null);
    }

    public function test_tampered_expired_and_changed_links_cannot_pay(): void
    {
        $url = $this->sendAndGetUrl();

        $this->post($url.'x')->assertOk()->assertSee('Link đã hết hạn');

        $this->travel(4)->days();
        $this->post($url)->assertOk()->assertSee('Link đã hết hạn');
        $this->travelBack();

        $this->invoice->update(['total_amount' => 600000]);
        $this->post($url)->assertOk()->assertSee('Hoá đơn đã thay đổi');
        $this->assertSame(0, Payment::query()->count());
    }

    public function test_partial_payment_leaves_only_the_remaining_amount_to_pay(): void
    {
        $url = $this->sendAndGetUrl();
        Payment::query()->create(['invoice_id' => $this->invoice->id, 'amount' => 200000, 'payment_method' => Payment::DIRECT, 'status' => Payment::SUCCESS, 'paid_at' => now()]);

        $this->post($url)->assertRedirect();

        $this->assertSame(300000.0, (float) Payment::query()->where('payment_method', Payment::VNPAY)->sole()->amount);
    }

    public function test_only_staff_can_send_and_invalid_invoices_are_refused(): void
    {
        $this->actingAs(Account::factory()->create())->postJson("/api/invoices/{$this->invoice->id}/payment-email")->assertForbidden();

        $this->customer->update(['email' => null]);
        $this->actingAs($this->advisor)->postJson("/api/invoices/{$this->invoice->id}/payment-email")->assertUnprocessable();

        $this->customer->update(['email' => 'khach@example.test']);
        $this->invoice->update(['status' => Invoice::PAID]);
        $this->postJson("/api/invoices/{$this->invoice->id}/payment-email")->assertUnprocessable();

        Mail::assertNothingSent();
    }
}
