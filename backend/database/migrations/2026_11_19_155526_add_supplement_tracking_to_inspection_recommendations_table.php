<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Đề xuất bổ sung sau khi đã hoàn tất chẩn đoán (PO 19/11/2026): chỉ trước khi bắt đầu sửa, bắt buộc lý do,
 * ghi vết người bổ sung để phân biệt với đề xuất gốc của bước chẩn đoán.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspection_recommendations', function (Blueprint $table) {
            $table->boolean('added_after_completion')->default(false)->after('note');
            $table->foreignId('added_by_account_id')->nullable()->after('added_after_completion')->constrained('accounts')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('inspection_recommendations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('added_by_account_id');
            $table->dropColumn('added_after_completion');
        });
    }
};
