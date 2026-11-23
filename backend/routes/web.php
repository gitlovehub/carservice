<?php

use App\Http\Controllers\AccountEmailLinkController;
use App\Http\Controllers\AppointmentEmailConfirmationController;
use App\Http\Controllers\HandoverEmailViewController;
use App\Http\Controllers\InvoiceEmailPaymentController;
use App\Http\Controllers\PickupAuthorizationLinkController;
use App\Http\Controllers\QuotationEmailReviewController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Xác thực tài khoản và đổi email từ nút trong email (link có chữ ký 24 giờ, không tạo phiên đăng nhập).
Route::get('/accounts/{account}/email-verify', [AccountEmailLinkController::class, 'verify'])
    ->whereNumber('account')->name('accounts.email-verify')->middleware('throttle:30,1');
Route::post('/accounts/{account}/email-verify', [AccountEmailLinkController::class, 'verify'])
    ->whereNumber('account')->middleware('throttle:10,1');
Route::get('/accounts/{account}/email-change', [AccountEmailLinkController::class, 'change'])
    ->whereNumber('account')->name('accounts.email-change')->middleware('throttle:30,1');
Route::post('/accounts/{account}/email-change', [AccountEmailLinkController::class, 'change'])
    ->whereNumber('account')->middleware('throttle:10,1');

// Khách xác nhận lịch hẹn từ email (link có chữ ký, kiểm tra trong controller để hiện trang thân thiện khi hết hạn).
Route::get('/appointments/{appointment}/email-confirm', [AppointmentEmailConfirmationController::class, 'show'])
    ->whereNumber('appointment')->name('appointments.email-confirm')->middleware('throttle:30,1');
Route::post('/appointments/{appointment}/email-confirm', [AppointmentEmailConfirmationController::class, 'confirm'])
    ->whereNumber('appointment')->middleware('throttle:10,1');

// Khách duyệt báo giá từ email (không cần đăng nhập; link có chữ ký 3 ngày, gắn đúng nội dung báo giá).
Route::get('/quotations/{quotation}/email-review', [QuotationEmailReviewController::class, 'show'])
    ->whereNumber('quotation')->name('quotations.email-review')->middleware('throttle:30,1');
Route::post('/quotations/{quotation}/email-review', [QuotationEmailReviewController::class, 'submit'])
    ->whereNumber('quotation')->middleware('throttle:10,1');

// Khách xem và thanh toán hoá đơn từ email (không cần đăng nhập; link có chữ ký 3 ngày, gắn đúng nội dung hoá đơn).
Route::get('/invoices/{invoice}/email-payment', [InvoiceEmailPaymentController::class, 'show'])
    ->whereNumber('invoice')->name('invoices.email-payment')->middleware('throttle:30,1');
Route::post('/invoices/{invoice}/email-payment', [InvoiceEmailPaymentController::class, 'pay'])
    ->whereNumber('invoice')->middleware('throttle:10,1');
Route::get('/payments/vnpay/email-return', [InvoiceEmailPaymentController::class, 'vnpayReturn'])
    ->name('invoices.email-payment.return')->middleware('throttle:30,1');

// Chủ xe tự khai người nhận xe từ email (không cần đăng nhập; link có chữ ký 24 giờ, dùng một lần).
Route::get('/repair-orders/{repairOrder}/pickup-authorization', [PickupAuthorizationLinkController::class, 'show'])
    ->whereNumber('repairOrder')->name('pickup-authorizations.email-link')->middleware('throttle:30,1');
Route::post('/repair-orders/{repairOrder}/pickup-authorization', [PickupAuthorizationLinkController::class, 'store'])
    ->whereNumber('repairOrder')->middleware('throttle:10,1');

// Khách xem biên bản từ email (chỉ đọc, không cần đăng nhập; link có chữ ký 3 ngày, gắn đúng nội dung đã khóa).
Route::get('/handovers/{handover}/email-view', [HandoverEmailViewController::class, 'show'])
    ->whereNumber('handover')->name('handovers.email-view')->middleware('throttle:30,1');
Route::get('/handovers/{handover}/email-view/photos/{media}', [HandoverEmailViewController::class, 'photo'])
    ->whereNumber(['handover', 'media'])->name('handovers.email-view.photo')->middleware('throttle:120,1');
