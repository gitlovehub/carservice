<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Danh mục xe 3 cấp: Hãng → Dòng xe → Phiên bản (trim).
 *
 * - Thêm bảng vehicle_trims (thuộc vehicle_models).
 * - vehicles.trim_id (tùy chọn): phiên bản xe khách chọn từ danh mục; cột variant cũ giữ nguyên.
 * - source: nguồn dữ liệu (CSV = nạp từ file khởi tạo, NULL = có sẵn / admin tự thêm).
 * - Chỉ thêm, không sửa/xóa dữ liệu cũ.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_trims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('model_id')->constrained('vehicle_models');
            $table->string('name', 150);
            // ACTIVE, INACTIVE (ẩn khỏi bộ chọn xe, vẫn giữ cho xe đã lưu)
            $table->string('status', 20)->default('ACTIVE');
            $table->string('source', 20)->nullable();
            $table->timestamps();

            $table->unique(['model_id', 'name'], 'uk_vehicle_trim');
            $table->index(['model_id', 'status']);
        });

        Schema::table('vehicles', function (Blueprint $table) {
            $table->foreignId('trim_id')->nullable()->after('model_id')->constrained('vehicle_trims');
        });

        Schema::table('vehicle_brands', function (Blueprint $table) {
            $table->string('source', 20)->nullable()->after('status');
            $table->index('status');
        });

        Schema::table('vehicle_models', function (Blueprint $table) {
            $table->string('source', 20)->nullable()->after('status');
            $table->index(['brand_id', 'status']);
        });

        // Một hãng không có hai dòng xe trùng tên. Chỉ thêm khi dữ liệu hiện tại chưa trùng,
        // để migration không hỏng trên môi trường có dữ liệu cũ (ứng dụng vẫn kiểm tra trùng).
        $hasDuplicates = DB::table('vehicle_models')
            ->select('brand_id', 'name')
            ->groupBy('brand_id', 'name')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if (! $hasDuplicates) {
            Schema::table('vehicle_models', function (Blueprint $table) {
                $table->unique(['brand_id', 'name'], 'uk_vehicle_model_brand_name');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasIndex('vehicle_models', 'uk_vehicle_model_brand_name')) {
            Schema::table('vehicle_models', function (Blueprint $table) {
                $table->dropUnique('uk_vehicle_model_brand_name');
            });
        }

        Schema::table('vehicle_models', function (Blueprint $table) {
            $table->dropIndex(['brand_id', 'status']);
            $table->dropColumn('source');
        });

        Schema::table('vehicle_brands', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropColumn('source');
        });

        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropConstrainedForeignId('trim_id');
        });

        Schema::dropIfExists('vehicle_trims');
    }
};
