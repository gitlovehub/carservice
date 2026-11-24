<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lời khách kể tại quầy tách khỏi tình trạng xe; báo giá ghi việc xe phải lưu xưởng qua đêm.
     */
    public function up(): void
    {
        Schema::table('repair_orders', function (Blueprint $table): void {
            $table->text('customer_request')->nullable()->after('initial_condition');
        });
        Schema::table('quotations', function (Blueprint $table): void {
            $table->boolean('stays_overnight')->default(false)->after('reason');
        });
    }

    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table): void {
            $table->dropColumn('stays_overnight');
        });
        Schema::table('repair_orders', function (Blueprint $table): void {
            $table->dropColumn('customer_request');
        });
    }
};
