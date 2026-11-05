<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lưu giá ước tính khách nhìn thấy lúc đặt lịch, để admin đổi giá sau đó
     * không làm thay đổi lịch hẹn cũ. Giá chính thức vẫn chốt qua báo giá.
     */
    public function up(): void
    {
        Schema::table('appointment_services', function (Blueprint $table): void {
            $table->decimal('estimated_price', 12, 2)->nullable();
        });

        Schema::table('appointment_packages', function (Blueprint $table): void {
            $table->decimal('estimated_price', 12, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('appointment_services', function (Blueprint $table): void {
            $table->dropColumn('estimated_price');
        });

        Schema::table('appointment_packages', function (Blueprint $table): void {
            $table->dropColumn('estimated_price');
        });
    }
};
