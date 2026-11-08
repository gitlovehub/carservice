<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P4 — Ủy quyền nhận xe (thiết kế N9): chủ xe khai báo trước trong tài khoản.
 * Tại quầy cố vấn đối chiếu 4 số cuối giấy tờ; chủ xe xác nhận biên bản CHECK_OUT (tài khoản / OTP email chủ xe).
 * vehicle_handovers.pickup_authorization_id (P2) tham chiếu bảng này; kiểm tra ở tầng ứng dụng
 * (không thêm khóa ngoại vào bảng cũ để migration chạy được trên SQLite test).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pickup_authorizations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('repair_order_id')->constrained('repair_orders');
            $table->foreignId('customer_id')->constrained('customers');
            $table->string('full_name', 150);
            $table->string('phone', 20);
            $table->char('id_last4', 4);
            $table->timestamp('valid_until')->nullable();
            $table->string('status', 20)->default('ACTIVE');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index(['repair_order_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pickup_authorizations');
    }
};
