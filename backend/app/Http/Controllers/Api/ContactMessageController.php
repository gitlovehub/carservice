<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Form "Gửi yêu cầu liên hệ": khách (không cần đăng nhập) gửi; Admin xem và đánh dấu đã xử lý.
 */
class ContactMessageController extends Controller
{
    /** POST /api/contact-messages — công khai, giới hạn tần suất ở route. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'regex:/^[0-9+ .()-]{8,20}$/'],
            'email' => ['nullable', 'email', 'max:150'],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
        ], [
            'name.required' => 'Vui lòng nhập họ và tên.',
            'phone.required' => 'Vui lòng nhập số điện thoại.',
            'phone.regex' => 'Số điện thoại không hợp lệ.',
            'email.email' => 'Email không hợp lệ.',
            'message.required' => 'Vui lòng nhập nội dung cần hỗ trợ.',
            'message.min' => 'Nội dung cần ít nhất 10 ký tự.',
        ]);

        ContactMessage::query()->create([
            'name' => trim($data['name']),
            'phone' => trim($data['phone']),
            'email' => isset($data['email']) ? trim($data['email']) : null,
            'message' => trim($data['message']),
        ]);

        return response()->json(['message' => 'Đã gửi yêu cầu. CarService sẽ liên hệ lại với bạn sớm nhất.'], 201);
    }

    /** GET /api/admin/contact-messages?status=NEW|HANDLED|all */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['all', ContactMessage::NEW, ContactMessage::HANDLED])],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);
        $status = $filters['status'] ?? 'all';

        $page = ContactMessage::query()
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->orderByDesc('created_at')->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 20);

        return response()->json([
            'data' => $page->items(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()],
            'summary' => ['new' => ContactMessage::query()->where('status', ContactMessage::NEW)->count()],
        ]);
    }

    /** PATCH /api/admin/contact-messages/{contactMessage} {status} */
    public function update(Request $request, ContactMessage $contactMessage): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in([ContactMessage::NEW, ContactMessage::HANDLED])]]);
        $contactMessage->update([
            'status' => $data['status'],
            'handled_at' => $data['status'] === ContactMessage::HANDLED ? now() : null,
        ]);

        return response()->json(['message' => 'Đã cập nhật.', 'data' => $contactMessage->fresh()]);
    }
}
