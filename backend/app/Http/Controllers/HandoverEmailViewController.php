<?php

namespace App\Http\Controllers;

use App\Models\VehicleHandover;
use App\Services\HandoverEmailViewService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Khách mở biên bản từ email (chỉ đọc, không cần đăng nhập — link có chữ ký là quyền truy cập). */
class HandoverEmailViewController extends Controller
{
    public function __construct(private readonly HandoverEmailViewService $views) {}

    public function show(Request $request, int $handover): View
    {
        $record = VehicleHandover::query()->find($handover);
        if (! $record || ! $request->hasValidSignature(false)) {
            return view('handovers.email-view', ['state' => 'expired']);
        }
        if ($record->status === VehicleHandover::STATUS_VOID || ! $this->views->matchesRevision($record, (string) $request->query('rev'))) {
            return view('handovers.email-view', ['state' => 'closed']);
        }

        return view('handovers.email-view', ['state' => 'ready', ...$this->views->viewData($record)]);
    }

    public function photo(Request $request, int $handover, int $media): StreamedResponse
    {
        abort_unless($request->hasValidSignature(false), 403);
        $record = VehicleHandover::query()->find($handover);
        abort_unless($record && $record->status !== VehicleHandover::STATUS_VOID && $this->views->matchesRevision($record, (string) $request->query('rev')), 404);
        $attachment = $this->views->photo($record, $media);
        abort_unless($attachment && Storage::disk($attachment->disk)->exists($attachment->path), 404);

        return Storage::disk($attachment->disk)->response($attachment->path, null, [
            'Content-Type' => $attachment->mime,
            'Cache-Control' => 'private, max-age=300',
            'X-Content-Type-Options' => 'nosniff',
            'Referrer-Policy' => 'no-referrer',
        ]);
    }
}
