<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Theo dõi nhân viên xử lý lịch hẹn: ai tạo hộ, ai xử lý gần nhất (xác nhận / tiếp nhận / đổi / hủy).
 * Lịch sử chi tiết từng thao tác ghi ở audit_logs (auditable = Appointment). Chỉ thêm cột nullable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table): void {
            $table->foreignId('created_by_account_id')->nullable()->after('cancel_reason')->constrained('accounts')->nullOnDelete();
            $table->foreignId('handled_by_account_id')->nullable()->after('created_by_account_id')->constrained('accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('handled_by_account_id');
            $table->dropConstrainedForeignId('created_by_account_id');
        });
    }
};
