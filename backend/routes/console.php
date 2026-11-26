<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Ảnh CCCD / đăng ký xe của yêu cầu ngoại lệ: tự xóa sau 90 ngày kể từ khi xử lý.
Schedule::command('handover-exceptions:purge-documents')->dailyAt('02:00')->withoutOverlapping();

// Token đăng nhập quá hạn 24 giờ (config/sanctum.php) không còn dùng được — xóa khỏi bảng cho gọn.
Schedule::command('sanctum:prune-expired', ['--hours' => 24])->dailyAt('02:30')->withoutOverlapping();
