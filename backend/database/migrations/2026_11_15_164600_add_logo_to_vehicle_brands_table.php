<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Logo hãng do Admin dán link → server tách nền + cắt gọn thành PNG 256×256 trong suốt.
     * Lưu thẳng trong DB (base64, ~5–60KB) để không mất khi deploy lại (ổ đĩa Railway không bền).
     */
    public function up(): void
    {
        Schema::table('vehicle_brands', function (Blueprint $table) {
            $table->longText('logo_png')->nullable();
            // Mốc đổi logo — dùng làm phiên bản trong URL ảnh để trình duyệt tải lại khi đổi.
            $table->timestamp('logo_updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('vehicle_brands', function (Blueprint $table) {
            $table->dropColumn(['logo_png', 'logo_updated_at']);
        });
    }
};
