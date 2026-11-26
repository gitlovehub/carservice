<?php

use App\Exceptions\ApiExceptionRenderer;
use App\Exceptions\InvalidStatusTransitionException;
use App\Http\Middleware\EnsureAccountRole;
use App\Http\Middleware\EnsureIdempotency;
use App\Http\Middleware\ThrottleRequestsPerRoute;
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
        // Chạy sau reverse proxy (Railway / nginx): tin proxy kết nối trực tiếp để request()->ip() là IP người dùng,
        // nếu không mọi giới hạn số lần thử (đăng nhập, OTP, tra cứu) bị tính chung cho cả hệ thống.
        // TRUSTED_PROXIES = "REMOTE_ADDR" (mặc định: chỉ tin máy kết nối trực tiếp, IP giả client tự chèn bị bỏ qua)
        // hoặc danh sách IP/CIDR cách nhau bởi dấu phẩy khi có nhiều tầng proxy. Không dùng "*" (Laravel tin mọi IP → giả mạo được).
        $middleware->trustProxies(at: array_map('trim', explode(',', (string) env('TRUSTED_PROXIES', 'REMOTE_ADDR'))));

        $middleware->validateCsrfTokens(except: [
            'api/*',
            // Link xác nhận lịch từ email: chữ ký trong URL là quyền truy cập, khách không có phiên đăng nhập.
            'appointments/*/email-confirm',
            // Link duyệt báo giá từ email: cùng lý do (URL có chữ ký, hết hạn, gắn đúng nội dung báo giá).
            'quotations/*/email-review',
            // Link thanh toán hoá đơn từ email: URL có chữ ký, hết hạn, số tiền do Backend tính lại.
            'invoices/*/email-payment',
            // Nút xác thực tài khoản / đổi email: URL có chữ ký, hết hạn, không tạo phiên đăng nhập.
            'accounts/*/email-verify',
            'accounts/*/email-change',
            // Link ủy quyền nhận xe từ email: URL có chữ ký, hết hạn, dùng một lần.
            'repair-orders/*/pickup-authorization',
        ]);
        $middleware->alias([
            'role' => EnsureAccountRole::class,
            'idempotency' => EnsureIdempotency::class,
            // Hạn mức `throttle:X,Y` tính riêng cho từng route (mặc định Laravel dùng chung một bộ đếm cho mọi route).
            'throttle' => ThrottleRequestsPerRoute::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (InvalidStatusTransitionException $e, Request $request) {
            return response()->json(['success' => false, 'code' => 'INVALID_STATE', 'message' => $e->getMessage()], 422);
        });

        // Mọi lỗi API có cùng định dạng; chi tiết kỹ thuật chỉ ghi vào log kèm mã tra cứu.
        $exceptions->render(fn (Throwable $e, Request $request) => ApiExceptionRenderer::render($e, $request));
        $exceptions->context(fn (): array => array_filter(['error_reference' => ApiExceptionRenderer::reference()]));

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
