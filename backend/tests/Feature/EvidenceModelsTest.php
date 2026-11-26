<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\ConfirmationOtp;
use App\Models\Customer;
use App\Models\CustomerConfirmation;
use App\Models\Employee;
use App\Models\MediaAttachment;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Tests\TestCase;

/** P1A-02 — model bằng chứng: quan hệ, ẩn dữ liệu nhạy cảm, xác nhận chỉ thêm. */
class EvidenceModelsTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Customer $customer;

    private Quotation $quotation;

    protected function setUp(): void
    {
        parent::setUp();

        $this->advisor = Account::factory()->advisor()->create();
        $employee = Employee::factory()->create(['account_id' => $this->advisor->id]);
        $this->customer = Customer::factory()->create(['account_id' => Account::factory()->create()->id]);
        $order = RepairOrder::query()->create([
            'repair_order_code' => 'RO-EVIDENCE',
            'customer_id' => $this->customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $this->customer->id])->id,
            'advisor_id' => $employee->id,
            'status' => RepairOrder::WAITING_APPROVAL,
            'received_at' => now(),
        ]);
        $this->quotation = Quotation::query()->create([
            'quotation_code' => 'QT-EVIDENCE', 'repair_order_id' => $order->id, 'advisor_id' => $employee->id,
            'status' => Quotation::SENT,
        ]);
    }

    private function otp(array $overrides = []): ConfirmationOtp
    {
        return ConfirmationOtp::query()->create([
            'customer_id' => $this->customer->id,
            'purpose' => ConfirmationOtp::PURPOSE_QUOTATION_RESPONSE,
            'target_type' => Quotation::class,
            'target_id' => $this->quotation->id,
            'content_sha256' => str_repeat('a', 64),
            'code_hash' => bcrypt('123456'),
            'sent_to_email' => 'owner@example.test',
            'expires_at' => now()->addMinutes(ConfirmationOtp::TTL_MINUTES),
            'requested_by_account_id' => $this->advisor->id,
            ...$overrides,
        ]);
    }

    public function test_media_attachment_belongs_to_owner_and_hides_storage_location(): void
    {
        $media = MediaAttachment::query()->create([
            'attachable_type' => Quotation::class, 'attachable_id' => $this->quotation->id,
            'path' => 'evidence/x.jpg', 'mime' => 'image/jpeg', 'size_bytes' => 1024,
            'sha256' => str_repeat('b', 64), 'uploaded_by_account_id' => $this->advisor->id,
        ]);

        $this->assertTrue($media->attachable->is($this->quotation));
        $this->assertTrue($media->uploader->is($this->advisor));
        $this->assertArrayNotHasKey('path', $media->toArray());
        $this->assertArrayNotHasKey('disk', $media->toArray());
    }

    public function test_otp_usability_depends_on_expiry_attempts_and_use(): void
    {
        $this->assertTrue($this->otp()->isUsable());
        $this->assertFalse($this->otp(['expires_at' => now()->subMinute()])->isUsable());
        $this->assertFalse($this->otp(['attempts' => ConfirmationOtp::MAX_ATTEMPTS])->isUsable());
        $this->assertFalse($this->otp(['used_at' => now()])->isUsable());
        $this->assertArrayNotHasKey('code_hash', $this->otp()->toArray());
    }

    public function test_customer_confirmation_links_to_quotation_and_is_append_only(): void
    {
        $otp = $this->otp();
        $confirmation = CustomerConfirmation::query()->create([
            'confirmable_type' => Quotation::class, 'confirmable_id' => $this->quotation->id,
            'customer_id' => $this->customer->id, 'method' => CustomerConfirmation::METHOD_EMAIL_OTP,
            'confirmation_otp_id' => $otp->id, 'content_sha256' => $otp->content_sha256,
            'witness_employee_id' => $this->advisor->employee->id, 'confirmed_at' => now(),
        ]);

        $this->assertTrue($this->quotation->confirmations()->first()->is($confirmation));
        $this->assertTrue($confirmation->otp->is($otp));
        $this->assertTrue($confirmation->witness->is($this->advisor->employee));

        try {
            $confirmation->update(['comment' => 'sửa sau']);
            $this->fail('Update must be rejected');
        } catch (LogicException) {
        }
        try {
            $confirmation->delete();
            $this->fail('Delete must be rejected');
        } catch (LogicException) {
        }
        $this->assertDatabaseHas('customer_confirmations', ['id' => $confirmation->id, 'comment' => null]);
    }
}
