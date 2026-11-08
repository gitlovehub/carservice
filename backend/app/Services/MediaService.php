<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Inspection;
use App\Models\MediaAttachment;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\VehicleHandover;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Ảnh bằng chứng (D-007): disk private, SHA-256, JPEG/PNG/WebP, ≤ 10 MB, ≤ 30 ảnh / đối tượng.
 * Mọi đối tượng gắn ảnh đều quy về một phiếu sửa chữa để kiểm quyền.
 */
class MediaService
{
    public const DISK = 'local';

    /** Alias công khai trên API → model. Chỉ các đối tượng trong danh sách mới được gắn ảnh. */
    public const ATTACHABLE_TYPES = [
        'repair_order' => RepairOrder::class,
        'quotation' => Quotation::class,
        'inspection' => Inspection::class,
        'handover' => VehicleHandover::class,
    ];

    public function resolveAttachable(string $alias, int $id): Model
    {
        $class = self::ATTACHABLE_TYPES[$alias] ?? null;
        if ($class === null) {
            throw ValidationException::withMessages(['attachable_type' => 'Loại đối tượng không hỗ trợ gắn ảnh.']);
        }

        return $class::query()->findOrFail($id);
    }

    public static function aliasOf(string $class): ?string
    {
        $alias = array_search($class, self::ATTACHABLE_TYPES, true);

        return $alias === false ? null : $alias;
    }

    public function repairOrderOf(Model $attachable): RepairOrder
    {
        return match (true) {
            $attachable instanceof RepairOrder => $attachable,
            $attachable instanceof Quotation, $attachable instanceof Inspection, $attachable instanceof VehicleHandover => $attachable->repairOrder()->firstOrFail(),
            default => throw new \InvalidArgumentException('Unsupported attachable '.$attachable::class),
        };
    }

    /**
     * @param  array{caption?: ?string, position_code?: ?string, taken_at?: ?string}  $meta
     */
    public function store(UploadedFile $file, Model $attachable, Account $uploader, array $meta = []): MediaAttachment
    {
        $this->assertNotConfirmed($attachable);

        $mime = (string) $file->getMimeType();
        if (! in_array($mime, MediaAttachment::ALLOWED_MIMES, true)) {
            throw ValidationException::withMessages(['file' => 'Chỉ nhận ảnh JPEG, PNG hoặc WebP.']);
        }
        if ($file->getSize() > MediaAttachment::MAX_BYTES) {
            throw ValidationException::withMessages(['file' => 'Ảnh vượt quá 10 MB.']);
        }

        return DB::transaction(function () use ($file, $attachable, $uploader, $meta, $mime): MediaAttachment {
            $count = MediaAttachment::query()
                ->where('attachable_type', $attachable::class)
                ->where('attachable_id', $attachable->getKey())
                ->lockForUpdate()
                ->count();
            if ($count >= MediaAttachment::MAX_PER_OWNER) {
                throw ValidationException::withMessages(['file' => 'Đã đạt tối đa '.MediaAttachment::MAX_PER_OWNER.' ảnh cho chứng từ này.']);
            }

            $extension = match ($mime) {
                'image/png' => 'png',
                'image/webp' => 'webp',
                default => 'jpg',
            };
            $path = $file->storeAs('evidence/'.now()->format('Y/m'), Str::uuid().'.'.$extension, self::DISK);
            if ($path === false) {
                throw new \RuntimeException('Không lưu được ảnh.');
            }

            return MediaAttachment::query()->create([
                'attachable_type' => $attachable::class,
                'attachable_id' => $attachable->getKey(),
                'disk' => self::DISK,
                'path' => $path,
                'original_name' => Str::limit($file->getClientOriginalName(), 250, ''),
                'mime' => $mime,
                'size_bytes' => (int) $file->getSize(),
                'sha256' => hash_file('sha256', $file->getRealPath()),
                'caption' => $meta['caption'] ?? null,
                'position_code' => $meta['position_code'] ?? null,
                'taken_at' => $meta['taken_at'] ?? null,
                'uploaded_by_account_id' => $uploader->id,
            ]);
        });
    }

    /** Chứng từ khách đã xác nhận thì bị khóa: không thêm ảnh sau khi xác nhận. */
    private function assertNotConfirmed(Model $attachable): void
    {
        // Biên bản đã gửi khách thì ảnh đã nằm trong snapshot: không thêm nữa.
        if ($attachable instanceof VehicleHandover && ! $attachable->isEditable()) {
            throw ValidationException::withMessages(['attachable_id' => 'Biên bản đã khóa, không thể thêm ảnh.']);
        }
        if (method_exists($attachable, 'confirmations') && $attachable->confirmations()->exists()) {
            throw ValidationException::withMessages(['attachable_id' => 'Chứng từ đã được khách xác nhận, không thể thêm ảnh.']);
        }
    }

    public function exists(MediaAttachment $media): bool
    {
        return Storage::disk($media->disk)->exists($media->path);
    }
}
