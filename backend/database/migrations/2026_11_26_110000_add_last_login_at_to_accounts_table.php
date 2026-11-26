<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * "Đăng nhập gần nhất" (Admin → Tài khoản) ghi thẳng lúc đăng nhập thay vì suy ra từ token
 * (token bị xoá khi đăng xuất / hết hạn 24 giờ nên mất dấu). Điền sẵn từ token còn lại.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->timestamp('last_login_at')->nullable()->after('status');
        });

        DB::table('accounts')->update([
            'last_login_at' => DB::table('personal_access_tokens')
                ->selectRaw('MAX(created_at)')
                ->where('tokenable_type', 'App\\Models\\Account')
                ->whereColumn('tokenable_id', 'accounts.id'),
        ]);
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn('last_login_at');
        });
    }
};
