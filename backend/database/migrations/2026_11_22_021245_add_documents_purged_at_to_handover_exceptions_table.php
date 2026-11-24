<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Ảnh giấy tờ tự xóa sau 90 ngày kể từ khi xử lý; yêu cầu và người duyệt vẫn được giữ lại. */
    public function up(): void
    {
        Schema::table('handover_exceptions', function (Blueprint $table): void {
            $table->string('id_document_path')->nullable()->change();
            $table->string('registration_path')->nullable()->change();
            $table->timestamp('documents_purged_at')->nullable()->after('registration_path');
        });
    }

    public function down(): void
    {
        DB::table('handover_exceptions')->whereNull('id_document_path')->update(['id_document_path' => '']);
        DB::table('handover_exceptions')->whereNull('registration_path')->update(['registration_path' => '']);
        Schema::table('handover_exceptions', function (Blueprint $table): void {
            $table->dropColumn('documents_purged_at');
            $table->string('id_document_path')->nullable(false)->change();
            $table->string('registration_path')->nullable(false)->change();
        });
    }
};
