<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P2 — Tiếp nhận: đổi xe so với lịch hẹn, nguồn tiếp nhận, bắt buộc biên bản CHECK_IN.
 * Chỉ thêm cột nullable / có mặc định. Phiếu cũ: requires_check_in = false (không bắt bổ sung ngược).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('repair_orders', function (Blueprint $table): void {
            $table->foreignId('booked_vehicle_id')->nullable()->after('vehicle_id')->constrained('vehicles');
            $table->string('vehicle_change_reason', 500)->nullable()->after('booked_vehicle_id');
            $table->string('source', 20)->nullable()->after('appointment_id');
            $table->boolean('requires_check_in')->default(false)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('repair_orders', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('booked_vehicle_id');
            $table->dropColumn(['vehicle_change_reason', 'source', 'requires_check_in']);
        });
    }
};
