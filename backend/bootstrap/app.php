<?php

use App\Exceptions\InvalidStatusTransitionException;
use App\Http\Middleware\EnsureAccountRole;
use App\Http\Middleware\EnsureIdempotency;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    // Realtime (Reverb): xác thực kênh riêng bằng token Sanctum như mọi API → POST /api/broadcasting/auth.
    ->withBroadcasting(__DIR__.'/../routes/channels.php', ['prefix' => 'api', 'middleware' => ['api', 'auth:sanctum']])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: [
            'api/*',
            // Link xác nhận lịch từ email: chữ ký trong URL là quyền truy cập, khách không có phiên đăng nhập.
            'appointments/*/email-confirm',
            // Link duyệt báo giá từ email: cùng lý do (URL có chữ ký, hết hạn, gắn đúng nội dung báo giá).
            'quotations/*/email-review',
            // Link ủy quyền nhận xe từ email: URL có chữ ký, hết hạn, dùng một lần.
            'repair-orders/*/pickup-authorization',
        ]);
        $middleware->alias([
            'role' => EnsureAccountRole::class,
            'idempotency' => EnsureIdempotency::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (InvalidStatusTransitionException $e, Request $request) {
            return response()->json(['message' => $e->getMessage()], 422);
        });

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
