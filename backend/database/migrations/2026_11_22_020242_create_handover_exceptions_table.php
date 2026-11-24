<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Ngoại lệ duy nhất: chủ xe mất quyền truy cập email, đến trực tiếp với giấy tờ; cố vấn lập, admin duyệt. */
    public function up(): void
    {
        Schema::create('handover_exceptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('vehicle_handover_id')->constrained('vehicle_handovers');
            $table->foreignId('requested_by_account_id')->constrained('accounts');
            $table->string('reason', 1000);
            $table->string('id_document_path');
            $table->string('registration_path');
            $table->string('status', 20)->default('PENDING');
            $table->foreignId('decided_by_account_id')->nullable()->constrained('accounts');
            $table->timestamp('decided_at')->nullable();
            $table->string('decision_note', 1000)->nullable();
            $table->timestamps();

            $table->index(['status', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('handover_exceptions');
    }
};
