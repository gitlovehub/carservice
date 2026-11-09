<?php

use App\Http\Controllers\Api\AdminAdvisorActivityController;
use App\Http\Controllers\Api\AdminInsightsController;
use App\Http\Controllers\Api\AdminMaintenancePackageController;
use App\Http\Controllers\Api\AdminServiceController;
use App\Http\Controllers\Api\AdminVehicleCatalogController;
use App\Http\Controllers\Api\AdvisorAppointmentController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingCatalogController;
use App\Http\Controllers\Api\CapacityController;
use App\Http\Controllers\Api\ChatbotController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\CustomerHandoverController;
use App\Http\Controllers\Api\CustomerPickupAuthorizationController;
use App\Http\Controllers\Api\CustomerRepairOrderController;
use App\Http\Controllers\Api\CustomerReviewController;
use App\Http\Controllers\Api\GarageSettingController;
use App\Http\Controllers\Api\HandoverController;
use App\Http\Controllers\Api\InspectionController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\MaintenancePackageController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\PartController;
use App\Http\Controllers\Api\PartRequestController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\QuotationConfirmationController;
use App\Http\Controllers\Api\QuotationController;
use App\Http\Controllers\Api\RepairOrderController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\TechnicianController;
use App\Http\Controllers\Api\VehicleCatalogController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\VnpayController;
use App\Http\Controllers\Api\WorkingHoursController;
use App\Http\Controllers\Api\WorkItemController;
use App\Models\Account;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public
|--------------------------------------------------------------------------
*/

Route::controller(AuthController::class)->group(function (): void {

    Route::post('register', 'register')->middleware('throttle:5,1');

    Route::post('login', 'login')->middleware('throttle:5,1');

    Route::post('verify-email-otp', 'verifyEmailOtp')->middleware('throttle:5,1');

    Route::post('resend-email-otp', 'resendEmailOtp')->middleware('throttle:3,1');

    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');

    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');
});

Route::get('services', [ServiceController::class, 'index']);
Route::get('services/{service}', [ServiceController::class, 'show']);
Route::get('maintenance-packages', [MaintenancePackageController::class, 'index']);
Route::get('maintenance-packages/{maintenancePackage}', [MaintenancePackageController::class, 'show']);
Route::get('booking-catalog', [BookingCatalogController::class, 'index']);

// Danh mục xe công khai: Hãng → Dòng xe → Phiên bản (chỉ bản ghi đang hiển thị).
Route::controller(VehicleCatalogController::class)
    ->prefix('vehicle-catalog')
    ->middleware('throttle:120,1')
    ->name('vehicle-catalog.')
    ->group(function (): void {
        Route::get('brands', 'brands')->name('brands');
        Route::get('brands/{brand}/models', 'models')->whereNumber('brand')->name('models');
        Route::get('models/{model}/trims', 'trims')->whereNumber('model')->name('trims');
        Route::get('search', 'search')->name('search');
    });

Route::get('/working-hours', [WorkingHoursController::class, 'index']);

// Thông tin gara (Footer, trang Liên hệ).
Route::get('garage-settings', [GarageSettingController::class, 'show']);

Route::post('chatbot', [ChatbotController::class, 'chat'])->middleware('throttle:20,1');

// VNPay: IPN do máy chủ VNPay gọi; Return do Frontend gọi để hiển thị kết quả. Bảo vệ bằng chữ ký.
Route::controller(VnpayController::class)->prefix('payments/vnpay')->group(function (): void {
    Route::get('ipn', 'ipn');
    Route::get('return', 'return')->middleware('throttle:30,1');
});

