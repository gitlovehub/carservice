<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Biển số / VIN chỉ cần duy nhất trong các xe đang hoạt động (App\Support\VehicleIdentity).
 * Cột ảo chỉ mang giá trị khi xe chưa bị xoá mềm; unique trên cột ảo bỏ qua NULL nên xe đã xoá
 * giữ nguyên biển số / VIN (lịch sử sửa chữa còn nguyên) mà không chặn chủ mới đăng ký lại xe.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropUnique('vehicles_license_plate_unique');
            $table->dropUnique('vehicles_vin_unique');
            $table->index('license_plate');
            $table->index('vin');
        });

        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('active_license_plate', 20)->nullable()
                ->virtualAs('CASE WHEN deleted_at IS NULL THEN license_plate END');
            $table->string('active_vin', 50)->nullable()
                ->virtualAs('CASE WHEN deleted_at IS NULL THEN vin END');
        });

        Schema::table('vehicles', function (Blueprint $table) {
            $table->unique('active_license_plate');
            $table->unique('active_vin');
        });
    }

    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropUnique(['active_license_plate']);
            $table->dropUnique(['active_vin']);
        });

        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn(['active_license_plate', 'active_vin']);
        });

        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropIndex(['license_plate']);
            $table->dropIndex(['vin']);
            $table->unique('license_plate');
            $table->unique('vin');
        });
    }
};
