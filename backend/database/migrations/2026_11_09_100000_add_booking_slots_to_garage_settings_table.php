<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Khung giờ khách được chọn khi đặt lịch, chia buổi sáng / chiều (admin chỉnh ở trang Giờ làm việc). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('garage_settings', function (Blueprint $table) {
            $table->json('booking_slots')->nullable()->after('place_id');
        });
    }

    public function down(): void
    {
        Schema::table('garage_settings', function (Blueprint $table) {
            $table->dropColumn('booking_slots');
        });
    }
};
