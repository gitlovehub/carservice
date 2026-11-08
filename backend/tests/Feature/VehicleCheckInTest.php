<?php

namespace Tests\Feature;

use App\Mail\HandoverOtpMail;
use App\Models\Account;
use App\Models\Customer;
use App\Models\CustomerConfirmation;
use App\Models\Employee;
use App\Models\RepairOrder;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use App\Models\VehicleHandover;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** P2-C — biên bản nhận xe (CHECK_IN): lập, khóa, khách xác nhận, chặn kiểm tra khi chưa xác nhận. */
class VehicleCheckInTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $owner;

    private Account $otherCustomer;

    private TechnicianProfile $technician;

    private int $orderId;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Storage::fake('local');

        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $techAccount = Account::factory()->technician()->create();
        $this->technician = TechnicianProfile::factory()->create(['employee_id' => Employee::factory()->create(['account_id' => $techAccount->id])->id]);
        $this->owner = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $this->owner->id, 'email' => 'owner@example.test']);
        $this->otherCustomer = Account::factory()->create();
        Customer::factory()->create(['account_id' => $this->otherCustomer->id]);
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);

        // Walk-in qua API → requires_check_in = true.
        $this->orderId = $this->actingAs($this->advisor)->postJson('/api/repair-orders', [
            'customer_id' => $customer->id, 'vehicle_id' => $vehicle->id, 'mileage_received' => 42000,
        ])->assertCreated()->json('id');
    }

    private function payload(array $overrides = []): array
    {
        return [
            'type' => 'CHECK_IN', 'mileage' => 42000, 'fuel_level' => 'HALF',
            'general_condition' => 'Trầy nhẹ cản trước', 'valuables_note' => 'Không có đồ có giá trị',
            'person_name' => 'Nguyễn Văn A', 'person_phone' => '0900000000', 'person_relation' => 'OWNER',
            'items' => [
                ['category' => 'EXTERIOR', 'position_code' => 'FRONT_BUMPER', 'label' => 'Cản trước', 'condition' => 'SCRATCH', 'note' => 'Vết 5 cm'],
                ['category' => 'KEY', 'label' => 'Chìa khóa', 'condition' => 'PRESENT', 'quantity' => 2],
            ],
            ...$overrides,
        ];
    }

    private function createDraft(): int
    {
        return $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/handovers", $this->payload())
            ->assertCreated()->assertJsonPath('status', 'DRAFT')->assertJsonCount(2, 'checklist_items')->json('id');
    }

    private function submitted(): int
    {
        $id = $this->createDraft();
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertOk()->assertJsonPath('status', 'SUBMITTED');

        return $id;
    }

    private function assign()
    {
        return $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/assign-technician", ['technician_id' => $this->technician->id]);
    }

    public function test_inspection_is_blocked_until_customer_confirms_check_in(): void
    {
        $this->assign()->assertUnprocessable();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/inspections", ['diagnosis' => 'x'])->assertUnprocessable();
        $this->assertSame(RepairOrder::RECEIVED, RepairOrder::query()->find($this->orderId)->status);

        $id = $this->submitted();
        $this->assign()->assertUnprocessable();

        $this->actingAs($this->owner)->postJson("/api/me/handovers/{$id}/confirm", ['comment' => 'Đúng tình trạng'])
            ->assertOk()->assertJsonPath('status', 'CONFIRMED');
        $this->assign()->assertSuccessful();
        $this->assertSame(RepairOrder::INSPECTING, RepairOrder::query()->find($this->orderId)->status);
    }

    public function test_legacy_orders_without_requirement_are_not_blocked(): void
    {
        RepairOrder::query()->whereKey($this->orderId)->update(['requires_check_in' => false]);

        $this->assign()->assertSuccessful();
    }

    public function test_draft_is_editable_but_submitted_content_is_locked_with_hash(): void
    {
        $id = $this->createDraft();
        $this->actingAs($this->advisor)->patchJson("/api/handovers/{$id}", ['mileage' => 42010, 'items' => [
            ['category' => 'EXTERIOR', 'label' => 'Gương trái', 'condition' => 'BROKEN'],
        ]])->assertOk()->assertJsonPath('mileage', 42010)->assertJsonCount(1, 'checklist_items');

        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertOk();
        $handover = VehicleHandover::query()->findOrFail($id);
        $this->assertSame(64, strlen($handover->snapshot_sha256));
        $this->assertSame('Gương trái', $handover->snapshot['items'][0]['label']);

        $this->actingAs($this->advisor)->patchJson("/api/handovers/{$id}", ['mileage' => 1])->assertUnprocessable();
        $this->actingAs($this->advisor)->post('/api/media', [
            'file' => UploadedFile::fake()->create('late.jpg', 50, 'image/jpeg'), 'attachable_type' => 'handover', 'attachable_id' => $id,
        ], ['Accept' => 'application/json'])->assertUnprocessable();
        $this->assertSame(42010, $handover->fresh()->mileage);
    }

    public function test_photos_attached_to_draft_are_part_of_the_snapshot(): void
    {
        $id = $this->createDraft();
        $this->actingAs($this->advisor)->post('/api/media', [
            'file' => UploadedFile::fake()->create('front.jpg', 50, 'image/jpeg'), 'attachable_type' => 'handover', 'attachable_id' => $id, 'position_code' => 'FRONT',
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertOk();
        $photos = VehicleHandover::query()->findOrFail($id)->snapshot['photos'];
        $this->assertCount(1, $photos);
        $this->assertSame('FRONT', $photos[0]['position_code']);
    }

    public function test_only_one_active_check_in_and_void_requires_reason(): void
    {
        $id = $this->createDraft();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/handovers", $this->payload())->assertUnprocessable();

        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/void", ['reason' => 'x'])->assertUnprocessable();
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/void", ['reason' => 'Lập sai xe'])->assertOk()->assertJsonPath('status', 'VOID');
        $this->createDraft();
    }

    public function test_confirmed_check_in_cannot_be_voided_or_confirmed_twice(): void
    {
        $id = $this->submitted();
        $this->actingAs($this->owner)->postJson("/api/me/handovers/{$id}/confirm")->assertOk();

        $this->actingAs($this->owner)->postJson("/api/me/handovers/{$id}/confirm")->assertUnprocessable();
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/void", ['reason' => 'Muốn sửa lại'])->assertUnprocessable();
        $this->assertSame(1, CustomerConfirmation::query()->count());
    }

    public function test_counter_otp_confirms_check_in_with_witness(): void
    {
        $id = $this->submitted();
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/otp")->assertOk()->assertJsonPath('sent_to', 'ow***@example.test');

        $code = null;
        Mail::assertSent(HandoverOtpMail::class, function (HandoverOtpMail $mail) use (&$code) {
            $code = $mail->otp;

            return $mail->hasTo('owner@example.test') && str_contains($mail->render(), 'Cản trước');
        });

        $wrong = $code === '000000' ? '111111' : '000000';
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/verify-otp", ['code' => $wrong])->assertUnprocessable();
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/verify-otp", ['code' => $code])->assertOk()->assertJsonPath('status', 'CONFIRMED');

        $confirmation = CustomerConfirmation::query()->sole();
        $this->assertSame(CustomerConfirmation::METHOD_EMAIL_OTP, $confirmation->method);
        $this->assertSame(VehicleHandover::query()->find($id)->snapshot_sha256, $confirmation->content_sha256);
        $this->assertSame($this->advisor->employee->id, $confirmation->witness_employee_id);
    }

    public function test_customer_sees_only_submitted_handovers_of_own_order(): void
    {
        $draft = $this->createDraft();
        $this->actingAs($this->owner)->getJson("/api/me/repair-orders/{$this->orderId}/handovers")->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($this->owner)->getJson("/api/me/repair-orders/{$this->orderId}")->assertOk()->assertJsonCount(0, 'handovers');
        $this->actingAs($this->advisor)->getJson("/api/repair-orders/{$this->orderId}")->assertOk()->assertJsonCount(1, 'handovers')->assertJsonPath('requires_check_in', true);
        $this->actingAs($this->owner)->postJson("/api/me/handovers/{$draft}/confirm")->assertUnprocessable();

        $this->actingAs($this->advisor)->postJson("/api/handovers/{$draft}/submit")->assertOk();
        $this->actingAs($this->owner)->getJson("/api/me/repair-orders/{$this->orderId}/handovers")->assertOk()->assertJsonCount(1, 'data');

        $this->actingAs($this->otherCustomer)->getJson("/api/me/repair-orders/{$this->orderId}/handovers")->assertNotFound();
        $this->actingAs($this->otherCustomer)->postJson("/api/me/handovers/{$draft}/confirm")->assertNotFound();
        $this->actingAs($this->advisor)->postJson("/api/me/handovers/{$draft}/confirm")->assertForbidden();
    }

    public function test_validation_rejects_bad_payload(): void
    {
        // P4: CHECK_OUT hợp lệ, nhưng không giao xe cho "người khác" (không phải chủ xe / người được ủy quyền).
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/handovers", $this->payload(['type' => 'CHECK_OUT', 'person_relation' => 'OTHER']))->assertUnprocessable();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/handovers", $this->payload(['type' => 'PICKUP']))->assertUnprocessable();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/handovers", $this->payload(['person_relation' => 'BOSS']))->assertUnprocessable();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/handovers", $this->payload(['items' => [['category' => 'ROOF', 'label' => 'x', 'condition' => 'OK']]]))->assertUnprocessable();
        $this->actingAs($this->owner)->postJson("/api/repair-orders/{$this->orderId}/handovers", $this->payload())->assertForbidden();

        $empty = $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/handovers", $this->payload(['items' => []]))->assertCreated()->json('id');
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$empty}/submit")->assertUnprocessable();
    }
}
