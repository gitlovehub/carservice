<?php

namespace Tests\Feature;

use App\Mail\HandoverOtpMail;
use App\Models\Account;
use App\Models\Customer;
use App\Models\CustomerConfirmation;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\MediaAttachment;
use App\Models\PickupAuthorization;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use App\Models\VehicleHandover;
use App\Services\HandoverEmailViewService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
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

        $this->orderId = $this->actingAs($this->advisor)->postJson('/api/repair-orders', ['customer_id' => $customer->id, 'vehicle_id' => $vehicle->id, 'mileage_received' => 50000])
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
        RepairOrder::query()->whereKey($this->orderId)->update(['status' => RepairOrder::COMPLETED, 'quality_checked_at' => now()]);
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

            $html = $mail->render();

            return $mail->hasTo('owner@example.test')
                && str_contains($html, 'Người nhận') && str_contains($html, 'Xước') && str_contains($html, '1/2')
                && ! str_contains($html, '>SCRATCH') && ! str_contains($html, '>PRESENT') && ! str_contains($html, '>HALF<');
        });
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/verify-otp", ['code' => $code])->assertOk()->assertJsonPath('status', 'CONFIRMED');
        $this->assertSame(PickupAuthorization::USED, PickupAuthorization::query()->find($authId)->status);

        $this->readyToHandOver();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/hand-over")->assertOk();
    }

    public function test_id_last4_is_never_returned_and_wrong_guesses_are_limited(): void
    {
        $authId = $this->authorize()->assertCreated()->assertJsonMissingPath('id_last4')->json('id');
        $this->actingAs($this->advisor)->getJson("/api/repair-orders/{$this->orderId}")->assertOk()
            ->assertJsonPath('pickup_authorizations.0.id', $authId)
            ->assertJsonMissingPath('pickup_authorizations.0.id_last4');

        $attempt = fn (string $last4) => $this->handover('CHECK_OUT', ['person_relation' => 'AUTHORIZED', 'pickup_authorization_id' => $authId, 'person_id_last4' => $last4]);
        for ($i = 0; $i < 5; $i++) {
            $attempt('9999')->assertUnprocessable()->assertJsonValidationErrors('person_id_last4');
        }
        $attempt('1234')->assertUnprocessable()->assertJsonValidationErrors('person_id_last4');

        $this->travel(16)->minutes();
        $attempt('1234')->assertCreated()
            ->assertJsonPath('has_person_id', true)
            ->assertJsonMissingPath('person_id_last4')
            ->assertJsonMissingPath('snapshot');
    }

    public function test_email_link_shows_full_locked_handover_without_login(): void
    {
        Storage::fake('private');
        Storage::disk('private')->put('handover/a.jpg', 'image');
        $authId = $this->authorize()->assertCreated()->json('id');
        $id = $this->handover('CHECK_OUT', ['person_relation' => 'AUTHORIZED', 'pickup_authorization_id' => $authId, 'person_id_last4' => '1234'])->assertCreated()->json('id');
        $media = MediaAttachment::query()->create([
            'attachable_type' => VehicleHandover::class, 'attachable_id' => $id, 'disk' => 'private', 'path' => 'handover/a.jpg', 'original_name' => 'a.jpg',
            'mime' => 'image/jpeg', 'size_bytes' => 5, 'sha256' => str_repeat('a', 64), 'position_code' => 'FRONT', 'uploaded_by_account_id' => $this->advisor->id,
        ]);
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertOk();
        $handover = VehicleHandover::query()->findOrFail($id);
        $views = app(HandoverEmailViewService::class);
        $url = $views->url($handover);
        $this->assertStringContainsString('Xem biên bản đầy đủ', (new HandoverOtpMail('123456', $handover, 10))->render());

        $this->app['auth']->forgetGuards();
        $page = $this->get($url)->assertOk()->assertSee('Biên bản trả xe')->assertSee('Cản trước')->assertSee('Lúc nhận')->assertDontSee('1234')->assertDontSee('0911222333');
        preg_match('/<img src="([^"]+photos[^"]+)"/', $page->getContent(), $photo);
        $this->get(html_entity_decode($photo[1]))->assertOk();
        $this->get("/handovers/{$id}/email-view/photos/{$media->id}?rev=x")->assertForbidden();
        $this->get("/handovers/{$id}/email-view?rev=x")->assertOk()->assertSee('Link đã hết hạn');

        $this->travel(4)->days();
        $this->get($url)->assertOk()->assertSee('Link đã hết hạn');
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
            ['category' => 'EXTERIOR', 'label' => 'Cản trước', 'condition' => 'DENT', 'note' => 'Móp góc trái'],
            ['category' => 'EXTERIOR', 'label' => 'cản trước ', 'condition' => 'SCRATCH'],
        ]])->assertCreated()->json('id');
        $this->attachPhoto($id);
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertOk();

        $items = VehicleHandover::query()->find($id)->checklistItems;
        $this->assertTrue($items[0]->is_discrepancy);
        $this->assertFalse($items[1]->is_discrepancy);
        $this->assertTrue(VehicleHandover::query()->find($id)->snapshot['items'][0]['is_discrepancy']);
    }

    private function attachPhoto(int $handoverId, ?string $position = null): void
    {
        MediaAttachment::query()->create([
            'attachable_type' => VehicleHandover::class, 'attachable_id' => $handoverId, 'disk' => 'private', 'path' => "handover/{$handoverId}-".($position ?? 'any').'.jpg', 'original_name' => 'a.jpg',
            'mime' => 'image/jpeg', 'size_bytes' => 5, 'sha256' => str_repeat('b', 64), 'position_code' => $position, 'uploaded_by_account_id' => $this->advisor->id,
        ]);
    }

    public function test_worse_condition_requires_note_and_photo(): void
    {
        $id = $this->handover('CHECK_OUT', ['items' => [['category' => 'EXTERIOR', 'position_code' => 'FRONT', 'label' => 'Cản trước', 'condition' => 'BROKEN']]])->assertCreated()->json('id');
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertUnprocessable()->assertJsonValidationErrors(['items.0.note', 'photos']);

        $this->actingAs($this->advisor)->patchJson("/api/handovers/{$id}", ['items' => [['category' => 'EXTERIOR', 'position_code' => 'FRONT', 'label' => 'Cản trước', 'condition' => 'BROKEN', 'note' => 'Vỡ góc phải']]])->assertOk();
        $this->attachPhoto($id, 'REAR');
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertUnprocessable()->assertJsonValidationErrors('photos');

        $this->attachPhoto($id, 'FRONT');
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertOk();
    }

    public function test_check_out_must_keep_check_in_items_and_not_lower_mileage(): void
    {
        VehicleHandover::query()->where('type', 'CHECK_IN')->update(['mileage' => 50000]);
        $submit = fn (int $id) => $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit");

        $id = $this->handover('CHECK_OUT', ['mileage' => 49999])->assertCreated()->json('id');
        $submit($id)->assertUnprocessable()->assertJsonValidationErrors('mileage');

        $this->actingAs($this->advisor)->patchJson("/api/handovers/{$id}", [
            'mileage' => 50010, 'fuel_level' => 'HALF', 'person_name' => 'Chủ xe', 'person_relation' => 'OWNER',
            'items' => [['category' => 'KEY', 'label' => 'Chìa khóa', 'condition' => 'PRESENT', 'quantity' => 2]],
        ])->assertOk();
        $submit($id)->assertUnprocessable()->assertJsonValidationErrors('items');

        $this->actingAs($this->advisor)->patchJson("/api/handovers/{$id}", [
            'mileage' => 50010, 'fuel_level' => 'HALF', 'person_name' => 'Chủ xe', 'person_relation' => 'OWNER',
            'items' => [['category' => 'EXTERIOR', 'label' => 'Cản trước', 'condition' => 'SCRATCH']],
        ])->assertOk();
        $submit($id)->assertOk();
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
