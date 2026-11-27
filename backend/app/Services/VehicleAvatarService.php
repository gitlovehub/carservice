<?php

namespace App\Services;

use App\Models\Vehicle;
use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Ảnh đại diện xe: thư mục riêng, độc lập với ảnh minh chứng tiếp nhận / bàn giao (MediaService).
 * Ảnh được mã hoá lại trên server để bỏ metadata (GPS, thiết bị) và nội dung lạ nhúng trong file.
 */
class VehicleAvatarService
{
    public const DISK = 'local';

    public const DIRECTORY = 'vehicle-avatars';

    public const MAX_KILOBYTES = 5120;

    private const MAX_EDGE = 1200;

    private const MAX_PIXELS = 24_000_000;

    private const DECODE_MEMORY = 256 * 1024 * 1024;

    private const INVALID_IMAGE = 'Tệp không phải ảnh JPG, PNG hoặc WebP hợp lệ.';

    /** Lưu ảnh mới trước, đổi bản ghi trong transaction, xoá ảnh cũ sau cùng để lỗi giữa chừng không làm mất ảnh đang dùng. */
    public function replace(Vehicle $vehicle, UploadedFile $file): Vehicle
    {
        [$bytes, $extension] = $this->encode($file);
        $path = self::DIRECTORY.'/'.Str::uuid().'.'.$extension;
        $disk = Storage::disk(self::DISK);
        if (! $disk->put($path, $bytes)) {
            throw new RuntimeException('Không ghi được ảnh đại diện xe.');
        }

        try {
            $previous = $this->swap($vehicle, $path);
        } catch (Throwable $error) {
            $disk->delete($path);
            throw $error;
        }
        $this->deleteFile($previous);

        return $vehicle->refresh();
    }

    public function remove(Vehicle $vehicle): Vehicle
    {
        $this->deleteFile($this->swap($vehicle, null));

        return $vehicle->refresh();
    }

    public function response(string $file): StreamedResponse
    {
        $path = self::DIRECTORY.'/'.$file;
        $disk = Storage::disk(self::DISK);
        abort_unless($disk->exists($path), 404, 'Không tìm thấy ảnh xe.');

        return $disk->response($path, null, [
            'Content-Type' => str_ends_with($file, '.webp') ? 'image/webp' : 'image/jpeg',
            // Mỗi lần đổi ảnh có tên file mới nên được phép lưu đệm lâu.
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function swap(Vehicle $vehicle, ?string $path): ?string
    {
        return DB::transaction(function () use ($vehicle, $path): ?string {
            $locked = Vehicle::query()->lockForUpdate()->findOrFail($vehicle->id);
            $previous = $locked->avatar_url;
            $locked->forceFill(['avatar_url' => $path])->save();

            return $previous;
        });
    }

    private function deleteFile(?string $path): void
    {
        if ($path !== null && str_starts_with($path, self::DIRECTORY.'/')) {
            Storage::disk(self::DISK)->delete($path);
        }
    }

    /** @return array{0: string, 1: string} */
    private function encode(UploadedFile $file): array
    {
        $source = $file->getRealPath();
        $info = $source === false ? false : @getimagesize($source);
        if ($info === false || ! in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
            $this->reject(self::INVALID_IMAGE);
        }
        if ($info[0] * $info[1] > self::MAX_PIXELS) {
            $this->reject('Ảnh có độ phân giải quá lớn. Vui lòng chọn ảnh dưới 24 megapixel.');
        }

        $limit = ini_parse_quantity((string) ini_get('memory_limit'));
        if ($limit > 0 && $limit < self::DECODE_MEMORY) {
            ini_set('memory_limit', (string) self::DECODE_MEMORY);
        }

        $image = match ($info[2]) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($source),
            IMAGETYPE_PNG => @imagecreatefrompng($source),
            default => @imagecreatefromwebp($source),
        };
        if (! $image instanceof GdImage) {
            $this->reject(self::INVALID_IMAGE);
        }
        if ($info[2] === IMAGETYPE_JPEG) {
            $image = $this->applyOrientation($image, $source);
        }

        return $this->output($this->fit($image));
    }

    /** Ảnh chụp điện thoại lưu hướng xoay trong EXIF; phải xoay thật vì metadata sẽ bị bỏ. */
    private function applyOrientation(GdImage $image, string $source): GdImage
    {
        $orientation = function_exists('exif_read_data') ? (int) (@exif_read_data($source)['Orientation'] ?? 1) : 1;
        if (in_array($orientation, [2, 4, 5, 7], true)) {
            imageflip($image, IMG_FLIP_HORIZONTAL);
        }
        $angle = match ($orientation) {
            3, 4 => 180,
            5, 6 => -90,
            7, 8 => 90,
            default => 0,
        };

        return $angle === 0 ? $image : (imagerotate($image, $angle, 0) ?: $image);
    }

    private function fit(GdImage $image): GdImage
    {
        $width = imagesx($image);
        $height = imagesy($image);
        $ratio = min(1, self::MAX_EDGE / max($width, $height));
        $targetWidth = max(1, (int) round($width * $ratio));
        $targetHeight = max(1, (int) round($height * $ratio));

        $canvas = imagecreatetruecolor($targetWidth, $targetHeight);
        // Nền trắng cho ảnh PNG/WebP trong suốt: ảnh đại diện luôn là ảnh đặc.
        imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
        imagecopyresampled($canvas, $image, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        return $canvas;
    }

    /** @return array{0: string, 1: string} */
    private function output(GdImage $image): array
    {
        $webp = function_exists('imagewebp');
        ob_start();
        $written = $webp ? imagewebp($image, null, 82) : imagejpeg($image, null, 85);
        $bytes = (string) ob_get_clean();
        if (! $written || $bytes === '') {
            throw new RuntimeException('Không mã hoá được ảnh đại diện xe.');
        }

        return [$bytes, $webp ? 'webp' : 'jpg'];
    }

    private function reject(string $message): never
    {
        throw ValidationException::withMessages(['image' => $message]);
    }
}
