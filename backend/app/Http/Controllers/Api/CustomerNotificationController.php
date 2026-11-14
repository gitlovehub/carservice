<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Thông báo WEB của chính khách hàng; không cung cấp thông báo của tài khoản khác. */
class CustomerNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $accountId = $request->user()->id;
        $query = Notification::query()->where('account_id', $accountId)->where('channel', 'WEB');

        return response()->json([
            'success' => true,
            'data' => (clone $query)->orderByDesc('created_at')->orderByDesc('id')->limit(30)
                ->get(['id', 'appointment_id', 'repair_order_id', 'title', 'content', 'type', 'created_at', 'read_at']),
            'unread_count' => (clone $query)->whereNull('read_at')->count(),
        ]);
    }

    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        abort_unless(
            (int) $notification->account_id === (int) $request->user()->id && $notification->channel === 'WEB',
            404,
            'Không tìm thấy thông báo.'
        );

        if ($notification->read_at === null) {
            $notification->forceFill(['read_at' => now(), 'status' => 'READ'])->save();
        }

        return response()->json(['success' => true, 'data' => [
            'id' => $notification->id,
            'read_at' => $notification->read_at,
        ]]);
    }
}
