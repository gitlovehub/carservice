<?php

use App\Exceptions\ApiExceptionRenderer;
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
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);
        $middleware->alias([
            'role' => EnsureAccountRole::class,
            'idempotency' => EnsureIdempotency::class,
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
