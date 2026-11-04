<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = trim((string) $request->header('Idempotency-Key'));

        if ($key === '') {
            return $next($request);
        }

        if (mb_strlen($key) > 100) {
            return response()->json([
                'message' => 'Idempotency-Key không được vượt quá 100 ký tự.',
            ], 422);
        }

        $account = $request->user();
        $hash = hash('sha256', $this->requestPayload($request));
        $attributes = [
            'account_id' => $account->id,
            'idempotency_key' => $key,
            'request_method' => $request->method(),
            'request_path' => $request->path(),
        ];
        $record = [
            ...$attributes,
            'request_hash' => $hash,
            'expires_at' => now()->addHours(24),
            'created_at' => now(),
            'updated_at' => now(),
        ];

        try {
            DB::table('idempotency_keys')->insert($record);
        } catch (QueryException) {
            $existing = DB::table('idempotency_keys')->where($attributes)->first();

            if ($existing === null) {
                throw new \RuntimeException('Không thể khởi tạo idempotency key.');
            }

            if (now()->greaterThan($existing->expires_at)) {
                DB::table('idempotency_keys')->where('id', $existing->id)->delete();
                DB::table('idempotency_keys')->insert($record);
            } elseif ($existing->request_hash !== $hash) {
                return response()->json([
                    'message' => 'Idempotency-Key đã được dùng cho request khác.',
                ], 409);
            } elseif ($existing->response_body === null || $existing->response_status === null) {
                return response()->json([
                    'message' => 'Request với Idempotency-Key này đang được xử lý.',
                ], 409);
            } else {
                return response($existing->response_body, $existing->response_status, [
                    'Content-Type' => 'application/json',
                ]);
            }
        }

        try {
            $response = $next($request);

            DB::table('idempotency_keys')
                ->where($attributes)
                ->update([
                    'response_status' => $response->getStatusCode(),
                    'response_body' => $response->getContent(),
                    'updated_at' => now(),
                ]);

            return $response;
        } catch (\Throwable $exception) {
            DB::table('idempotency_keys')->where($attributes)->delete();

            throw $exception;
        }
    }

    private function requestPayload(Request $request): string
    {
        return json_encode([
            'method' => $request->method(),
            'path' => $request->path(),
            'payload' => $request->all(),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    }
}
