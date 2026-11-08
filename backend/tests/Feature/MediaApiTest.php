<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\CustomerConfirmation;
use App\Models\Employee;
use App\Models\MediaAttachment;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** P1B — ảnh bằng chứng: lưu private, kiểm loại/dung lượng/số lượng, kiểm quyền xem. */
class MediaApiTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $owner;

    private Account $otherCustomer;

    private RepairOrder $order;

    private Quotation $quotation;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->advisor = Account::factory()->advisor()->create();
        $employee = Employee::factory()->create(['account_id' => $this->advisor->id]);
        $this->owner = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $this->owner->id]);
        $this->otherCustomer = Account::factory()->create();
        Customer::factory()->create(['account_id' => $this->otherCustomer->id]);

        $this->order = RepairOrder::query()->create([
            'repair_order_code' => 'RO-MEDIA',
            'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'advisor_id' => $employee->id,
            'status' => RepairOrder::INSPECTING,
            'received_at' => now(),
        ]);
        $this->quotation = Quotation::query()->create([
            'quotation_code' => 'QT-MEDIA', 'repair_order_id' => $this->order->id, 'advisor_id' => $employee->id,
        ]);
    }

    private function upload(array $overrides = [], ?Account $as = null)
    {
        return $this->actingAs($as ?? $this->advisor)->post('/api/media', [
            'file' => UploadedFile::fake()->create('front.jpg', 200, 'image/jpeg'),
            'attachable_type' => 'repair_order',
            'attachable_id' => $this->order->id,
            'position_code' => 'FRONT',
            ...$overrides,
        ], ['Accept' => 'application/json']);
    }

    public function test_advisor_uploads_photo_to_private_disk_with_hash(): void
    {
        $response = $this->upload()->assertCreated()
            ->assertJsonPath('attachable_type', 'repair_order')
            ->assertJsonPath('position_code', 'FRONT')
            ->assertJsonMissingPath('path');

        $media = MediaAttachment::query()->findOrFail($response->json('id'));
        Storage::disk('local')->assertExists($media->path);
        $this->assertStringStartsWith('evidence/', $media->path);
        $this->assertSame(64, strlen($media->sha256));
        $this->assertSame(hash('sha256', Storage::disk('local')->get($media->path)), $media->sha256);
    }

    public function test_rejects_wrong_type_oversize_unknown_target_and_bad_position(): void
    {
        $this->upload(['file' => UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf')])->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->upload(['file' => UploadedFile::fake()->create('big.jpg', 10241, 'image/jpeg')])->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->upload(['attachable_type' => 'account'])->assertUnprocessable()->assertJsonValidationErrors('attachable_type');
        $this->upload(['position_code' => 'front; drop'])->assertUnprocessable()->assertJsonValidationErrors('position_code');
        $this->upload(['attachable_id' => 999999])->assertNotFound();
        $this->assertSame(0, MediaAttachment::query()->count());
    }

    public function test_limits_photos_per_document(): void
    {
        for ($i = 0; $i < MediaAttachment::MAX_PER_OWNER; $i++) {
            MediaAttachment::query()->create([
                'attachable_type' => RepairOrder::class, 'attachable_id' => $this->order->id,
                'path' => "evidence/seed-$i.jpg", 'mime' => 'image/jpeg', 'size_bytes' => 1,
                'sha256' => str_repeat('c', 64), 'uploaded_by_account_id' => $this->advisor->id,
            ]);
        }

        $this->upload()->assertUnprocessable()->assertJsonValidationErrors('file');
    }

    public function test_customer_cannot_upload(): void
    {
        $this->upload([], $this->owner)->assertForbidden();
    }

    public function test_cannot_attach_photos_after_customer_confirmed_document(): void
    {
        CustomerConfirmation::query()->create([
            'confirmable_type' => Quotation::class, 'confirmable_id' => $this->quotation->id,
            'customer_id' => $this->order->customer_id, 'method' => CustomerConfirmation::METHOD_ACCOUNT,
            'content_sha256' => str_repeat('d', 64), 'confirmed_at' => now(),
        ]);

        $this->upload(['attachable_type' => 'quotation', 'attachable_id' => $this->quotation->id])
            ->assertUnprocessable()->assertJsonValidationErrors('attachable_id');
    }

    public function test_owner_and_staff_can_view_but_other_customer_cannot(): void
    {
        $id = $this->upload()->json('id');

        $this->actingAs($this->owner)->get("/api/media/{$id}")->assertOk()->assertHeader('Content-Type', 'image/jpeg')->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->actingAs($this->advisor)->get("/api/media/{$id}")->assertOk();
        $this->actingAs($this->otherCustomer)->get("/api/media/{$id}")->assertForbidden();

        $query = "/api/media?attachable_type=repair_order&attachable_id={$this->order->id}";
        $this->actingAs($this->owner)->getJson($query)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.url', "/api/media/{$id}");
        $this->actingAs($this->otherCustomer)->getJson($query)->assertForbidden();
    }

    public function test_guest_cannot_view(): void
    {
        $id = $this->upload()->json('id');
        auth()->forgetGuards();

        $this->getJson("/api/media/{$id}")->assertUnauthorized();
    }
}
