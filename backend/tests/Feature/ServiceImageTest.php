<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Ảnh minh họa dịch vụ: chỉ admin tải/xóa; trang Dịch vụ đọc `image_url` (null = chưa có ảnh).
 */
class ServiceImageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_service_without_image_has_null_image_url_and_no_public_image(): void
    {
        $service = Service::factory()->create(['status' => 'ACTIVE', 'is_visible' => true]);

        $this->getJson('/api/services')->assertOk()->assertJsonPath('0.image_url', null);
        $this->get("/api/service-images/{$service->id}")->assertNotFound();
    }

    public function test_admin_uploads_replaces_and_deletes_service_image(): void
    {
        Sanctum::actingAs(Account::factory()->admin()->create());
        $service = Service::factory()->create(['status' => 'ACTIVE', 'is_visible' => true]);

        $first = $this->post("/api/admin/services/{$service->id}/image", ['image' => UploadedFile::fake()->image('oil.jpg', 800, 600)])
            ->assertOk()
            ->assertJsonMissingPath('data.image_path');
        $this->assertStringStartsWith("/api/service-images/{$service->id}", $first->json('data.image_url'));
        $firstPath = $service->fresh()->image_path;
        Storage::disk('public')->assertExists($firstPath);

        // Trang Dịch vụ (công khai) nhận được ảnh và route phát ảnh hoạt động.
        $this->getJson('/api/services')->assertJsonPath('0.image_url', $first->json('data.image_url'));
        $this->get("/api/service-images/{$service->id}")->assertOk();

        // Thay ảnh: file cũ bị xóa.
        $this->post("/api/admin/services/{$service->id}/image", ['image' => UploadedFile::fake()->image('new.png', 800, 600)])->assertOk();
        Storage::disk('public')->assertMissing($firstPath);
        $secondPath = $service->fresh()->image_path;

        $this->deleteJson("/api/admin/services/{$service->id}/image")
            ->assertOk()
            ->assertJsonPath('data.image_url', null);
        Storage::disk('public')->assertMissing($secondPath);
    }

    public function test_upload_rejects_non_images_and_non_admins(): void
    {
        $service = Service::factory()->create();

        Sanctum::actingAs(Account::factory()->create(['role' => Account::ROLE_ADVISOR]));
        $this->post("/api/admin/services/{$service->id}/image", ['image' => UploadedFile::fake()->image('a.jpg')], ['Accept' => 'application/json'])
            ->assertForbidden();

        Sanctum::actingAs(Account::factory()->admin()->create());
        $this->post("/api/admin/services/{$service->id}/image", ['image' => UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertJsonValidationErrors('image');
        $this->assertNull($service->fresh()->image_path);
    }
}
