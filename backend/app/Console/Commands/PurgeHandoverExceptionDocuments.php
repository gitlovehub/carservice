<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\HandoverException;
use App\Models\VehicleHandover;
use App\Services\MediaService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/** Xóa ảnh CCCD và đăng ký xe của yêu cầu ngoại lệ đã xử lý quá 90 ngày; giữ lại yêu cầu, người duyệt và nhật ký. */
class PurgeHandoverExceptionDocuments extends Command
{
    protected $signature = 'handover-exceptions:purge-documents';

    protected $description = 'Xóa ảnh giấy tờ của yêu cầu ngoại lệ đã xử lý quá 90 ngày';

    public function handle(): int
    {
        $disk = Storage::disk(MediaService::DISK);
        $purged = 0;
        $failed = 0;

        HandoverException::query()
            ->whereNull('documents_purged_at')
            ->where('status', '!=', HandoverException::PENDING)
            ->where('decided_at', '<=', now()->subDays(HandoverException::DOCUMENT_RETENTION_DAYS))
            ->chunkById(100, function ($exceptions) use ($disk, &$purged, &$failed): void {
                foreach ($exceptions as $exception) {
                    $paths = array_values(array_filter([$exception->id_document_path, $exception->registration_path]));
                    $remaining = array_filter($paths, fn (string $path) => $disk->exists($path) && ! $disk->delete($path));
                    if ($remaining) {
                        // Giữ đường dẫn để lần chạy sau xóa lại, không đánh dấu đã xóa khi file còn tồn tại.
                        $failed++;

                        continue;
                    }
                    $exception->forceFill(['id_document_path' => null, 'registration_path' => null, 'documents_purged_at' => now()])->save();
                    AuditLog::query()->create([
                        'action' => 'handover_exception.documents_purged',
                        'auditable_type' => VehicleHandover::class,
                        'auditable_id' => $exception->vehicle_handover_id,
                        'new_values' => ['exception_id' => $exception->id],
                        'reason' => 'Tự xóa ảnh giấy tờ sau '.HandoverException::DOCUMENT_RETENTION_DAYS.' ngày',
                    ]);
                    $purged++;
                }
            });

        $this->info("Đã xóa ảnh của {$purged} yêu cầu, lỗi {$failed} yêu cầu.");

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
