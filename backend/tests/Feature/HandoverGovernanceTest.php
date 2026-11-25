<?php

namespace Tests\Feature;

use App\Mail\PickupAuthorizationLinkMail;
use App\Models\Account;
use App\Models\Customer;
use App\Models\CustomerConfirmation;
use App\Models\Employee;
use App\Models\HandoverException;
use App\Models\PickupAuthorization;
use App\Models\Vehicle;
use App\Models\VehicleHandover;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Quy định 3 và 6: link ủy quyền cho khách không có tài khoản, ngoại lệ do admin duyệt. */
class HandoverGovernanceTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $admin;

    private Customer $customer;

    private int $orderId;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Storage::fake('local');
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $this->admin = Account::factory()->admin()->create();
        Employee::factory()->create(['account_id' => $this->admin->id]);
        $this->customer = Customer::factory()->create(['account_id' => null, 'email' => 'owner@example.test']);
        $vehicle = Vehicle::factory()->create(['customer_id' => $this->customer->id]);
        $this->orderId = $this->actingAs($this->advisor)->postJson('/api/repair-orders', ['customer_id' => $this->customer->id, 'vehicle_id' => $vehicle->id, 'mileage_received' => 1000])->assertCreated()->json('id');
    }

    private function sendLink(): string
    {
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/pickup-authorization-link")->assertOk()->assertJsonPath('sent_to', 'owner@example.test');
        $url = '';
        Mail::assertSent(PickupAuthorizationLinkMail::class, function (PickupAuthorizationLinkMail $mail) use (&$url) {
            $url = $mail->linkUrl;

            return $mail->hasTo('owner@example.test');
        });

        return $url;
    }

    private function submittedHandover(string $relation = 'OWNER'): int
    {
        $id = $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/handovers", [
            'type' => 'CHECK_IN', 'mileage' => 1000, 'fuel_level' => 'HALF', 'person_name' => 'Chủ xe', 'person_relation' => $relation,
            'items' => [['category' => 'EXTERIOR', 'label' => 'Đầu xe', 'condition' => 'OK']],
        ])->assertCreated()->json('id');
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$id}/submit")->assertOk();

        return $id;
    }

    private function requestException(int $id)
    {
        return $this->actingAs($this->advisor)->post("/api/handovers/{$id}/exception", [
            'reason' => 'Chủ xe mất quyền truy cập email cũ',
            'id_document' => UploadedFile::fake()->image('cccd.jpg'),
            'registration' => UploadedFile::fake()->image('dangky.jpg'),
        ], ['Accept' => 'application/json']);
    }

    public function test_owner_creates_authorization_once_from_email_link(): void
    {
        $url = $this->sendLink();
        $this->app['auth']->forgetGuards();

        $this->get($url)->assertOk()->assertSee('Ủy quyền người nhận xe');
        $this->assertSame(0, PickupAuthorization::query()->count());
        $this->post($url, ['full_name' => 'Trần Văn B', 'phone' => '0911222333', 'id_last4' => '1234'])->assertOk()->assertSee('Đã ghi nhận ủy quyền');

        $authorization = PickupAuthorization::query()->sole();
        $this->assertSame('1234', $authorization->id_last4);
        $this->assertSame(CustomerConfirmation::METHOD_EMAIL_LINK, CustomerConfirmation::query()->where('confirmable_type', PickupAuthorization::class)->sole()->method);

        $this->post($url, ['full_name' => 'Người khác', 'phone' => '0911222444', 'id_last4' => '9999'])->assertOk()->assertSee('Link không còn hiệu lực');
        $this->assertSame(1, PickupAuthorization::query()->count());
    }

    public function test_authorization_link_expires_and_rejects_tampering(): void
    {
        $url = $this->sendLink();
        $this->get(str_replace('nonce=', 'nonce=x', $url))->assertOk()->assertSee('Link không còn hiệu lực');
        $this->travel(25)->hours();
        $this->get($url)->assertOk()->assertSee('Link không còn hiệu lực');
    }

    public function test_advisor_requests_exception_and_admin_approves(): void
    {
        $id = $this->submittedHandover();
        $exceptionId = $this->requestException($id)->assertCreated()->assertJsonMissingPath('id_document_path')->json('id');
        $this->requestException($id)->assertUnprocessable();

        $this->actingAs($this->advisor)->postJson("/api/admin/handover-exceptions/{$exceptionId}/approve", ['note' => 'Đã đối chiếu'])->assertForbidden();
        $this->actingAs($this->advisor)->get("/api/admin/handover-exceptions/{$exceptionId}/files/id-document")->assertForbidden();
        $this->actingAs($this->admin)->get("/api/admin/handover-exceptions/{$exceptionId}/files/id-document")->assertOk();
        $this->actingAs($this->admin)->postJson("/api/admin/handover-exceptions/{$exceptionId}/approve", ['note' => 'Đã đối chiếu CCCD và đăng ký xe'])->assertOk()->assertJsonPath('status', HandoverException::APPROVED);

        $this->assertSame(VehicleHandover::STATUS_CONFIRMED, VehicleHandover::query()->find($id)->status);
        $this->assertSame(CustomerConfirmation::METHOD_ADMIN_EXCEPTION, CustomerConfirmation::query()->where('confirmable_id', $id)->where('confirmable_type', VehicleHandover::class)->sole()->method);
        $this->actingAs($this->admin)->postJson("/api/admin/handover-exceptions/{$exceptionId}/reject", ['note' => 'Đổi ý rồi'])->assertUnprocessable();
    }

    public function test_documents_are_purged_90_days_after_decision_and_record_is_kept(): void
    {
        $id = $this->submittedHandover();
        $exceptionId = $this->requestException($id)->assertCreated()->json('id');
        $paths = [HandoverException::query()->find($exceptionId)->id_document_path, HandoverException::query()->find($exceptionId)->registration_path];

        $this->travel(120)->days();
        $this->artisan('handover-exceptions:purge-documents')->assertSuccessful();
        Storage::disk('local')->assertExists($paths);

        $this->actingAs($this->admin)->postJson("/api/admin/handover-exceptions/{$exceptionId}/approve", ['note' => 'Đã đối chiếu giấy tờ'])->assertOk();
        $this->travel(89)->days();
        $this->artisan('handover-exceptions:purge-documents')->assertSuccessful();
        Storage::disk('local')->assertExists($paths);

        $this->travel(2)->days();
        $this->actingAs($this->admin)->get("/api/admin/handover-exceptions/{$exceptionId}/files/id-document")->assertNotFound();
        $this->artisan('handover-exceptions:purge-documents')->assertSuccessful();

        Storage::disk('local')->assertMissing($paths);
        $exception = HandoverException::query()->find($exceptionId);
        $this->assertNull($exception->id_document_path);
        $this->assertNotNull($exception->documents_purged_at);
        $this->assertSame(HandoverException::APPROVED, $exception->status);
        $this->assertSame(VehicleHandover::STATUS_CONFIRMED, VehicleHandover::query()->find($id)->status);
    }

    public function test_requester_cannot_approve_own_exception_and_rejection_keeps_handover_waiting(): void
    {
        $id = $this->submittedHandover();
        $own = HandoverException::query()->create([
            'vehicle_handover_id' => $id, 'requested_by_account_id' => $this->admin->id, 'reason' => 'Chủ xe mất email cũ',
            'id_document_path' => 'a.jpg', 'registration_path' => 'b.jpg', 'status' => HandoverException::PENDING,
        ]);
        $this->actingAs($this->admin)->postJson("/api/admin/handover-exceptions/{$own->id}/approve", ['note' => 'Tự duyệt'])->assertUnprocessable();
        $own->update(['status' => HandoverException::REJECTED]);

        $exceptionId = $this->requestException($id)->assertCreated()->json('id');
        $this->actingAs($this->admin)->postJson("/api/admin/handover-exceptions/{$exceptionId}/reject", ['note' => 'Giấy tờ không khớp'])->assertOk();
        $this->assertSame(VehicleHandover::STATUS_SUBMITTED, VehicleHandover::query()->find($id)->status);
    }
}
