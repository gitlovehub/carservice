<?php

namespace Tests\Feature;

use App\Mail\HandoverOtpMail;
use App\Models\Account;
use App\Models\Customer;
use App\Models\CustomerConfirmation;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\PickupAuthorization;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use App\Models\VehicleHandover;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** P4 — trả xe: biên bản CHECK_OUT do chủ xe xác nhận; người nhận là chủ xe hoặc người được ủy quyền (N9). */
class VehicleCheckOutTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $owner;

    private Account $otherCustomer;

    private int $orderId;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $this->owner = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $this->owner->id, 'email' => 'owner@example.test']);
        $this->otherCustomer = Account::factory()->create();
        Customer::factory()->create(['account_id' => $this->otherCustomer->id]);
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);

        $this->orderId = $this->actingAs($this->advisor)->postJson('/api/repair-orders', ['customer_id' => $customer->id, 'vehicle_id' => $vehicle->id])
            ->assertCreated()->json('id');
        $checkIn = $this->handover('CHECK_IN', ['items' => [['category' => 'EXTERIOR', 'label' => 'Cản trước', 'condition' => 'SCRATCH']]])->assertCreated()->json('id');
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$checkIn}/submit")->assertOk();
        $this->actingAs($this->owner)->postJson("/api/me/handovers/{$checkIn}/confirm")->assertOk();
    }

    private function handover(string $type, array $overrides = [])
    {
        return $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/handovers", [
            'type' => $type, 'mileage' => 50000, 'fuel_level' => 'HALF', 'person_name' => 'Chủ xe', 'person_relation' => 'OWNER',
            'items' => [['category' => 'EXTERIOR', 'label' => 'Cản trước', 'condition' => 'SCRATCH'], ['category' => 'KEY', 'label' => 'Chìa khóa', 'condition' => 'PRESENT', 'quantity' => 2]],
            ...$overrides,
        ]);
    }

    private function readyToHandOver(): void
    {
        RepairOrder::query()->whereKey($this->orderId)->update(['status' => RepairOrder::COMPLETED]);
        Invoice::query()->create(['repair_order_id' => $this->orderId, 'invoice_code' => 'INV-CO', 'status' => Invoice::PAID, 'subtotal' => 0, 'discount_amount' => 0, 'total_amount' => 0]);
    }

    private function authorize(array $overrides = [])
    {
        return $this->actingAs($this->owner)->postJson("/api/me/repair-orders/{$this->orderId}/pickup-authorizations", [
            'full_name' => 'Trần Văn B', 'phone' => '0911222333', 'id_last4' => '1234', ...$overrides,
        ]);
    }

    public function test_hand_over_requires_owner_confirmed_check_out(): void
    {
        $this->readyToHandOver();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/hand-over")->assertUnprocessable();

        $id = $this->handover('CHECK_OUT')->assertCreated()->json('id');
        $this->assertNotNull(VehicleHandover::query()->find($id)->compared_handover_id);
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/hand-over")->assertUnprocessable();

        $this->actingAs($this->owner)->postJson("/api/me/handovers/{$id}/confirm")->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/hand-over")->assertOk()->assertJsonPath('status', RepairOrder::HANDED_OVER);
    }

    public function test_authorized_person_needs_owner_authorization_matching_id_and_owner_otp(): void
    {
        $authId = $this->authorize()->assertCreated()->assertJsonPath('status', 'ACTIVE')->json('id');
        $this->assertSame(CustomerConfirmation::METHOD_ACCOUNT, CustomerConfirmation::query()->where('confirmable_type', PickupAuthorization::class)->sole()->method);

        $this->handover('CHECK_OUT', ['person_relation' => 'AUTHORIZED'])->assertUnprocessable();
        $this->handover('CHECK_OUT', ['person_relation' => 'AUTHORIZED', 'pickup_authorization_id' => $authId, 'person_id_last4' => '9999'])->assertUnprocessable();
        $id = $this->handover('CHECK_OUT', ['person_relation' => 'AUTHORIZED', 'pickup_authorization_id' => $authId, 'person_id_last4' => '1234', 'person_name' => 'Tên nhập sai'])
            ->assertCreated()->assertJsonPath('person_name', 'Trần Văn B')->json('id');
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertOk();

        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/otp")->assertOk();
        $code = null;
        Mail::assertSent(HandoverOtpMail::class, function (HandoverOtpMail $mail) use (&$code) {
            $code = $mail->otp;

            return $mail->hasTo('owner@example.test');
        });
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/verify-otp", ['code' => $code])->assertOk()->assertJsonPath('status', 'CONFIRMED');
        $this->assertSame(PickupAuthorization::USED, PickupAuthorization::query()->find($authId)->status);

        $this->readyToHandOver();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/hand-over")->assertOk();
    }

    public function test_revoked_or_expired_authorization_blocks_check_out(): void
    {
        $authId = $this->authorize()->assertCreated()->json('id');
        $id = $this->handover('CHECK_OUT', ['person_relation' => 'AUTHORIZED', 'pickup_authorization_id' => $authId, 'person_id_last4' => '1234'])->assertCreated()->json('id');
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertOk();

        $this->actingAs($this->owner)->deleteJson("/api/me/pickup-authorizations/{$authId}")->assertOk()->assertJsonPath('status', 'REVOKED');
        $this->actingAs($this->owner)->postJson("/api/me/handovers/{$id}/confirm")->assertUnprocessable();
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/otp")->assertUnprocessable();

        $expired = $this->authorize(['valid_until' => now()->addHour()->toIso8601String()])->assertCreated()->json('id');
        $this->travel(2)->hours();
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/void", ['reason' => 'Ủy quyền đã thu hồi'])->assertOk();
        $this->handover('CHECK_OUT', ['person_relation' => 'AUTHORIZED', 'pickup_authorization_id' => $expired, 'person_id_last4' => '1234'])->assertUnprocessable();
    }

    public function test_check_out_marks_discrepancies_against_check_in(): void
    {
        $id = $this->handover('CHECK_OUT', ['items' => [
            ['category' => 'EXTERIOR', 'label' => 'Cản trước', 'condition' => 'DENT'],
            ['category' => 'EXTERIOR', 'label' => 'cản trước ', 'condition' => 'SCRATCH'],
        ]])->assertCreated()->json('id');
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertOk();

        $items = VehicleHandover::query()->find($id)->checklistItems;
        $this->assertTrue($items[0]->is_discrepancy);
        $this->assertFalse($items[1]->is_discrepancy);
        $this->assertTrue(VehicleHandover::query()->find($id)->snapshot['items'][0]['is_discrepancy']);
    }

    public function test_closing_a_checked_in_order_requires_check_out(): void
    {
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/close", ['close_reason' => 'CUSTOMER_REQUEST', 'note' => 'Khách không sửa'])
            ->assertUnprocessable();

        $id = $this->handover('CHECK_OUT')->assertCreated()->json('id');
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertOk();
        $this->actingAs($this->owner)->postJson("/api/me/handovers/{$id}/confirm")->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/close", ['close_reason' => 'CUSTOMER_REQUEST', 'note' => 'Khách không sửa'])
            ->assertOk();
    }

    public function test_pickup_authorization_permissions_and_limits(): void
    {
        $this->actingAs($this->otherCustomer)->postJson("/api/me/repair-orders/{$this->orderId}/pickup-authorizations", ['full_name' => 'X', 'phone' => '0900000000', 'id_last4' => '1111'])->assertNotFound();
        $this->actingAs($this->advisor)->postJson("/api/me/repair-orders/{$this->orderId}/pickup-authorizations", ['full_name' => 'X', 'phone' => '0900000000', 'id_last4' => '1111'])->assertForbidden();
        $this->authorize(['id_last4' => '12'])->assertUnprocessable();

        for ($i = 0; $i < PickupAuthorization::MAX_ACTIVE; $i++) {
            $this->authorize()->assertCreated();
        }
        $this->authorize()->assertUnprocessable();
        $first = PickupAuthorization::query()->first();
        $this->actingAs($this->otherCustomer)->deleteJson("/api/me/pickup-authorizations/{$first->id}")->assertNotFound();
        $this->actingAs($this->advisor)->getJson("/api/repair-orders/{$this->orderId}")->assertOk()->assertJsonCount(PickupAuthorization::MAX_ACTIVE, 'pickup_authorizations');
    }
}
