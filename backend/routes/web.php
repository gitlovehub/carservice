<?php

use App\Http\Controllers\AppointmentEmailConfirmationController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Khách xác nhận lịch hẹn từ email (link có chữ ký, kiểm tra trong controller để hiện trang thân thiện khi hết hạn).
Route::get('/appointments/{appointment}/email-confirm', [AppointmentEmailConfirmationController::class, 'show'])
    ->whereNumber('appointment')->name('appointments.email-confirm')->middleware('throttle:30,1');
Route::post('/appointments/{appointment}/email-confirm', [AppointmentEmailConfirmationController::class, 'confirm'])
    ->whereNumber('appointment')->middleware('throttle:10,1');
