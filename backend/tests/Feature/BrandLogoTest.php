<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\VehicleBrand;
use App\Services\BrandLogoProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Logo hãng: dán link ảnh → tách nền + cắt gọn PNG 256² → lưu vào hãng → phục vụ công khai. */
class BrandLogoTest extends TestCase
{
    use RefreshDatabase;

    /** Ảnh logo giả: hình vuông đỏ (có lỗ trắng ở giữa) trên nền trắng — hoặc nền trong suốt. */
    private function sampleImage(bool $transparent = false): string
    {
        $img = imagecreatetruecolor(200, 120);
        imagealphablending($img, false);
        imagesavealpha($img, true);
        imagefill($img, 0, 0, $transparent ? imagecolorallocatealpha($img, 0, 0, 0, 127) : imagecolorallocate($img, 255, 255, 255));
        imagefilledrectangle($img, 60, 30, 140, 90, imagecolorallocate($img, 200, 20, 30));
        imagefilledrectangle($img, 90, 50, 110, 70, imagecolorallocate($img, 255, 255, 255)); // lỗ trắng bên trong logo
        ob_start();
        imagepng($img);

        return (string) ob_get_clean();
    }

    /** [alpha GD 0..127] tại điểm (x, y) của PNG kết quả. */
    private function alphaAt(string $png, int $x, int $y): int
    {
        return (imagecolorat(imagecreatefromstring($png), $x, $y) >> 24) & 0x7F;
    }

    public function test_white_background_is_removed_but_white_inside_logo_is_kept(): void
    {
        $png = app(BrandLogoProcessor::class)->process($this->sampleImage());

        [$w, $h] = getimagesizefromstring($png);
        $this->assertSame([256, 256], [$w, $h]);
        $this->assertSame(127, $this->alphaAt($png, 2, 2), 'Góc (nền trắng) phải trong suốt');
        $this->assertSame(0, $this->alphaAt($png, 128, 128), 'Lỗ trắng giữa logo vẫn giữ nguyên (đục)');
        $this->assertSame(0, $this->alphaAt($png, 128, 70), 'Thân logo đục');
    }

    public function test_transparent_png_is_only_cropped(): void
    {
        $png = app(BrandLogoProcessor::class)->process($this->sampleImage(transparent: true));

        $this->assertSame(127, $this->alphaAt($png, 2, 2));
        // Logo 80×60 được phóng vừa khung 248px chiều ngang → cạnh trái logo sát lề 4px.
        $this->assertSame(0, $this->alphaAt($png, 6, 128));
    }

    public function test_admin_previews_from_url_then_saves_logo_served_publicly(): void
    {
        Sanctum::actingAs(Account::factory()->admin()->create());
        Http::fake(['93.184.216.34/*' => Http::response($this->sampleImage(), 200, ['Content-Type' => 'image/png'])]);

        $preview = $this->postJson('/api/admin/vehicle-brands/logo-preview', ['url' => 'http://93.184.216.34/logo.png'])
            ->assertOk()->json('data.logo_png');
        $this->assertNotEmpty($preview);

        $id = $this->postJson('/api/admin/vehicle-brands', ['name' => 'Hãng Mới', 'logo_png' => $preview])
            ->assertCreated()->assertJsonMissingPath('data.logo_png')->json('data.id');
        $version = VehicleBrand::query()->findOrFail($id)->logo_version;
        $this->assertNotNull($version);

        $this->getJson('/api/vehicle-catalog/brand-logos')->assertOk()
            ->assertJsonPath('data.0.name', 'Hãng Mới')->assertJsonPath('data.0.logo_version', $version);
        $this->get("/api/vehicle-catalog/brands/{$id}/logo")->assertOk()->assertHeader('Content-Type', 'image/png');

        // Sửa hãng không gửi logo (vd. bật/tắt hiển thị) → giữ nguyên logo; không có cách bỏ logo.
        $this->patchJson("/api/admin/vehicle-brands/{$id}", ['status' => 'INACTIVE', 'remove_logo' => true])->assertOk();
        $this->get("/api/vehicle-catalog/brands/{$id}/logo")->assertOk();
        $this->getJson('/api/vehicle-catalog/brand-logos')->assertJsonCount(1, 'data'); // hãng ẩn vẫn có logo cho xe cũ
    }

    public function test_new_brand_requires_logo(): void
    {
        Sanctum::actingAs(Account::factory()->admin()->create());
        $this->postJson('/api/admin/vehicle-brands', ['name' => 'Không Logo'])->assertUnprocessable()->assertJsonValidationErrors('logo_png');
        $this->assertDatabaseMissing('vehicle_brands', ['name' => 'Không Logo']);
    }

    public function test_admin_can_upload_image_file_instead_of_link(): void
    {
        Sanctum::actingAs(Account::factory()->admin()->create());
        $file = UploadedFile::fake()->createWithContent('logo.png', $this->sampleImage());

        $png = base64_decode($this->post('/api/admin/vehicle-brands/logo-preview', ['file' => $file], ['Accept' => 'application/json'])
            ->assertOk()->json('data.logo_png'));
        $this->assertSame(127, $this->alphaAt($png, 2, 2), 'Nền trắng của file tải lên cũng được tách');

        $this->post('/api/admin/vehicle-brands/logo-preview', ['file' => UploadedFile::fake()->create('note.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->postJson('/api/admin/vehicle-brands/logo-preview', [])->assertUnprocessable();
    }

    public function test_rejects_internal_addresses_non_images_and_forged_logo(): void
    {
        Sanctum::actingAs(Account::factory()->admin()->create());
        Http::fake(['93.184.216.34/*' => Http::response('<html>không phải ảnh</html>', 200)]);

        foreach (['http://127.0.0.1/logo.png', 'http://192.168.1.10/logo.png', 'file:///etc/passwd', 'ftp://93.184.216.34/a.png'] as $url) {
            $this->postJson('/api/admin/vehicle-brands/logo-preview', ['url' => $url])->assertUnprocessable()->assertJsonValidationErrors('logo_url');
        }
        $this->postJson('/api/admin/vehicle-brands/logo-preview', ['url' => 'http://93.184.216.34/page'])
            ->assertUnprocessable()->assertJsonValidationErrors('logo_url');

        // Không nhận ảnh tự gửi không qua bước xử lý (sai kích thước / không phải PNG).
        $this->postJson('/api/admin/vehicle-brands', ['name' => 'Giả', 'logo_png' => base64_encode('xyz')])
            ->assertUnprocessable()->assertJsonValidationErrors('logo_png');
    }

    public function test_only_admin_can_preview(): void
    {
        Sanctum::actingAs(Account::factory()->create());
        $this->postJson('/api/admin/vehicle-brands/logo-preview', ['url' => 'http://93.184.216.34/logo.png'])->assertForbidden();
    }
}
