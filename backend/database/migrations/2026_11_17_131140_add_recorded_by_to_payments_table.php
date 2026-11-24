<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Người ghi nhận khoản thu tại quầy (tiền mặt / chuyển khoản / thẻ / ví — PO 17/11/2026).
 * Chỉ thêm cột nullable; VNPay (khách tự trả) để trống.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('recorded_by')->nullable()->after('status')->constrained('accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recorded_by');
        });
    }
};
