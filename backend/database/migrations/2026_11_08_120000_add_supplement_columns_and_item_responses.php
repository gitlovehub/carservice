<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P3 — Báo giá phát sinh (SUPPLEMENT) và lịch sử từng lần khách duyệt / từ chối.
 * Chỉ thêm: quotations.type mặc định INITIAL (báo giá cũ giữ nguyên ý nghĩa);
 * quotation_items.is_approved vẫn là giá trị hiện hành (tương thích ngược).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotations', function (Blueprint $table): void {
            $table->string('type', 20)->default('INITIAL')->after('version');
            $table->foreignId('parent_quotation_id')->nullable()->after('type')->constrained('quotations');
            $table->string('reason', 1000)->nullable()->after('parent_quotation_id');
        });

        Schema::create('quotation_item_responses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('quotation_item_id')->constrained('quotation_items')->cascadeOnDelete();
            $table->string('decision', 20);
            $table->foreignId('customer_confirmation_id')->constrained('customer_confirmations');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['quotation_item_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotation_item_responses');
        Schema::table('quotations', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('parent_quotation_id');
            $table->dropColumn(['type', 'reason']);
        });
    }
};
