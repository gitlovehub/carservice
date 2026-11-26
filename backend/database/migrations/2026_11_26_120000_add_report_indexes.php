<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Index cho các cột lọc theo khoảng ngày ở Tổng quan / Báo cáo / Nhật ký (Admin) và danh sách phiếu.
 * Chỉ thêm index, không đổi dữ liệu.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('repair_orders', fn (Blueprint $table) => $table->index('received_at'));
        Schema::table('invoices', fn (Blueprint $table) => $table->index('created_at'));
        Schema::table('payments', fn (Blueprint $table) => $table->index(['status', 'paid_at']));
        Schema::table('audit_logs', fn (Blueprint $table) => $table->index('created_at'));
    }

    public function down(): void
    {
        Schema::table('repair_orders', fn (Blueprint $table) => $table->dropIndex(['received_at']));
        Schema::table('invoices', fn (Blueprint $table) => $table->dropIndex(['created_at']));
        Schema::table('payments', fn (Blueprint $table) => $table->dropIndex(['status', 'paid_at']));
        Schema::table('audit_logs', fn (Blueprint $table) => $table->dropIndex(['created_at']));
    }
};
