<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cột phục vụ hiển thị danh mục dịch vụ ở trang đặt lịch.
     */
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table): void {
            // Hiện trong nhóm "Phổ biến" ở đầu danh sách.
            $table->boolean('is_popular')->default(false)->after('status');

            // Thứ tự hiển thị trong nhóm; số nhỏ đứng trước.
            $table->unsignedInteger('sort_order')->default(0)->after('is_popular');
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table): void {
            $table->dropColumn(['is_popular', 'sort_order']);
        });
    }
};
