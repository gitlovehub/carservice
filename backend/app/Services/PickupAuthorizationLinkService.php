<?php

namespace App\Services;

use App\Mail\PickupAuthorizationLinkMail;
use App\Models\Account;
use App\Models\AuditLog;
use App\Models\PickupAuthorization;
use App\Models\RepairOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Link ủy quyền nhận xe cho chủ xe không có tài khoản: gửi tới email đã xác minh, hạn 24 giờ, dùng một lần.
 * Chủ xe tự nhập thông tin người nhận — cố vấn không thấy 4 số cuối giấy tờ nên việc đối chiếu vẫn có ý nghĩa.
 */
class PickupAuthorizationLinkService
{
    public const TTL_HOURS = 24;

    public const VALID_DAYS = 3;

    public function __construct(private readonly ConfirmationService $confirmations) {}

    public function send(RepairOrder $order, Account $actor): string
    {
        $this->assertOpen($order);
        $order->loadMissing('customer.account');
        $email = $order->customer?->confirmationEmail();
        if (! $email) {
            throw ValidationException::withMessages(['email' => 'Chủ xe chưa có email đã xác minh.']);
        }

        // Mỗi phiếu chỉ một link còn hiệu lực: gửi link mới thì link cũ vô hiệu.
        $nonce = Str::random(40);
        Cache::put($this->key($order), $nonce, now()->addHours(self::TTL_HOURS));
        $path = URL::temporarySignedRoute('pickup-authorizations.email-link', now()->addHours(self::TTL_HOURS), [
            'repairOrder' => $order->id,
            'nonce' => $nonce,
        ], false);
        Mail::to($email)->send(new PickupAuthorizationLinkMail($order, rtrim((string) config('app.url'), '/').$path, self::TTL_HOURS));
        AuditLog::query()->create([
            'account_id' => $actor->id,
            'action' => 'pickup_authorization.link_sent',
            'auditable_type' => RepairOrder::class,
            'auditable_id' => $order->id,
            'new_values' => ['sent_to' => $email],
            'ip_address' => request()->ip(),
            'user_agent' => substr((string) request()->userAgent(), 0, 1000),
        ]);

        return $email;
    }

    public function isActive(RepairOrder $order, string $nonce): bool
    {
        $current = Cache::get($this->key($order));

        return is_string($current) && hash_equals($current, $nonce) && ! $this->ended($order);
    }

    /** @param  array{full_name: string, phone: string, id_last4: string}  $data */
    public function create(RepairOrder $order, string $nonce, array $data, Request $request): PickupAuthorization
    {
        return DB::transaction(function () use ($order, $nonce, $data, $request): PickupAuthorization {
            $locked = RepairOrder::query()->lockForUpdate()->findOrFail($order->id);
            if (! $this->isActive($locked, $nonce)) {
                throw ValidationException::withMessages(['full_name' => 'Link đã được sử dụng hoặc hết hạn.']);
            }
            if ($locked->pickupAuthorizations()->where('status', PickupAuthorization::ACTIVE)->count() >= PickupAuthorization::MAX_ACTIVE) {
                throw ValidationException::withMessages(['full_name' => 'Tối đa '.PickupAuthorization::MAX_ACTIVE.' người được ủy quyền cùng lúc.']);
            }
            $authorization = $locked->pickupAuthorizations()->create([
                ...$data,
                'customer_id' => $locked->customer_id,
                'status' => PickupAuthorization::ACTIVE,
                'valid_until' => now()->addDays(self::VALID_DAYS),
            ]);
            $this->confirmations->recordEmailLinkAction($authorization, (int) $locked->customer_id, [
                'action' => 'PICKUP_AUTHORIZATION_CREATED', 'repair_order_id' => $locked->id, ...$data,
            ], $request);
            Cache::forget($this->key($locked));

            return $authorization;
        });
    }

    public function ended(RepairOrder $order): bool
    {
        return in_array($order->status, [RepairOrder::HANDED_OVER, RepairOrder::CLOSED], true);
    }

    private function assertOpen(RepairOrder $order): void
    {
        if ($this->ended($order)) {
            throw ValidationException::withMessages(['repair_order' => 'Phiếu đã kết thúc, không thể ủy quyền nhận xe.']);
        }
    }

    private function key(RepairOrder $order): string
    {
        return "pickup-authorization-link:{$order->id}";
    }
}
