<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lịch sử phản hồi đánh giá: chỉ ghi thêm. Không backfill nên các đánh giá hiện có giữ nguyên.
     */
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->timestamp('reply_edited_at')->nullable()->after('replied_at');
        });

        Schema::create('review_reply_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->constrained('reviews')->restrictOnDelete();
            // NULL = lần phản hồi đầu tiên.
            $table->text('old_reply')->nullable();
            $table->text('new_reply');
            $table->foreignId('edited_by_account_id')->constrained('accounts')->restrictOnDelete();
            // Giữ tên tại thời điểm sửa để truy vết đúng dù hồ sơ đổi tên sau này.
            $table->string('edited_by_name');
            // useCurrent: tránh MySQL tự gắn ON UPDATE làm đổi thời điểm đã ghi.
            $table->timestamp('edited_at')->useCurrent();

            $table->index(['review_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('review_reply_revisions');

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn('reply_edited_at');
        });
    }
};
