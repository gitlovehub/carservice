<?php

use App\Http\Controllers\Api\AdvisorAppointmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\InspectionController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\QuotationController;
use App\Http\Controllers\Api\RepairOrderController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\WorkItemController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\MaintenancePackageController;
use App\Http\Controllers\Api\AdminServiceController;
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
        Route::post('logout', 'logout');
    });


    /*
    |--------------------------------------------------------------------------
    | Customer
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:' . Account::ROLE_CUSTOMER)->group(function (): void {

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
            Route::post('/', 'store');                // POST /api/appointments
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
        'role:' . Account::ROLE_ADVISOR . ',' . Account::ROLE_ADMIN
    )->group(function (): void {

        // Quản lý lịch hẹn của cố vấn
        // Quản lý lịch hẹn phía Cố vấn
        Route::prefix('advisor/appointments')->group(function (): void {
            Route::get('/', [AdvisorAppointmentController::class, 'index']);
            Route::get('/{id}', [AdvisorAppointmentController::class, 'show']);
            Route::post('/{id}/confirm', [AdvisorAppointmentController::class, 'confirm']);
            Route::post('/{id}/check-in', [AdvisorAppointmentController::class, 'checkIn']);
            Route::post('/{id}/cancel', [AdvisorAppointmentController::class, 'cancel']);
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

    Route::middleware('role:' . Account::ROLE_ADMIN)->group(function (): void {

        Route::apiResource('admin/services', AdminServiceController::class)
            ->only(['index', 'store', 'show', 'update', 'destroy']);

        // Xóa khách hàng
        Route::delete(
            'customers/{customer}',
            [CustomerController::class, 'destroy']
        );
    });


    /*
    |--------------------------------------------------------------------------
    | Advisor
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:' . Account::ROLE_ADVISOR)->group(function (): void {

        /*
        |--------------------------------------------------------------------------
        | Repair Orders
        |--------------------------------------------------------------------------
        */

        Route::controller(RepairOrderController::class)->group(function (): void {

            Route::get('repair-orders', 'index');
            Route::post('repair-orders', 'store');
            Route::get('repair-orders/{repairOrder}', 'show');

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

            Route::prefix('quotations/{quotation}')->group(function (): void {
                Route::post('send', 'send');
                Route::post('respond', 'respond');
            });
        });


        /*
        |--------------------------------------------------------------------------
        | Work Items / Used Parts
        |--------------------------------------------------------------------------
        */

        Route::controller(WorkItemController::class)->group(function (): void {

            Route::get(
                'repair-orders/{repairOrder}/work-items',
                'index'
            );

            Route::post(
                'repair-orders/{repairOrder}/used-parts',
                'storeUsedPart'
            );

            Route::patch(
                'work-items/{workItem}/status',
                'updateStatus'
            );
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
    | Technician
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:' . Account::ROLE_TECHNICIAN)->group(function (): void {

        /*
        |--------------------------------------------------------------------------
        | Inspections
        |--------------------------------------------------------------------------
        */

        Route::controller(InspectionController::class)->group(function (): void {

            Route::post(
                'repair-orders/{repairOrder}/inspections',
                'store'
            );
        });
    });
});