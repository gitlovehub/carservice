<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P1A — Ảnh bằng chứng (biên bản, checklist, chẩn đoán, phát sinh).
 * Lưu ở disk private (D-007); tải qua API có kiểm quyền. Không xóa cứng (soft delete).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_attachments', function (Blueprint $table): void {
            $table->id();
            $table->morphs('attachable');
            $table->string('disk', 30)->default('local');
            $table->string('path')->unique();
            $table->string('original_name')->nullable();
            $table->string('mime', 100);
            $table->unsignedInteger('size_bytes');
            $table->char('sha256', 64)->index();
            $table->string('caption')->nullable();
            // Vị trí trên xe (vd. FRONT, REAR, LEFT, RIGHT) — dùng cho ảnh biên bản.
            $table->string('position_code', 50)->nullable();
            $table->timestamp('taken_at')->nullable();
            $table->foreignId('uploaded_by_account_id')->constrained('accounts');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_attachments');
    }
};
