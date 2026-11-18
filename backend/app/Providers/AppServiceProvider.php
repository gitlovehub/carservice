<?php

namespace App\Providers;

use App\Support\LiveStamp;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('booking-create', function (Request $request): Limit {
            $key = $request->user()?->getAuthIdentifier() ?? $request->ip();

            return Limit::perMinute(10)->by('booking-create:'.$key);
        });

        // Đồng bộ nhanh (GET /api/live): dữ liệu nghiệp vụ đổi → làm mới dấu thời gian để trình duyệt tự tải lại.
        Event::listen(['eloquent.saved: *', 'eloquent.deleted: *'], static fn (string $event, array $payload) => LiveStamp::touch($payload[0] ?? null, str_starts_with($event, 'eloquent.deleted')));
        $this->app->terminating(static fn () => LiveStamp::flush());
    }
}
