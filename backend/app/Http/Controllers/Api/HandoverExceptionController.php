<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\HandoverException;
use App\Models\MediaAttachment;
use App\Models\VehicleHandover;
use App\Services\ConfirmationService;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Ngoại lệ duy nhất khi chủ xe mất email: chủ xe đến trực tiếp, cố vấn lập yêu cầu kèm ảnh giấy tờ, admin duyệt. */
class HandoverExceptionController extends Controller
{
    public function __construct(private readonly ConfirmationService $confirmations) {}

    public function store(Request $request, VehicleHandover $handover): JsonResponse
    {
        abort_unless(Gate::allows('update', $handover->repairOrder), 403);
        $image = ['required', 'file', 'mimetypes:'.implode(',', MediaAttachment::ALLOWED_MIMES), 'max:'.(MediaAttachment::MAX_BYTES / 1024)];
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:1000'],
            'id_document' => $image,
            'registration' => $image,
        ], [
            'reason.required' => 'Ghi rõ lý do chủ xe không dùng được email.',
            'reason.min' => 'Lý do cần ít nhất 10 ký tự.',
            'id_document.required' => 'Tải ảnh CCCD của chủ xe.',
            'registration.required' => 'Tải ảnh giấy đăng ký xe.',
        ]);
        if ($handover->status !== VehicleHandover::STATUS_SUBMITTED) {
            throw ValidationException::withMessages(['handover' => 'Chỉ lập ngoại lệ cho biên bản đang chờ chủ xe xác nhận.']);
        }
        if ($handover->person_relation !== 'OWNER') {
            throw ValidationException::withMessages(['handover' => 'Ngoại lệ chỉ áp dụng khi chính chủ xe có mặt.']);
        }
        if (HandoverException::query()->where('vehicle_handover_id', $handover->id)->where('status', HandoverException::PENDING)->exists()) {
            throw ValidationException::withMessages(['handover' => 'Biên bản đã có yêu cầu đang chờ admin duyệt.']);
        }

        $exception = HandoverException::query()->create([
            'vehicle_handover_id' => $handover->id,
            'requested_by_account_id' => $request->user()->id,
            'reason' => trim($data['reason']),
            'id_document_path' => $this->storeFile($request->file('id_document')),
            'registration_path' => $this->storeFile($request->file('registration')),
            'status' => HandoverException::PENDING,
        ]);
        $this->audit('handover_exception.requested', $exception, $request);

        return response()->json($exception, 201);
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['status' => ['nullable', 'in:PENDING,APPROVED,REJECTED']]);
        $page = HandoverException::query()
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->with([
                'handover:id,repair_order_id,type,status,person_name,vehicle_id',
                'handover.repairOrder:id,repair_order_code,customer_id',
                'handover.repairOrder.customer:id,full_name,phone',
                'handover.vehicle:id,license_plate,model_id',
                'handover.vehicle.model:id,brand_id,name',
                'handover.vehicle.model.brand:id,name',
                'requestedBy:id,email', 'requestedBy.employee:id,account_id,full_name',
                'decidedBy:id,email', 'decidedBy.employee:id,account_id,full_name',
            ])
            ->latest('id')->paginate(15);

        return response()->json($page);
    }

    public function file(HandoverException $exception, string $kind): StreamedResponse
    {
        $path = match ($kind) {
            'id-document' => $exception->id_document_path,
            'registration' => $exception->registration_path,
            default => abort(404),
        };
        abort_unless($exception->documents_available && $path && Storage::disk(MediaService::DISK)->exists($path), 404);

        return Storage::disk(MediaService::DISK)->response($path, null, [
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function approve(Request $request, HandoverException $exception): JsonResponse
    {
        $data = $request->validate(['note' => ['required', 'string', 'min:5', 'max:1000']], [
            'note.required' => 'Ghi rõ đã đối chiếu giấy tờ thế nào.',
            'note.min' => 'Ghi chú cần ít nhất 5 ký tự.',
        ]);
        $this->assertDecidable($exception, $request);

        DB::transaction(function () use ($exception, $data, $request): void {
            $locked = HandoverException::query()->lockForUpdate()->findOrFail($exception->id);
            $this->assertDecidable($locked, $request);
            $this->confirmations->confirmHandoverByException($locked->handover, $request->user()->employee, trim($data['note']), $request);
            $locked->update(['status' => HandoverException::APPROVED, 'decided_by_account_id' => $request->user()->id, 'decided_at' => now(), 'decision_note' => trim($data['note'])]);
            $this->audit('handover_exception.approved', $locked, $request);
        });

        return response()->json($exception->fresh());
    }

    public function reject(Request $request, HandoverException $exception): JsonResponse
    {
        $data = $request->validate(['note' => ['required', 'string', 'min:5', 'max:1000']], [
            'note.required' => 'Ghi rõ lý do từ chối.',
            'note.min' => 'Lý do cần ít nhất 5 ký tự.',
        ]);
        $this->assertDecidable($exception, $request);
        $exception->update(['status' => HandoverException::REJECTED, 'decided_by_account_id' => $request->user()->id, 'decided_at' => now(), 'decision_note' => trim($data['note'])]);
        $this->audit('handover_exception.rejected', $exception, $request);

        return response()->json($exception->fresh());
    }

    private function assertDecidable(HandoverException $exception, Request $request): void
    {
        if ($exception->status !== HandoverException::PENDING) {
            throw ValidationException::withMessages(['exception' => 'Yêu cầu đã được xử lý.']);
        }
        if ((int) $exception->requested_by_account_id === (int) $request->user()->id) {
            throw ValidationException::withMessages(['exception' => 'Người lập yêu cầu không được tự duyệt.']);
        }
    }

    private function storeFile(UploadedFile $file): string
    {
        return $file->storeAs('handover-exceptions', Str::uuid().'.'.$file->extension(), MediaService::DISK);
    }

    private function audit(string $action, HandoverException $exception, Request $request): void
    {
        AuditLog::query()->create([
            'account_id' => $request->user()->id,
            'action' => $action,
            'auditable_type' => VehicleHandover::class,
            'auditable_id' => $exception->vehicle_handover_id,
            'new_values' => ['exception_id' => $exception->id, 'status' => $exception->status],
            'reason' => $exception->decision_note ?? $exception->reason,
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 1000),
        ]);
    }
}
