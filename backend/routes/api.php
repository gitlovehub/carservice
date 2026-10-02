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
| Public
|--------------------------------------------------------------------------
*/

Route::post('register', [AuthController::class, 'register'])
    ->middleware('throttle:5,1');

Route::post('login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1');


/*
|--------------------------------------------------------------------------
| Authenticated
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function (): void {

    // Auth
    Route::get('me', [AuthController::class, 'me']);
    Route::post('logout', [AuthController::class, 'logout']);


    /*
    |--------------------------------------------------------------------------
    | Advisor + Admin
    |--------------------------------------------------------------------------
    */

    Route::middleware(
        'role:'.Account::ROLE_ADVISOR.','.Account::ROLE_ADMIN
    )->group(function (): void {

        // Customer CRUD (không bao gồm delete)
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

    Route::middleware('role:'.Account::ROLE_ADMIN)
        ->delete('customers/{customer}', [CustomerController::class, 'destroy']);


    /*
    |--------------------------------------------------------------------------
    | Advisor
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:'.Account::ROLE_ADVISOR)
        ->group(function (): void {

            // Repair Orders
            Route::get('repair-orders', [RepairOrderController::class, 'index']);
            Route::post('repair-orders', [RepairOrderController::class, 'store']);
            Route::get('repair-orders/{repairOrder}', [RepairOrderController::class, 'show']);

            Route::prefix('repair-orders/{repairOrder}')->group(function (): void {
                Route::post('assign-technician', [RepairOrderController::class, 'assignTechnician']);
                Route::post('start-repair', [RepairOrderController::class, 'startRepair']);
                Route::post('waiting-for-parts', [RepairOrderController::class, 'markWaitingForParts']);
                Route::post('resume', [RepairOrderController::class, 'resume']);
                Route::post('review', [RepairOrderController::class, 'review']);
                Route::post('complete', [RepairOrderController::class, 'complete']);
                Route::post('close', [RepairOrderController::class, 'close']);
                Route::post('hand-over', [RepairOrderController::class, 'handOver']);

                Route::post('quotations', [QuotationController::class, 'store']);

                Route::get('work-items', [WorkItemController::class, 'index']);
                Route::post('used-parts', [WorkItemController::class, 'storeUsedPart']);

                Route::post('invoice', [InvoiceController::class, 'store']);
                Route::get('invoice', [InvoiceController::class, 'show']);
            });

            // Quotations
            Route::prefix('quotations/{quotation}')->group(function (): void {
                Route::post('send', [QuotationController::class, 'send']);
                Route::post('respond', [QuotationController::class, 'respond']);
            });

            // Work Items
            Route::patch(
                'work-items/{workItem}/status',
                [WorkItemController::class, 'updateStatus']
            );

            // Payments
            Route::post(
                'invoices/{invoice}/payments',
                [PaymentController::class, 'store']
            );
        });


    /*
    |--------------------------------------------------------------------------
    | Technician
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:'.Account::ROLE_TECHNICIAN)
        ->post(
            'repair-orders/{repairOrder}/inspections',
            [InspectionController::class, 'store']
        );


    /*
    |--------------------------------------------------------------------------
    | Payment
    |--------------------------------------------------------------------------
    | Tạm giữ nguyên quyền hiện tại, sẽ rà soát PaymentController riêng.
    */

    Route::post(
        'payments/{payment}/confirm-qr',
        [PaymentController::class, 'confirmQr']
    );
});