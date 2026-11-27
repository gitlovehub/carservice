<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\MediaAttachment;
use App\Models\Vehicle;
use App\Services\VehicleAvatarService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VehicleAvatarTest extends TestCase
{
    use RefreshDatabase;

    private Account $customerAccount;

    private Vehicle $vehicle;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake(VehicleAvatarService::DISK);
        $this->customerAccount = Account::factory()->create(['role' => Account::ROLE_CUSTOMER]);
        $customer = Customer::factory()->create(['account_id' => $this->customerAccount->id]);
        $this->vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);
    }

    private function actAs(string $role): void
    {
        Sanctum::actingAs(Account::factory()->create(['role' => $role]));
    }

    private function upload(UploadedFile $file): TestResponse
    {
        return $this->postJson("/api/vehicles/{$this->vehicle->id}/avatar", ['image' => $file]);
    }

    public function test_vehicle_without_avatar_stays_valid_for_customer(): void
    {
        Sanctum::actingAs($this->customerAccount);

        $this->getJson('/api/me/vehicles')->assertOk()->assertJsonPath('data.0.avatar_url', null);
    }

    public function test_advisor_and_admin_can_upload_replace_and_remove_avatar(): void
    {
        foreach ([Account::ROLE_ADVISOR, Account::ROLE_ADMIN] as $role) {
            $this->actAs($role);

            $first = $this->upload(UploadedFile::fake()->image('xe.jpg', 1600, 900))->assertOk()->json('data.avatar_url');
            Storage::disk(VehicleAvatarService::DISK)->assertExists($first);
            $this->assertStringStartsWith(VehicleAvatarService::DIRECTORY.'/', $first);

            $second = $this->upload(UploadedFile::fake()->image('xe.png', 400, 300))->assertOk()->json('data.avatar_url');
            $this->assertNotSame($first, $second);
            Storage::disk(VehicleAvatarService::DISK)->assertMissing($first);
            Storage::disk(VehicleAvatarService::DISK)->assertExists($second);

            $this->deleteJson("/api/vehicles/{$this->vehicle->id}/avatar")->assertOk()->assertJsonPath('data.avatar_url', null);
            Storage::disk(VehicleAvatarService::DISK)->assertMissing($second);
            $this->assertNull($this->vehicle->fresh()->avatar_url);
        }
    }

    public function test_uploaded_image_is_resized_and_served_without_login(): void
    {
        $this->actAs(Account::ROLE_ADVISOR);
        $path = $this->upload(UploadedFile::fake()->image('xe.webp', 2400, 1200))->assertOk()->json('data.avatar_url');

        $size = getimagesizefromstring(Storage::disk(VehicleAvatarService::DISK)->get($path));
        $this->assertSame([1200, 600], [$size[0], $size[1]]);

        $this->app['auth']->forgetGuards();
        $this->get('/api/vehicle-avatars/'.basename($path))->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->get('/api/vehicle-avatars/..%2F.env')->assertNotFound();
    }

    public function test_customer_and_technician_cannot_change_avatar(): void
    {
        $this->vehicle->forceFill(['avatar_url' => 'vehicle-avatars/giu-nguyen.webp'])->save();

        foreach ([$this->customerAccount, Account::factory()->create(['role' => Account::ROLE_TECHNICIAN])] as $account) {
            Sanctum::actingAs($account);
            $this->upload(UploadedFile::fake()->image('xe.jpg'))->assertForbidden();
            $this->deleteJson("/api/vehicles/{$this->vehicle->id}/avatar")->assertForbidden();
        }

        Sanctum::actingAs($this->customerAccount);
        $this->patchJson("/api/me/vehicles/{$this->vehicle->id}", ['avatar_url' => 'vehicle-avatars/gia-mao.webp', 'note' => 'Ghi chú'])->assertOk();
        $this->assertSame('vehicle-avatars/giu-nguyen.webp', $this->vehicle->fresh()->avatar_url);
    }

    public function test_rejects_wrong_format_oversized_and_fake_image(): void
    {
        $this->actAs(Account::ROLE_ADMIN);

        $this->upload(UploadedFile::fake()->create('xe.pdf', 100, 'application/pdf'))->assertUnprocessable()->assertJsonValidationErrors('image');
        $this->upload(UploadedFile::fake()->image('xe.gif'))->assertUnprocessable()->assertJsonValidationErrors('image');
        $this->upload(UploadedFile::fake()->image('xe.jpg')->size(VehicleAvatarService::MAX_KILOBYTES + 1))->assertUnprocessable()->assertJsonValidationErrors('image');
        $this->upload(UploadedFile::fake()->createWithContent('xe.jpg', '<?php echo 1;'))->assertUnprocessable()->assertJsonValidationErrors('image');

        $this->assertNull($this->vehicle->fresh()->avatar_url);
        $this->assertSame([], Storage::disk(VehicleAvatarService::DISK)->allFiles(VehicleAvatarService::DIRECTORY));
    }

    public function test_avatar_is_independent_from_evidence_media(): void
    {
        $this->actAs(Account::ROLE_ADVISOR);
        $this->upload(UploadedFile::fake()->image('xe.jpg'))->assertOk();

        $this->assertSame(0, MediaAttachment::query()->count());
    }
}
