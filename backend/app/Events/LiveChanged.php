<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

/**
 * Realtime: "dữ liệu vừa đổi" → đẩy ngay qua WebSocket (Reverb) tới nhân viên + đúng các khách liên quan.
 * Gửi ngay (không qua hàng đợi) nên không cần chạy queue worker.
 */
class LiveChanged implements ShouldBroadcastNow
{
    /** @param list<int> $accountIds tài khoản khách bị ảnh hưởng */
    public function __construct(public readonly array $accountIds, public readonly string $stamp) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('staff'),
            ...array_map(fn (int $id) => new PrivateChannel("account.{$id}"), $this->accountIds),
        ];
    }

    public function broadcastAs(): string
    {
        return 'live.changed';
    }

    public function broadcastWith(): array
    {
        return ['stamp' => $this->stamp];
    }
}
