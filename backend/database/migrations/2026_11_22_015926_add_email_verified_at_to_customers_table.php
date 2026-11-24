<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Email nhận mã xác nhận phải được xác minh. Hồ sơ trùng email tài khoản đã xác thực được tính là đã xác minh. */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            $table->timestamp('email_verified_at')->nullable()->after('email');
        });

        DB::table('customers')
            ->join('accounts', 'accounts.id', '=', 'customers.account_id')
            ->whereNotNull('customers.email')
            ->whereNotNull('accounts.email_verified_at')
            ->whereRaw('LOWER(customers.email) = LOWER(accounts.email)')
            ->select('customers.id', 'accounts.email_verified_at')
            ->get()
            ->each(fn ($row) => DB::table('customers')->where('id', $row->id)->update(['email_verified_at' => $row->email_verified_at]));
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            $table->dropColumn('email_verified_at');
        });
    }
};
