<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P1A — Bằng chứng khách xác nhận một nội dung (báo giá, biên bản, ủy quyền nhận xe).
 * Chỉ thêm, không sửa. method: ACCOUNT (khách tự bấm trong tài khoản) | EMAIL_OTP (tại quầy).
 * Không có SIGNATURE trong P1 (D-012); có thể thêm cột sau, không phá dữ liệu.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_confirmations', function (Blueprint $table): void {
            $table->id();
            $table->morphs('confirmable');
            $table->foreignId('customer_id')->constrained('customers');
            $table->string('method', 20);
            $table->foreignId('confirmation_otp_id')->nullable()->constrained('confirmation_otps');
            $table->char('content_sha256', 64);
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            // Nhân viên có mặt khi khách xác nhận tại quầy (EMAIL_OTP).
            $table->foreignId('witness_employee_id')->nullable()->constrained('employees');
            $table->timestamp('confirmed_at');
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'confirmed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_confirmations');
    }
};
