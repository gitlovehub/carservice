<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MediaAttachment;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Ảnh bằng chứng. Upload: cố vấn. Xem: ai xem được phiếu sửa chữa liên quan
 * (cố vấn, admin, KTV được giao, khách chủ phiếu) — RepairOrderPolicy::view.
 */
class MediaController extends Controller
{
    public function __construct(private readonly MediaService $media) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'attachable_type' => ['required', 'string', Rule::in(array_keys(MediaService::ATTACHABLE_TYPES))],
            'attachable_id' => ['required', 'integer'],
        ]);
        $attachable = $this->media->resolveAttachable($data['attachable_type'], (int) $data['attachable_id']);
        abort_unless(Gate::allows('view', $this->media->repairOrderOf($attachable)), 403);

        $items = MediaAttachment::query()
            ->where('attachable_type', $attachable::class)
            ->where('attachable_id', $attachable->getKey())
            ->orderBy('id')
            ->get();

        return response()->json(['data' => $items->map(fn (MediaAttachment $item) => $this->present($item))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'mimetypes:'.implode(',', MediaAttachment::ALLOWED_MIMES), 'max:'.(MediaAttachment::MAX_BYTES / 1024)],
            'attachable_type' => ['required', 'string', Rule::in(array_keys(MediaService::ATTACHABLE_TYPES))],
            'attachable_id' => ['required', 'integer'],
            'caption' => ['nullable', 'string', 'max:255'],
            'position_code' => ['nullable', 'string', 'max:50', 'regex:/^[A-Z0-9_]+$/'],
            'taken_at' => ['nullable', 'date', 'before_or_equal:now'],
        ]);
        $attachable = $this->media->resolveAttachable($data['attachable_type'], (int) $data['attachable_id']);
        abort_unless(Gate::allows('update', $this->media->repairOrderOf($attachable)), 403);

        $item = $this->media->store($request->file('file'), $attachable, $request->user(), $data);

        return response()->json($this->present($item), 201);
    }

    public function show(MediaAttachment $media): StreamedResponse
    {
        abort_unless($media->attachable !== null, 404);
        abort_unless(Gate::allows('view', $this->media->repairOrderOf($media->attachable)), 403);
        abort_unless($this->media->exists($media), 404);

        return Storage::disk($media->disk)->response($media->path, null, [
            'Content-Type' => $media->mime,
            'Cache-Control' => 'private, max-age=300',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** @return array<string, mixed> */
    private function present(MediaAttachment $item): array
    {
        return [
            'id' => $item->id,
            'attachable_type' => MediaService::aliasOf($item->attachable_type),
            'attachable_id' => $item->attachable_id,
            'mime' => $item->mime,
            'size_bytes' => $item->size_bytes,
            'sha256' => $item->sha256,
            'caption' => $item->caption,
            'position_code' => $item->position_code,
            'taken_at' => $item->taken_at?->toIso8601String(),
            'uploaded_by_account_id' => $item->uploaded_by_account_id,
            'created_at' => $item->created_at?->toIso8601String(),
            'url' => "/api/media/{$item->id}",
        ];
    }
}
