<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hạng mục báo giá "bắt buộc" (PO 19/11/2026): không làm thì gara không thể làm các hạng mục còn lại (an toàn / kỹ thuật).
 * Khách từ chối một hạng mục bắt buộc = từ chối toàn bộ báo giá.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quotation_items', function (Blueprint $table) {
            $table->boolean('is_required')->default(false)->after('amount');
            $table->string('required_reason', 255)->nullable()->after('is_required');
        });
    }

    public function down(): void
    {
        Schema::table('quotation_items', function (Blueprint $table) {
            $table->dropColumn(['is_required', 'required_reason']);
        });
    }
};
