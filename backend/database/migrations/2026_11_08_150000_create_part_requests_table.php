<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P6 — Phụ tùng chờ: tự tạo khi khách đã duyệt dòng phụ tùng mà tồn kho không đủ.
 * REQUESTED → ORDERED (ETA) → RECEIVED (nhập kho); CANCELLED kèm lý do.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('part_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('repair_order_id')->constrained('repair_orders');
            $table->foreignId('quotation_item_id')->nullable()->constrained('quotation_items')->nullOnDelete();
            $table->foreignId('part_id')->constrained('parts');
            $table->unsignedInteger('quantity');
            $table->string('status', 20)->default('REQUESTED');
            $table->string('supplier_note', 1000)->nullable();
            $table->timestamp('ordered_at')->nullable();
            $table->date('eta_date')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->string('cancel_reason', 1000)->nullable();
            $table->foreignId('created_by_account_id')->nullable()->constrained('accounts')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'eta_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('part_requests');
    }
};
