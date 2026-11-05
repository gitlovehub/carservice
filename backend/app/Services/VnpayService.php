<?php

namespace App\Services;

use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Lớp kỹ thuật làm việc với cổng VNPay (phiên bản API 2.1.0).
 * Chỉ ký/verify/tạo URL/gọi querydr, KHÔNG đọc hay ghi Database.
 */
class VnpayService
{
    private const TIMEZONE = 'Asia/Ho_Chi_Minh';

    public function isConfigured(): bool
    {
        return filled($this->config('tmn_code'))
            && filled($this->config('hash_secret'))
            && filled($this->config('payment_url'))
            && filled($this->config('return_url'));
    }

    public function tmnCode(): string
    {
        return (string) $this->config('tmn_code');
    }

    /**
     * Tạo URL chuyển khách sang trang thanh toán VNPay.
     *
     * @param  array{txn_ref: string, amount: int, order_info: string, ip_address: string, created_at: CarbonInterface, expires_at: CarbonInterface}  $order
     */
    public function buildPaymentUrl(array $order): string
    {
        $params = [
            'vnp_Version' => (string) $this->config('version', '2.1.0'),
            'vnp_Command' => 'pay',
            'vnp_TmnCode' => $this->tmnCode(),
            'vnp_Amount' => (string) ($order['amount'] * 100),
            'vnp_CurrCode' => 'VND',
            'vnp_TxnRef' => $order['txn_ref'],
            'vnp_OrderInfo' => $order['order_info'],
            'vnp_OrderType' => (string) $this->config('order_type', 'other'),
            'vnp_Locale' => (string) $this->config('locale', 'vn'),
            'vnp_ReturnUrl' => (string) $this->config('return_url'),
            'vnp_IpAddr' => $order['ip_address'],
            'vnp_CreateDate' => $this->formatDate($order['created_at']),
            'vnp_ExpireDate' => $this->formatDate($order['expires_at']),
        ];

        $query = $this->buildQuery($params);

        return rtrim((string) $this->config('payment_url'), '?').'?'.$query.'&vnp_SecureHash='.$this->sign($params);
    }

    /**
     * Chữ ký HMAC-SHA512 trên chuỗi tham số đã sắp xếp theo key và urlencode (code demo PHP 2.1.0 của VNPay).
     *
     * @param  array<string, string>  $params
     */
    public function sign(array $params): string
    {
        unset($params['vnp_SecureHash'], $params['vnp_SecureHashType']);

        return hash_hmac('sha512', $this->buildQuery($params), (string) $this->config('hash_secret'));
    }

    /**
     * Kiểm tra chữ ký của dữ liệu VNPay gửi về (Return URL / IPN).
     *
     * @param  array<string, string>  $params
     */
    public function verify(array $params): bool
    {
        $received = $params['vnp_SecureHash'] ?? '';

        if (! is_string($received) || $received === '' || blank($this->config('hash_secret'))) {
            return false;
        }

        return hash_equals(strtolower($this->sign($params)), strtolower($received));
    }

    /**
     * Đọc query string GỐC (không qua middleware TrimStrings/ConvertEmptyStringsToNull)
     * và chỉ giữ các tham số vnp_*, giống cách code demo đọc $_GET.
     *
     * @return array<string, string>
     */
    public function extractParams(?string $rawQueryString): array
    {
        parse_str((string) $rawQueryString, $parsed);

        $params = [];
        foreach ($parsed as $key => $value) {
            if (is_string($key) && str_starts_with($key, 'vnp_') && is_string($value)) {
                $params[$key] = $value;
            }
        }

        return $params;
    }

    /**
     * Gọi API querydr (server-to-server) để hỏi VNPay trạng thái giao dịch.
     * Trả về null khi lỗi kết nối hoặc chữ ký phản hồi không hợp lệ.
     *
     * @return array<string, string>|null
     */
    public function queryTransaction(string $txnRef, CarbonInterface $transactionDate, string $serverIp): ?array
    {
        $request = [
            'vnp_RequestId' => Str::lower((string) Str::ulid()),
            'vnp_Version' => (string) $this->config('version', '2.1.0'),
            'vnp_Command' => 'querydr',
            'vnp_TmnCode' => $this->tmnCode(),
            'vnp_TxnRef' => $txnRef,
            'vnp_OrderInfo' => 'Truy van giao dich '.$txnRef,
            'vnp_TransactionDate' => $this->formatDate($transactionDate),
            'vnp_CreateDate' => $this->formatDate(now()),
            'vnp_IpAddr' => $serverIp,
        ];

        $request['vnp_SecureHash'] = $this->hmac(implode('|', [
            $request['vnp_RequestId'], $request['vnp_Version'], $request['vnp_Command'], $request['vnp_TmnCode'],
            $request['vnp_TxnRef'], $request['vnp_TransactionDate'], $request['vnp_CreateDate'],
            $request['vnp_IpAddr'], $request['vnp_OrderInfo'],
        ]));

        $response = Http::timeout(15)->acceptJson()->post((string) $this->config('api_url'), $request);

        $log = Log::channel(config('services.vnpay.log_channel', 'vnpay'));

        if (! $response->successful() || ! is_array($response->json())) {
            $log->warning('VNPay querydr: HTTP không hợp lệ', [
                'http_status' => $response->status(),
                'body' => mb_substr($response->body(), 0, 500),
            ]);

            return null;
        }

        $data = array_map(fn ($value) => is_scalar($value) ? (string) $value : '', $response->json());

        $expected = $this->hmac(implode('|', [
            $data['vnp_ResponseId'] ?? '', $data['vnp_Command'] ?? '', $data['vnp_ResponseCode'] ?? '',
            $data['vnp_Message'] ?? '', $data['vnp_TmnCode'] ?? '', $data['vnp_TxnRef'] ?? '',
            $data['vnp_Amount'] ?? '', $data['vnp_BankCode'] ?? '', $data['vnp_PayDate'] ?? '',
            $data['vnp_TransactionNo'] ?? '', $data['vnp_TransactionType'] ?? '', $data['vnp_TransactionStatus'] ?? '',
            $data['vnp_OrderInfo'] ?? '', $data['vnp_PromotionCode'] ?? '', $data['vnp_PromotionAmount'] ?? '',
        ]));

        if (! hash_equals($expected, strtolower($data['vnp_SecureHash'] ?? ''))) {
            $log->warning('VNPay querydr: chữ ký phản hồi không khớp', [
                'has_signature' => filled($data['vnp_SecureHash'] ?? null),
                'response' => collect($data)->except('vnp_SecureHash')->all(),
            ]);

            return null;
        }

        return $data;
    }

    public function formatDate(CarbonInterface $date): string
    {
        return $date->copy()->setTimezone(self::TIMEZONE)->format('YmdHis');
    }

    /**
     * @param  array<string, string>  $params
     */
    private function buildQuery(array $params): string
    {
        ksort($params);

        $pairs = [];
        foreach ($params as $key => $value) {
            $pairs[] = urlencode($key).'='.urlencode($value);
        }

        return implode('&', $pairs);
    }

    private function hmac(string $data): string
    {
        return hash_hmac('sha512', $data, (string) $this->config('hash_secret'));
    }

    private function config(string $key, mixed $default = null): mixed
    {
        return config("services.vnpay.{$key}", $default);
    }
}
