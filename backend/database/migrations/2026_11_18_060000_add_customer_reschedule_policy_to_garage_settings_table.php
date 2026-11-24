<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Giới hạn khách TỰ đổi lịch trên web (Admin chỉnh được): số lần tối đa mỗi lịch + phải còn ít nhất N giờ trước giờ hẹn.
 * Chỉ thêm cột có giá trị mặc định — không đụng dữ liệu cũ.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('garage_settings', function (Blueprint $table): void {
            $table->unsignedTinyInteger('customer_reschedule_limit')->default(2)->after('booking_slots');
            $table->unsignedSmallInteger('customer_reschedule_cutoff_hours')->default(12)->after('customer_reschedule_limit');
        });
    }

    public function down(): void
    {
        Schema::table('garage_settings', function (Blueprint $table): void {
            $table->dropColumn(['customer_reschedule_limit', 'customer_reschedule_cutoff_hours']);
        });
    }
};
