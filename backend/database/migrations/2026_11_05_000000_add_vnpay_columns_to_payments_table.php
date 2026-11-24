<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Bổ sung các cột phục vụ cổng thanh toán VNPay cho bảng payments.
     * Mọi cột đều nullable nên các giao dịch DIRECT/QR cũ không bị ảnh hưởng.
     */
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            // vnp_TxnRef do hệ thống sinh, duy nhất cho mỗi lần thanh toán (khóa chống xử lý trùng IPN).
            $table->string('gateway_txn_ref', 100)->nullable()->unique()->after('qr_reference');

            // vnp_ResponseCode / vnp_TransactionStatus nhận về từ VNPay.
            $table->string('gateway_response_code', 10)->nullable()->after('gateway_txn_ref');
            $table->string('gateway_transaction_status', 10)->nullable()->after('gateway_response_code');

            // vnp_BankCode: ngân hàng khách dùng để thanh toán.
            $table->string('bank_code', 30)->nullable()->after('gateway_transaction_status');

            // Dữ liệu VNPay trả về (đã loại bỏ vnp_SecureHash) để tra soát.
            $table->json('gateway_payload')->nullable()->after('bank_code');

            // Hạn của link thanh toán (vnp_ExpireDate).
            $table->timestamp('expires_at')->nullable()->after('paid_at');

            $table->timestamp('updated_at')->nullable()->after('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->dropUnique(['gateway_txn_ref']);
            $table->dropColumn([
                'gateway_txn_ref',
                'gateway_response_code',
                'gateway_transaction_status',
                'bank_code',
                'gateway_payload',
                'expires_at',
                'updated_at',
            ]);
        });
    }
};