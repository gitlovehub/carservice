<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Bỏ ghi chú nội bộ của phiếu sửa chữa (PO 22/11/2026). Rollback chỉ tạo lại cột rỗng.
     */
    public function up(): void
    {
        Schema::table('repair_orders', function (Blueprint $table): void {
            $table->dropColumn('note');
        });
    }

    public function down(): void
    {
        Schema::table('repair_orders', function (Blueprint $table): void {
            $table->text('note')->nullable();
        });
    }
};
