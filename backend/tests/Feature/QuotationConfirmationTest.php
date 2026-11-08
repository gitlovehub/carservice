<?php

namespace Tests\Feature;

use App\Mail\ConfirmationOtpMail;
use App\Models\Account;
use App\Models\ConfirmationOtp;
use App\Models\Customer;
use App\Models\CustomerConfirmation;
use App\Models\Employee;
use App\Models\Inspection;
use App\Models\InspectionRecommendation;
use App\Models\Part;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\QuotationItemResponse;
use App\Models\RepairOrder;
use App\Models\Service;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** P1C — xác nhận báo giá: khách tự duyệt (ACCOUNT) hoặc tại quầy bằng OTP email (EMAIL_OTP). */
class QuotationConfirmationTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $customerAccount;

    private Customer $customer;

    private RepairOrder $order;

    private Quotation $quotation;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();

        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $this->customerAccount = Account::factory()->create();
        $this->customer = Customer::factory()->create(['account_id' => $this->customerAccount->id, 'email' => 'owner@example.test']);
        $service = Service::factory()->create(['base_price' => 300000, 'status' => 'ACTIVE']);
        $part = Part::query()->create(['sku' => 'P-1', 'name' => 'Lọc gió', 'unit' => 'Cái', 'sell_price' => 200000, 'status' => 'ACTIVE']);

        $this->order = RepairOrder::query()->create([
            'repair_order_code' => 'RO-CONF',
            'customer_id' => $this->customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $this->customer->id])->id,
            'advisor_id' => $this->advisor->employee->id,
            'status' => RepairOrder::QUOTING,
            'received_at' => now(),
        ]);
        $inspection = Inspection::query()->create(['repair_order_id' => $this->order->id, 'diagnosis' => 'Lọc gió bẩn', 'inspected_at' => now()]);
        InspectionRecommendation::query()->create(['inspection_id' => $inspection->id, 'item_type' => InspectionRecommendation::TYPE_PART, 'part_id' => $part->id, 'quantity' => 1]);

        $id = $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->order->id}/quotations", ['items' => [
            ['item_type' => 'SERVICE', 'service_id' => $service->id, 'quantity' => 1],
            ['item_type' => 'PART', 'part_id' => $part->id, 'quantity' => 1],
        ]])->assertCreated()->json('id');
        $this->actingAs($this->advisor)->postJson("/api/quotations/{$id}/send")->assertOk();
        $this->quotation = Quotation::query()->with('items')->findOrFail($id);
    }

    /** Dịch vụ đồng ý, phụ tùng từ chối. */
    private function responses(bool $partApproved = false): array
    {
        return $this->quotation->items->sortBy('id')->values()->map(fn (QuotationItem $item) => [
            'item_id' => $item->id,
            'is_approved' => $item->item_type === 'SERVICE' ? true : $partApproved,
        ])->all();
    }

    private function requestOtp(?array $responses = null): string
    {
        $this->actingAs($this->advisor)
            ->postJson("/api/quotations/{$this->quotation->id}/otp", ['responses' => $responses ?? $this->responses()])
            ->assertOk()->assertJsonPath('sent_to', 'ow***@example.test');

        $code = null;
        Mail::assertSent(ConfirmationOtpMail::class, function (ConfirmationOtpMail $mail) use (&$code) {
            $code = $mail->otp;
            $html = $mail->render();

            return $mail->hasTo('owner@example.test')
                && str_contains($html, $mail->otp)
                && str_contains($html, $this->quotation->quotation_code)
                && str_contains($html, 'Đồng ý');
        });

        return $code;
    }

    private function verify(string $code, ?array $responses = null)
    {
        return $this->actingAs($this->advisor)->postJson("/api/quotations/{$this->quotation->id}/verify-otp", [
            'code' => $code, 'responses' => $responses ?? $this->responses(),
        ]);
    }

    public function test_customer_account_response_records_account_confirmation(): void
    {
        $this->actingAs($this->customerAccount)
            ->postJson("/api/me/quotations/{$this->quotation->id}/respond", ['responses' => $this->responses()])
            ->assertOk()->assertJsonPath('status', Quotation::PARTIALLY_APPROVED);

        $confirmation = CustomerConfirmation::query()->sole();
        $this->assertSame(CustomerConfirmation::METHOD_ACCOUNT, $confirmation->method);
        $this->assertSame($this->customer->id, $confirmation->customer_id);
        $this->assertNull($confirmation->witness_employee_id);
        $this->assertSame(64, strlen($confirmation->content_sha256));
    }

    public function test_each_decision_is_kept_in_item_history_linked_to_the_confirmation(): void
    {
        $this->actingAs($this->customerAccount)
            ->postJson("/api/me/quotations/{$this->quotation->id}/respond", ['responses' => $this->responses()])
            ->assertOk();

        $confirmation = CustomerConfirmation::query()->sole();
        $history = QuotationItemResponse::query()->orderBy('quotation_item_id')->get();
        $this->assertCount(2, $history);
        $this->assertTrue($history->every(fn ($row) => $row->customer_confirmation_id === $confirmation->id));
        $byType = $history->mapWithKeys(fn ($row) => [$row->item->item_type => $row->decision]);
        $this->assertSame(QuotationItemResponse::APPROVED, $byType['SERVICE']);
        $this->assertSame(QuotationItemResponse::REJECTED, $byType['PART']);
        $this->assertSame(Quotation::TYPE_INITIAL, $this->quotation->fresh()->type);
    }

    public function test_counter_otp_flow_records_email_otp_confirmation_with_witness(): void
    {
        $code = $this->requestOtp();
        $otp = ConfirmationOtp::query()->sole();
        $this->assertNotSame($code, $otp->code_hash);
        $this->assertSame('owner@example.test', $otp->sent_to_email);

        $this->verify($code)->assertOk()->assertJsonPath('status', Quotation::PARTIALLY_APPROVED);

        $confirmation = CustomerConfirmation::query()->sole();
        $this->assertSame(CustomerConfirmation::METHOD_EMAIL_OTP, $confirmation->method);
        $this->assertSame($otp->id, $confirmation->confirmation_otp_id);
        $this->assertSame($otp->content_sha256, $confirmation->content_sha256);
        $this->assertSame($this->advisor->employee->id, $confirmation->witness_employee_id);
        $this->assertNotNull($otp->fresh()->used_at);
        $this->assertSame(2, QuotationItemResponse::query()->where('customer_confirmation_id', $confirmation->id)->count());
    }

    public function test_used_otp_cannot_be_reused(): void
    {
        $code = $this->requestOtp();
        $this->verify($code)->assertOk();

        $this->verify($code)->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->assertSame(1, CustomerConfirmation::query()->count());
    }

    public function test_changing_decisions_after_otp_was_sent_is_rejected(): void
    {
        $code = $this->requestOtp($this->responses(false));

        $this->verify($code, $this->responses(true))->assertUnprocessable()->assertJsonValidationErrors('responses');
        $this->assertSame(Quotation::SENT, $this->quotation->fresh()->status);
        $this->assertSame(0, CustomerConfirmation::query()->count());
    }

    public function test_wrong_code_locks_after_max_attempts(): void
    {
        $code = $this->requestOtp();
        $wrong = $code === '000000' ? '111111' : '000000';

        for ($i = 0; $i < ConfirmationOtp::MAX_ATTEMPTS; $i++) {
            $this->verify($wrong)->assertUnprocessable()->assertJsonValidationErrors('code');
        }

        $this->verify($code)->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->assertSame(Quotation::SENT, $this->quotation->fresh()->status);
        $this->assertSame(0, CustomerConfirmation::query()->count());
    }

    public function test_expired_otp_is_rejected(): void
    {
        $code = $this->requestOtp();
        $this->travel(ConfirmationOtp::TTL_MINUTES + 1)->minutes();

        $this->verify($code)->assertUnprocessable()->assertJsonValidationErrors('code');
    }

    public function test_requesting_new_otp_invalidates_previous_code(): void
    {
        $first = $this->requestOtp();
        Mail::fake();
        $second = $this->requestOtp();

        if ($first !== $second) {
            $this->verify($first)->assertUnprocessable();
        }
        $this->verify($second)->assertOk();
    }

    public function test_staff_cannot_use_customer_account_confirmation_and_customer_cannot_request_otp(): void
    {
        $this->actingAs($this->advisor)
            ->postJson("/api/me/quotations/{$this->quotation->id}/respond", ['responses' => $this->responses()])
            ->assertForbidden();
        $this->actingAs($this->customerAccount)
            ->postJson("/api/quotations/{$this->quotation->id}/otp", ['responses' => $this->responses()])
            ->assertForbidden();
        $this->assertSame(0, CustomerConfirmation::query()->count());
        Mail::assertNothingSent();
    }

    public function test_otp_requires_owner_email_and_sent_quotation(): void
    {
        $this->customer->update(['email' => null]);
        $this->customerAccount->update(['email' => 'account@example.test']);
        $this->actingAs($this->advisor)->postJson("/api/quotations/{$this->quotation->id}/otp", ['responses' => $this->responses()])
            ->assertOk()->assertJsonPath('sent_to', 'ac*****@example.test');

        $this->quotation->update(['status' => Quotation::APPROVED]);
        $this->actingAs($this->advisor)->postJson("/api/quotations/{$this->quotation->id}/otp", ['responses' => $this->responses()])
            ->assertUnprocessable()->assertJsonValidationErrors('quotation');
    }
}
