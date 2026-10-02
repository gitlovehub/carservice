<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\InspectionController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\QuotationController;
use App\Http\Controllers\Api\RepairOrderController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\WorkItemController;
use App\Models\Account;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

// Đăng ký
Route::post('/register', [AuthController::class, 'register'])
    ->middleware('throttle:5,1');

// Đăng nhập
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');


/*
|--------------------------------------------------------------------------
| Protected Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function (): void {

    /*
    |--------------------------------------------------------------------------
    | Auth
    |--------------------------------------------------------------------------
    */

    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    /*
    |--------------------------------------------------------------------------
    | Customers
    |--------------------------------------------------------------------------
    */

    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/customers', [CustomerController::class, 'store']);
    Route::get('/customers/{id}', [CustomerController::class, 'show']);
    Route::put('/customers/{id}', [CustomerController::class, 'update']);
    Route::delete('/customers/{customer}', [CustomerController::class, 'destroy']);


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

        Route::get('/repair-orders', [RepairOrderController::class, 'index']);
        Route::post('/repair-orders', [RepairOrderController::class, 'store']);
        Route::get('/repair-orders/{repairOrder}', [RepairOrderController::class, 'show']);

        Route::post(
            '/repair-orders/{repairOrder}/assign-technician',
            [RepairOrderController::class, 'assignTechnician']
        );

        Route::post(
            '/repair-orders/{repairOrder}/start-repair',
            [RepairOrderController::class, 'startRepair']
        );

        Route::post(
            '/repair-orders/{repairOrder}/waiting-for-parts',
            [RepairOrderController::class, 'markWaitingForParts']
        );

        Route::post(
            '/repair-orders/{repairOrder}/resume',
            [RepairOrderController::class, 'resume']
        );

        Route::post(
            '/repair-orders/{repairOrder}/review',
            [RepairOrderController::class, 'review']
        );

        Route::post(
            '/repair-orders/{repairOrder}/complete',
            [RepairOrderController::class, 'complete']
        );

        Route::post(
            '/repair-orders/{repairOrder}/close',
            [RepairOrderController::class, 'close']
        );

        Route::post(
            '/repair-orders/{repairOrder}/hand-over',
            [RepairOrderController::class, 'handOver']
        );


        /*
        |--------------------------------------------------------------------------
        | Quotations
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/repair-orders/{repairOrder}/quotations',
            [QuotationController::class, 'store']
        );

        Route::post(
            '/quotations/{quotation}/send',
            [QuotationController::class, 'send']
        );

        Route::post(
            '/quotations/{quotation}/respond',
            [QuotationController::class, 'respond']
        );


        /*
        |--------------------------------------------------------------------------
        | Work Items / Used Parts
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/repair-orders/{repairOrder}/work-items',
            [WorkItemController::class, 'index']
        );

        Route::patch(
            '/work-items/{workItem}/status',
            [WorkItemController::class, 'updateStatus']
        );

        Route::post(
            '/repair-orders/{repairOrder}/used-parts',
            [WorkItemController::class, 'storeUsedPart']
        );


        /*
        |--------------------------------------------------------------------------
        | Invoice
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/repair-orders/{repairOrder}/invoice',
            [InvoiceController::class, 'store']
        );

        Route::get(
            '/repair-orders/{repairOrder}/invoice',
            [InvoiceController::class, 'show']
        );


        /*
        |--------------------------------------------------------------------------
        | Payments
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/invoices/{invoice}/payments',
            [PaymentController::class, 'store']
        );
    });


    /*
    |--------------------------------------------------------------------------
    | Technician
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:'.Account::ROLE_TECHNICIAN)->group(function (): void {

        Route::post(
            '/repair-orders/{repairOrder}/inspections',
            [InspectionController::class, 'store']
        );
    });


    /*
    |--------------------------------------------------------------------------
    | Payment Confirmation
    |--------------------------------------------------------------------------
    */

    Route::post(
        '/payments/{payment}/confirm-qr',
        [PaymentController::class, 'confirmQr']
    );

    /*
    |--------------------------------------------------------------------------
    | Vehicles
    |--------------------------------------------------------------------------
    */

    Route::get('/vehicles', [VehicleController::class, 'index']);
    Route::post('/vehicles', [VehicleController::class, 'store']);
    Route::get('/vehicles/{id}', [VehicleController::class, 'show']);
    Route::put('/vehicles/{id}', [VehicleController::class, 'update']);
    Route::delete('/vehicles/{id}', [VehicleController::class, 'destroy']);
    Route::get('/customers/{customerId}/vehicles', [VehicleController::class, 'byCustomer']);
});