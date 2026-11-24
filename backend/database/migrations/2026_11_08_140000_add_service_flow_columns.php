<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P5 — Quy trình dịch vụ (bước + phút chuẩn), mức dịch vụ (QUICK / STANDARD / MAJOR), giờ dự kiến xong.
 * Chỉ thêm bảng / cột có mặc định hoặc nullable; dịch vụ cũ mặc định STANDARD (giữ nguyên luồng).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_steps', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->unsignedSmallInteger('step_order');
            $table->string('name', 150);
            $table->unsignedSmallInteger('standard_minutes')->default(0);
            $table->boolean('requires_photo')->default(false);
            $table->timestamps();

            $table->unique(['service_id', 'step_order']);
        });

        Schema::table('services', function (Blueprint $table): void {
            $table->string('service_level', 20)->default('STANDARD')->after('estimated_minutes');
            $table->boolean('requires_vehicle_stay')->default(true)->after('service_level');
        });

        Schema::table('work_items', function (Blueprint $table): void {
            $table->unsignedInteger('standard_minutes')->nullable()->after('description');
            $table->foreignId('service_step_id')->nullable()->after('service_id')->constrained('service_steps')->nullOnDelete();
        });

        Schema::table('repair_orders', function (Blueprint $table): void {
            $table->string('flow_type', 20)->nullable()->after('source');
            $table->timestamp('estimated_ready_at')->nullable()->after('received_at');
        });
    }

    public function down(): void
    {
        Schema::table('repair_orders', function (Blueprint $table): void {
            $table->dropColumn(['flow_type', 'estimated_ready_at']);
        });
        Schema::table('work_items', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('service_step_id');
            $table->dropColumn('standard_minutes');
        });
        Schema::table('services', function (Blueprint $table): void {
            $table->dropColumn(['service_level', 'requires_vehicle_stay']);
        });
        Schema::dropIfExists('service_steps');
    }
};
