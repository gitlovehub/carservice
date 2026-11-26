<?php

namespace App\Support;

use App\Events\LiveChanged;
use App\Models\Account;
use App\Models\ConfirmationOtp;
use App\Models\Customer;
use App\Models\EmailVerificationOtp;
use App\Models\Notification;
use App\Models\PasswordResetOtp;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Realtime: mỗi lần dữ liệu nghiệp vụ đổi (model trong App\Models được lưu / xóa), khi request kết thúc:
 *  1. Phát sự kiện WebSocket (Reverb) `live.changed` tới kênh nhân viên + kênh riêng của các KHÁCH liên quan → trang đang mở tự tải lại ngay.
 *  2. Làm mới dấu thời gian GET /api/live — đường dự phòng khi WebSocket chưa bật / mất kết nối (trình duyệt hỏi định kỳ).
 *
 * Gộp mọi thay đổi trong một request thành MỘT lần phát / ghi.
 */
class LiveStamp
{
    public const KEY = 'live:stamp';

    /** Model không phản ánh dữ liệu người dùng nhìn thấy (mã OTP…). Token Sanctum không thuộc App\Models nên tự bị bỏ qua. */
    private const IGNORED = [
        ConfirmationOtp::class,
        EmailVerificationOtp::class,
        PasswordResetOtp::class,
    ];

    /** Danh sách tài khoản khách bị ảnh hưởng trong request này (nằm trong container: mỗi app / mỗi test riêng). */
    private const PENDING = 'live.stamp.pending';

    public static function touch(mixed $model, bool $deleted = false): void
    {
        if (! $model instanceof Model || ! str_starts_with($model::class, 'App\\Models\\') || in_array($model::class, self::IGNORED, true)) {
            return;
        }
        // save() không đổi gì vẫn phát "saved" → bỏ qua, tránh các trang tự tải lại vô ích (vòng lặp đọc → lưu → tải lại).
        if (! $deleted && ! $model->wasRecentlyCreated && ! $model->wasChanged()) {
            return;
        }
        self::mark(array_filter([self::accountFor($model)]));
    }

    /** Đánh dấu có thay đổi (kèm tài khoản khách cần báo) — dùng thêm cho cập nhật hàng loạt không phát sự kiện model. */
    public static function mark(array $accountIds = []): void
    {
        $app = app();
        $pending = $app->bound(self::PENDING) ? $app->make(self::PENDING) : [];
        $app->instance(self::PENDING, array_values(array_unique([...$pending, ...array_map('intval', $accountIds)])));
    }

    /** Gọi một lần khi request kết thúc (đăng ký trong AppServiceProvider): có thay đổi thì mới phát / ghi. */
    public static function flush(): void
    {
        $app = app();
        if (! $app->bound(self::PENDING)) {
            return;
        }
        $accounts = $app->make(self::PENDING);
        $app->forgetInstance(self::PENDING);
        self::bump($accounts);
    }

    /** Reverb không kết nối được → tạm ngừng phát trong khoảng này (giây), để mỗi request không phải chờ kết nối lại. */
    private const BROADCAST_PAUSE_SECONDS = 30;

    private const BROADCAST_DOWN_KEY = 'live:broadcast-down';

    /** @param list<int> $accountIds */
    public static function bump(array $accountIds = []): void
    {
        $stamp = (string) now()->getPreciseTimestamp(3);
        // Ghi dấu thời gian TRƯỚC: đường dự phòng (GET /api/live) luôn thấy thay đổi ngay, kể cả khi không phát được.
        Cache::forever(self::KEY, $stamp);
        if (Cache::has(self::BROADCAST_DOWN_KEY)) {
            return;
        }
        try {
            broadcast(new LiveChanged($accountIds, $stamp));
        } catch (Throwable $e) {
            // Máy chủ WebSocket chưa chạy (`php artisan reverb:start`) → trình duyệt vẫn tự cập nhật nhờ hỏi định kỳ.
            Cache::put(self::BROADCAST_DOWN_KEY, true, self::BROADCAST_PAUSE_SECONDS);
            Log::debug('Realtime broadcast skipped: '.$e->getMessage());
        }
    }

    public static function current(): string
    {
        return (string) Cache::get(self::KEY, '0');
    }

    /** Tài khoản KHÁCH liên quan tới bản ghi (lần theo customer_id → phiếu → lịch hẹn → báo giá → hóa đơn → xe). */
    private static function accountFor(Model $model): ?int
    {
        $a = $model->getAttributes();
        if ($model instanceof Account) {
            return (int) $model->getKey();
        }
        if ($model instanceof Notification || $model instanceof Customer) {
            return isset($a['account_id']) ? (int) $a['account_id'] : null;
        }

        $customerId = $a['customer_id'] ?? null;
        $lookups = [
            'repair_order_id' => fn ($id) => DB::table('repair_orders')->where('id', $id)->value('customer_id'),
            'appointment_id' => fn ($id) => DB::table('appointments')->where('id', $id)->value('customer_id'),
            'quotation_id' => fn ($id) => DB::table('quotations')->join('repair_orders', 'repair_orders.id', '=', 'quotations.repair_order_id')
                ->where('quotations.id', $id)->value('repair_orders.customer_id'),
            'invoice_id' => fn ($id) => DB::table('invoices')->join('repair_orders', 'repair_orders.id', '=', 'invoices.repair_order_id')
                ->where('invoices.id', $id)->value('repair_orders.customer_id'),
            'vehicle_id' => fn ($id) => DB::table('vehicles')->where('id', $id)->value('customer_id'),
        ];
        foreach ($lookups as $column => $lookup) {
            if ($customerId) {
                break;
            }
            if (! empty($a[$column])) {
                $customerId = $lookup($a[$column]);
            }
        }

        $accountId = $customerId ? DB::table('customers')->where('id', $customerId)->value('account_id') : null;

        return $accountId ? (int) $accountId : null;
    }
}
