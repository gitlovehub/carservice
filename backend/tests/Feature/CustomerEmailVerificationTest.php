<?php

namespace Tests\Feature;

use App\Mail\CustomerEmailChangedMail;
use App\Mail\CustomerEmailVerificationMail;
use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** Quy định 1–2: email nhận mã phải được xác minh, cố vấn không tự đổi email đã xác minh. */
class CustomerEmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
    }

    private function sentCode(): string
    {
        $code = '';
        Mail::assertSent(CustomerEmailVerificationMail::class, function (CustomerEmailVerificationMail $mail) use (&$code) {
            $code = $mail->otp;

            return true;
        });

        return $code;
    }

    public function test_advisor_cannot_replace_a_verified_email(): void
    {
        $customer = Customer::factory()->create(['email' => 'owner@example.test']);

        $this->actingAs($this->advisor)->patchJson("/api/customers/{$customer->id}", ['email' => 'advisor@example.test'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->actingAs($this->advisor)->postJson("/api/customers/{$customer->id}/email-verification", ['email' => 'advisor@example.test'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertSame('owner@example.test', $customer->fresh()->email);
        Mail::assertNothingSent();
    }

    public function test_walk_in_email_is_verified_by_code_and_logged(): void
    {
        $customer = Customer::factory()->walkIn()->create();

        $this->actingAs($this->advisor)->postJson("/api/customers/{$customer->id}/email-verification", ['email' => 'Khach@Example.test'])->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/customers/{$customer->id}/email-verification/verify", ['email' => 'khach@example.test', 'code' => '000000'])
            ->assertUnprocessable();
        $this->actingAs($this->advisor)->postJson("/api/customers/{$customer->id}/email-verification/verify", ['email' => 'khach@example.test', 'code' => $this->sentCode()])
            ->assertOk()->assertJsonPath('email_verified', true);

        $this->assertSame('khach@example.test', $customer->fresh()->confirmationEmail());
        $this->assertTrue(AuditLog::query()->where('action', 'customer.email_verified')->where('auditable_id', $customer->id)->exists());
    }

    public function test_admin_changes_verified_email_and_old_address_is_notified(): void
    {
        $admin = Account::factory()->admin()->create();
        $customer = Customer::factory()->create(['email' => 'old@example.test']);

        $this->actingAs($admin)->postJson("/api/customers/{$customer->id}/email-verification", ['email' => 'new@example.test'])->assertOk();
        $this->actingAs($admin)->postJson("/api/customers/{$customer->id}/email-verification/verify", ['email' => 'new@example.test', 'code' => $this->sentCode()])->assertOk();

        $this->assertSame('new@example.test', $customer->fresh()->email);
        Mail::assertSent(CustomerEmailChangedMail::class, fn ($mail) => $mail->hasTo('old@example.test'));
    }

    public function test_check_in_cannot_be_submitted_without_verified_email(): void
    {
        $customer = Customer::factory()->walkIn()->create();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $orderId = $this->actingAs($this->advisor)->postJson('/api/repair-orders', ['customer_id' => $customer->id, 'vehicle_id' => $vehicle->id, 'mileage_received' => 1000])->assertCreated()->json('id');
        $id = $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/handovers", [
            'type' => 'CHECK_IN', 'mileage' => 1000, 'fuel_level' => 'HALF', 'person_name' => 'Chủ xe', 'person_relation' => 'OWNER',
            'items' => [['category' => 'EXTERIOR', 'label' => 'Đầu xe', 'condition' => 'OK']],
        ])->assertCreated()->json('id');

        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertUnprocessable()->assertJsonValidationErrors('customer_email');
    }
}
