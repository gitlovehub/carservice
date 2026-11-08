<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** P7 — công suất gara theo phút / ngày (Q6: chỉ cảnh báo). Cột nullable: chưa cấu hình thì không cảnh báo. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('working_hours', function (Blueprint $table): void {
            $table->unsignedInteger('daily_capacity_minutes')->nullable()->after('max_slots');
            $table->unsignedTinyInteger('bay_count')->nullable()->after('daily_capacity_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('working_hours', function (Blueprint $table): void {
            $table->dropColumn(['daily_capacity_minutes', 'bay_count']);
        });
    }
};
