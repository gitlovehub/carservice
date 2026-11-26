<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\Payment;
use App\Services\VnpayPaymentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Giao dịch VNPay còn "chờ" đã quá hạn thanh toán lâu (mặc định 24 giờ): khách đã bỏ trang VNPay,
 * IPN không còn đến. Nếu bật hỏi cổng (VNPAY_QUERY_ON_RETURN) thì hỏi VNPay lần cuối trước khi huỷ,
 * để không bỏ sót giao dịch đã trừ tiền. Giao dịch huỷ được ghi nhật ký, hoá đơn không đổi.
 */
class ExpireStaleVnpayPayments extends Command
{
    protected $signature = 'payments:expire-vnpay {--hours=24 : Số giờ sau hạn thanh toán mới huỷ}';

    protected $description = 'Huỷ giao dịch VNPay còn chờ đã quá hạn thanh toán';

    public function handle(VnpayPaymentService $payments): int
    {
        $cutoff = now()->subHours(max(1, (int) $this->option('hours')));
        $expired = 0;
        $resolved = 0;

        Payment::query()
            ->where('payment_method', Payment::VNPAY)
            ->where('status', Payment::PENDING)
            ->where('expires_at', '<', $cutoff)
            ->chunkById(100, function ($stale) use ($payments, &$expired, &$resolved): void {
                foreach ($stale as $payment) {
                    if (config('services.vnpay.query_on_return')) {
                        $payments->syncWithGateway($payment, '127.0.0.1');
                        if ($payment->refresh()->status !== Payment::PENDING) {
                            $resolved++;

                            continue;
                        }
                    }

                    $cancelled = DB::transaction(function () use ($payment): bool {
                        $locked = Payment::query()->lockForUpdate()->find($payment->id);
                        if (! $locked || $locked->status !== Payment::PENDING) {
                            return false;
                        }
                        $locked->forceFill(['status' => Payment::CANCELLED])->save();
                        AuditLog::query()->create([
                            'action' => 'VNPAY_EXPIRED',
                            'auditable_type' => Payment::class,
                            'auditable_id' => $locked->id,
                            'new_values' => ['txn_ref' => $locked->gateway_txn_ref, 'expires_at' => $locked->expires_at?->toIso8601String()],
                            'reason' => 'Giao dịch VNPay quá hạn thanh toán, khách không hoàn tất.',
                        ]);

                        return true;
                    });
                    $expired += (int) $cancelled;
                }
            });

        $this->info("Đã huỷ {$expired} giao dịch VNPay quá hạn, {$resolved} giao dịch có kết quả từ cổng.");

        return self::SUCCESS;
    }
}
