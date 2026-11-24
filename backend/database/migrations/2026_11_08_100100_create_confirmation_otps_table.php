<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P1A — OTP gửi email chủ xe để xác nhận một nội dung đã khóa (D-005, D-008).
 * Theo mẫu password_reset_otps. content_sha256 = hash nội dung tại thời điểm gửi;
 * nội dung đổi sau khi gửi thì xác nhận phải thất bại.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('confirmation_otps', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            // Vd. QUOTATION_RESPONSE, CHECK_IN, CHECK_OUT, PICKUP_AUTHORIZATION.
            $table->string('purpose', 40);
            $table->morphs('target');
            $table->char('content_sha256', 64);
            $table->string('code_hash');
            $table->string('sent_to_email');
            $table->timestamp('expires_at');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('used_at')->nullable();
            $table->foreignId('requested_by_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->timestamps();

            $table->index(['target_type', 'target_id', 'purpose'], 'idx_confirmation_otp_target');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('confirmation_otps');
    }
};