/*
|--------------------------------------------------------------------------
| Authenticated
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function (): void {

    /*
    |--------------------------------------------------------------------------
    | Auth
    |--------------------------------------------------------------------------
    */

    Route::controller(AuthController::class)->group(function (): void {
        Route::get('me', 'me');
        Route::patch('me/profile', 'updateProfile');
        Route::post('me/change-password', 'changePassword');
        Route::post('logout', 'logout');
    });

    // Gợi ý địa chỉ (Goong / OpenStreetMap qua backend — key không lộ ra trình duyệt).
    Route::get('address/suggest', [GarageSettingController::class, 'suggest'])->middleware('throttle:60,1');
    Route::get('address/place', [GarageSettingController::class, 'place'])->middleware('throttle:60,1');

    // Ảnh bằng chứng: xem theo quyền xem phiếu sửa chữa liên quan (MediaController).
    Route::get('media', [MediaController::class, 'index']);
    Route::get('media/{media}', [MediaController::class, 'show']);

    /*
    |--------------------------------------------------------------------------
    | Customer
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:'.Account::ROLE_CUSTOMER)->group(function (): void {

        // Phiếu sửa chữa, báo giá và hóa đơn của khách hàng hiện tại
        Route::controller(CustomerRepairOrderController::class)->prefix('me')->group(function (): void {
            Route::get('repair-orders', 'index');
            Route::get('repair-orders/{repairOrder}', 'show');
            Route::get('repair-orders/{repairOrder}/invoice', 'invoice');
            Route::post('quotations/{quotation}/respond', 'respondQuotation');
        });

        // Ủy quyền nhận xe (P4, N9): chủ xe khai báo / thu hồi trong tài khoản.
        Route::controller(CustomerPickupAuthorizationController::class)->prefix('me')->group(function (): void {
            Route::get('repair-orders/{repairOrder}/pickup-authorizations', 'index');
            Route::post('repair-orders/{repairOrder}/pickup-authorizations', 'store')->middleware('throttle:10,1');
            Route::delete('pickup-authorizations/{pickupAuthorization}', 'revoke');
        });

        // Biên bản giao nhận xe của khách: xem (đã gửi / đã xác nhận) và tự xác nhận.
        Route::controller(CustomerHandoverController::class)->prefix('me')->group(function (): void {
            Route::get('repair-orders/{repairOrder}/handovers', 'index');
            Route::post('handovers/{handover}/confirm', 'confirm')->middleware('throttle:10,1');
        });

        // Thanh toán hóa đơn qua VNPay
        Route::post('me/invoices/{invoice}/vnpay', [VnpayController::class, 'create'])->middleware(['throttle:10,1', 'idempotency']);

        // Đánh giá dịch vụ
        Route::controller(CustomerReviewController::class)->prefix('me/reviews')->group(function (): void {
            Route::get('/', 'index');
            Route::post('/', 'store');
        });

        // Hồ sơ cá nhân
        Route::controller(CustomerController::class)->prefix('me/customer')->group(function (): void {
            Route::get('/', 'me');
            Route::patch('/', 'updateMe');
        });

        // Xe của tôi
        Route::controller(VehicleController::class)->prefix('me/vehicles')->group(function (): void {
            Route::get('/', 'myVehicles');
            Route::post('/', 'storeMyVehicle');
            Route::get('/{vehicle}', 'showMyVehicle');
            Route::patch('/{vehicle}', 'updateMyVehicle');
            Route::delete('/{vehicle}', 'destroyMyVehicle');
        });

        // Quản lý lịch hẹn của khách hàng
        Route::controller(AppointmentController::class)->prefix('appointments')->group(function (): void {
            Route::get('/', 'index');                 // GET /api/appointments
            Route::post('/', 'store')
                ->middleware(['throttle:booking-create', 'idempotency']); // POST /api/appointments
            Route::get('/{appointment}', 'show');     // GET /api/appointments/{id}
            Route::patch('/{appointment}', 'update'); // PATCH /api/appointments/{id}
            Route::post('/{appointment}/cancel', 'cancel'); // POST /api/appointments/{id}/cancel
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Advisor + Admin
    |--------------------------------------------------------------------------
    */

    Route::middleware(
        'role:'.Account::ROLE_ADVISOR.','.Account::ROLE_ADMIN
    )->group(function (): void {

        // Quản lý lịch hẹn của cố vấn
        // Quản lý lịch hẹn phía Cố vấn
        Route::prefix('advisor/appointments')->group(function (): void {
            Route::post('/', [AdvisorAppointmentController::class, 'store']);
            Route::get('/', [AdvisorAppointmentController::class, 'index']);
            Route::get('/{id}', [AdvisorAppointmentController::class, 'show']);
            Route::post('/{id}/confirm', [AdvisorAppointmentController::class, 'confirm']);
            Route::post('/{id}/check-in', [AdvisorAppointmentController::class, 'checkIn']);
            Route::post('/{id}/cancel', [AdvisorAppointmentController::class, 'cancel']);
            // Đổi lịch giúp khách: bắt buộc lý do, ghi ai đổi, báo khách (web + email).
            Route::post('/{id}/reschedule', [AdvisorAppointmentController::class, 'reschedule'])->middleware('throttle:20,1');
        });

        // P7: công suất gara theo phút / ngày (Q6: chỉ cảnh báo).
        Route::get('advisor/capacity', [CapacityController::class, 'show']);
        Route::get('advisor/capacity/range', [CapacityController::class, 'range']);

        // P6: phụ tùng chờ — đặt hàng (ETA), nhận hàng (nhập kho), hủy.
        Route::controller(PartRequestController::class)->prefix('part-requests')->group(function (): void {
            Route::get('/', 'index');
            Route::post('{partRequest}/order', 'order');
            Route::post('{partRequest}/receive', 'receive');
            Route::post('{partRequest}/cancel', 'cancel');
        });

        // Customer CRUD
        Route::apiResource('customers', CustomerController::class)
            ->only(['index', 'store', 'show', 'update']);

        // Vehicle CRUD
        Route::apiResource('vehicles', VehicleController::class)
            ->only(['index', 'store', 'show', 'update', 'destroy']);

        // Xe của một khách hàng
        Route::get(
            'customers/{customerId}/vehicles',
            [VehicleController::class, 'byCustomer']
        );
    });

    /*
    |--------------------------------------------------------------------------
    | Admin
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:'.Account::ROLE_ADMIN)->group(function (): void {

        // Xóa khách hàng
        Route::delete(
            'customers/{customer}',
            [CustomerController::class, 'destroy']
        );

        // Thông tin gara: tên, liên hệ, địa chỉ (chọn từ gợi ý bản đồ).
        Route::put('admin/garage-settings', [GarageSettingController::class, 'update']);

        // Hoạt động của từng cố vấn với lịch hẹn / phiếu sửa chữa.
        Route::get('admin/advisor-activity', [AdminAdvisorActivityController::class, 'index']);

        // P5: bước chuẩn + phút chuẩn của dịch vụ.
        Route::get('admin/services/{service}/steps', [AdminServiceController::class, 'steps']);
        Route::put('admin/services/{service}/steps', [AdminServiceController::class, 'syncSteps']);

        // Quản trị danh mục dịch vụ (DELETE = xóa mềm, status = INACTIVE)
        Route::apiResource('admin/services', AdminServiceController::class)
            ->parameters(['services' => 'service'])
            ->names('admin.services');

        // Quản trị gói bảo dưỡng (DELETE = xóa mềm, status = INACTIVE)
        Route::prefix('admin/maintenance-packages')->group(function (): void {
            Route::put(
                '{maintenancePackage}/services',
                [AdminMaintenancePackageController::class, 'syncServices']
            );
            Route::put(
                '{maintenancePackage}/parts',
                [AdminMaintenancePackageController::class, 'syncParts']
            );
        });

        Route::apiResource('admin/maintenance-packages', AdminMaintenancePackageController::class)
            ->parameters(['maintenance-packages' => 'maintenancePackage'])
            ->names('admin.maintenance-packages');

        // Số liệu thật cho Tổng quan và Báo cáo.
        Route::get('admin/dashboard', [AdminInsightsController::class, 'dashboard']);
        Route::get('admin/reports', [AdminInsightsController::class, 'reports']);

        // Quản trị danh mục xe: hãng, dòng xe, phiên bản (xóa bị chặn khi đang được dùng).
        Route::controller(AdminVehicleCatalogController::class)->prefix('admin')->group(function (): void {
            Route::get('vehicle-brands', 'brandIndex');
            Route::post('vehicle-brands', 'brandStore');
            Route::patch('vehicle-brands/{brand}', 'brandUpdate')->whereNumber('brand');
            Route::delete('vehicle-brands/{brand}', 'brandDestroy')->whereNumber('brand');

            Route::get('vehicle-models', 'modelIndex');
            Route::post('vehicle-models', 'modelStore');
            Route::patch('vehicle-models/{model}', 'modelUpdate')->whereNumber('model');
            Route::delete('vehicle-models/{model}', 'modelDestroy')->whereNumber('model');

            Route::get('vehicle-trims', 'trimIndex');
            Route::post('vehicle-trims', 'trimStore');
            Route::patch('vehicle-trims/{trim}', 'trimUpdate')->whereNumber('trim');
            Route::delete('vehicle-trims/{trim}', 'trimDestroy')->whereNumber('trim');
        });

        Route::get('/admin/working-hours', [WorkingHoursController::class, 'index']);

        Route::put('/admin/working-hours/{id}', [WorkingHoursController::class, 'update']);
    });

    /*
    |--------------------------------------------------------------------------
    | Advisor + Technician
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:'.Account::ROLE_ADVISOR.','.Account::ROLE_TECHNICIAN)->group(function (): void {

        Route::controller(RepairOrderController::class)->group(function (): void {
            Route::get('repair-orders', 'index');
            Route::get('repair-orders/{repairOrder}', 'show');
        });

        Route::controller(WorkItemController::class)->group(function (): void {
            Route::get('repair-orders/{repairOrder}/work-items', 'index');
            Route::patch('work-items/{workItem}/status', 'updateStatus');
            Route::post('repair-orders/{repairOrder}/used-parts', 'storeUsedPart');
        });

        Route::get('repair-orders/{repairOrder}/inspections', [InspectionController::class, 'show']);

        // Danh mục phụ tùng (đề xuất khi chẩn đoán, lập báo giá)
        Route::get('parts', [PartController::class, 'index']);
    });

    /*
    |--------------------------------------------------------------------------
    | Advisor
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:'.Account::ROLE_ADVISOR)->group(function (): void {

        /*
        |--------------------------------------------------------------------------
        | Repair Orders
        |--------------------------------------------------------------------------
        */

        Route::get('technicians', [TechnicianController::class, 'index']);

        // Tải ảnh bằng chứng lên disk private (D-007).
        Route::post('media', [MediaController::class, 'store'])->middleware('throttle:60,1');

        Route::controller(RepairOrderController::class)->group(function (): void {

            Route::post('repair-orders', 'store');

            Route::prefix('repair-orders/{repairOrder}')->group(function (): void {
                Route::post('assign-technician', 'assignTechnician');
                Route::post('start-repair', 'startRepair');
                Route::post('waiting-for-parts', 'markWaitingForParts');
                Route::post('resume', 'resume');
                Route::post('review', 'review');
                Route::post('complete', 'complete');
                Route::post('close', 'close');
                Route::post('hand-over', 'handOver');
            });
        });

        /*
        |--------------------------------------------------------------------------
        | Quotations
        |--------------------------------------------------------------------------
        */

        Route::controller(QuotationController::class)->group(function (): void {

            Route::post(
                'repair-orders/{repairOrder}/quotations',
                'store'
            );

            // P5: dịch vụ nhanh — báo giá niêm yết, bỏ chẩn đoán, khách vẫn duyệt giá.
            Route::post('repair-orders/{repairOrder}/quick-quotation', 'quick');

            // Phản hồi báo giá chỉ do khách thực hiện: POST /me/quotations/{id}/respond
            // (CustomerRepairOrderController). Không có route nào cho nhân viên duyệt thay khách.
            Route::prefix('quotations/{quotation}')->group(function (): void {
                Route::post('send', 'send');
            });
        });

        // Biên bản giao nhận xe (P2: CHECK_IN). Khách xác nhận qua tài khoản hoặc OTP email chủ xe.
        Route::controller(HandoverController::class)->group(function (): void {
            Route::get('repair-orders/{repairOrder}/handovers', 'index');
            Route::post('repair-orders/{repairOrder}/handovers', 'store');
            Route::patch('handovers/{handover}', 'update');
            Route::post('handovers/{handover}/submit', 'submit');
            Route::post('handovers/{handover}/void', 'void');
            Route::post('handovers/{handover}/otp', 'requestOtp')->middleware('throttle:5,1');
            Route::post('handovers/{handover}/verify-otp', 'verifyOtp')->middleware('throttle:10,1');
        });

        // Khách duyệt tại quầy: OTP gửi email chủ xe, gắn với đúng lựa chọn từng dòng (D-005, D-008).
        Route::controller(QuotationConfirmationController::class)->prefix('quotations/{quotation}')->group(function (): void {
            Route::post('otp', 'requestOtp')->middleware('throttle:5,1');
            Route::post('verify-otp', 'verifyOtp')->middleware('throttle:10,1');
        });

        /*
        |--------------------------------------------------------------------------
        | Invoice
        |--------------------------------------------------------------------------
        */

        Route::controller(InvoiceController::class)->prefix('repair-orders/{repairOrder}/invoice')->group(function (): void {
            Route::get('/', 'show');
            Route::post('/', 'store');
        });

        /*
        |--------------------------------------------------------------------------
        | Payment
        |--------------------------------------------------------------------------
        */

        Route::controller(PaymentController::class)->group(function (): void {

            // Ghi nhận thanh toán DIRECT / QR
            Route::post(
                'invoices/{invoice}/payments',
                'store'
            );

            // Tạm thời Advisor xác nhận QR
            Route::post(
                'payments/{payment}/confirm-qr',
                'confirmQr'
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | Inspections: KTV hoặc Cố vấn ghi kết quả kiểm tra / chẩn đoán
    |--------------------------------------------------------------------------
    | Gara không dùng màn hình KTV thì Cố vấn nhập thay. KTV chỉ thao tác
    | trên phiếu mình được giao (InspectionController::denyUnassignedTechnician).
    */

    Route::middleware('role:'.Account::ROLE_ADVISOR.','.Account::ROLE_TECHNICIAN)->group(function (): void {

        Route::controller(InspectionController::class)->group(function (): void {

            Route::post(
                'repair-orders/{repairOrder}/inspections',
                'store'
            );

            Route::post(
                'repair-orders/{repairOrder}/inspections/recommendations',
                'addRecommendation'
            );

            Route::post(
                'repair-orders/{repairOrder}/inspections/complete',
                'complete'
            );
        });
    });
});
