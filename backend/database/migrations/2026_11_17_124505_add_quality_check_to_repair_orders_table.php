<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kiểm tra sau sửa chữa (PO 17/11/2026: bắt buộc trước khi bàn giao xe).
 * Chỉ thêm cột nullable — không đổi dữ liệu cũ.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('repair_orders', function (Blueprint $table) {
            $table->json('quality_check')->nullable()->after('estimated_ready_at');
            $table->timestamp('quality_checked_at')->nullable()->after('quality_check');
            $table->foreignId('quality_checked_by')->nullable()->after('quality_checked_at')->constrained('accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('repair_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('quality_checked_by');
            $table->dropColumn(['quality_check', 'quality_checked_at']);
        });
    }
};
