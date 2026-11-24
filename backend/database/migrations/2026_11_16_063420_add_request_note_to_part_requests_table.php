<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ADV-01 (D-020): cố vấn báo thiếu phụ tùng kèm lý do (ví dụ phát hiện khi đang sửa) để Admin / kho đặt hàng.
 * Chỉ thêm cột nullable — yêu cầu cũ (tự tạo khi thiếu hàng) giữ nguyên.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('part_requests', function (Blueprint $table): void {
            $table->string('request_note', 500)->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('part_requests', function (Blueprint $table): void {
            $table->dropColumn('request_note');
        });
    }
};
