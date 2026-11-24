<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * P2 — Biên bản giao nhận xe (CHECK_IN khi nhận, CHECK_OUT khi trả — P4).
 * DRAFT (sửa được) → SUBMITTED (chờ khách xác nhận, khóa nội dung) → CONFIRMED; VOID kèm lý do.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_handovers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('repair_order_id')->constrained('repair_orders');
            $table->string('type', 20);
            $table->string('status', 20)->default('DRAFT');
            $table->foreignId('vehicle_id')->constrained('vehicles');
            $table->unsignedInteger('mileage')->nullable();
            $table->string('fuel_level', 20)->nullable();
            $table->text('general_condition')->nullable();
            $table->string('valuables_note', 1000)->nullable();
            // Người giao (CHECK_IN) / người nhận (CHECK_OUT) xe.
            $table->string('person_name', 150);
            $table->string('person_phone', 20)->nullable();
            $table->char('person_id_last4', 4)->nullable();
            $table->string('person_relation', 20);
            // P4 thêm khóa ngoại tới pickup_authorizations.
            $table->unsignedBigInteger('pickup_authorization_id')->nullable();
            $table->foreignId('staff_employee_id')->constrained('employees');
            $table->foreignId('compared_handover_id')->nullable()->constrained('vehicle_handovers');
            $table->json('snapshot')->nullable();
            $table->char('snapshot_sha256', 64)->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->text('void_reason')->nullable();
            $table->timestamps();

            $table->index(['repair_order_id', 'type', 'status']);
        });

        Schema::create('handover_checklist_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('vehicle_handover_id')->constrained('vehicle_handovers')->cascadeOnDelete();
            $table->string('category', 20);
            $table->string('position_code', 50)->nullable();
            $table->string('label', 150);
            $table->string('condition', 20);
            $table->unsignedSmallInteger('quantity')->nullable();
            $table->string('note', 500)->nullable();
            $table->boolean('is_discrepancy')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('handover_checklist_items');
        Schema::dropIfExists('vehicle_handovers');
    }
};
