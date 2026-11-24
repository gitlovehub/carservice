<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Thông tin gara (một bản ghi): tên, liên hệ, địa chỉ + tọa độ chọn từ gợi ý bản đồ (Goong / OpenStreetMap). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('garage_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 150);
            $table->string('phone', 30)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('address_line', 255)->nullable();
            $table->string('ward', 120)->nullable();
            $table->string('district', 120)->nullable();
            $table->string('province', 120)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('place_provider', 20)->nullable();
            $table->string('place_id', 255)->nullable();
            $table->foreignId('updated_by_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('garage_settings');
    }
};
