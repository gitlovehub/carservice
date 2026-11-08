<?php

namespace Tests\Feature;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/** P1A-01 — bảng bằng chứng: ảnh, OTP xác nhận, xác nhận của khách. */
class EvidenceSchemaTest extends TestCase
{
    use RefreshDatabase;

    private const MIGRATIONS = [
        'media_attachments' => '2026_11_08_100000_create_media_attachments_table.php',
        'confirmation_otps' => '2026_11_08_100100_create_confirmation_otps_table.php',
        'customer_confirmations' => '2026_11_08_100200_create_customer_confirmations_table.php',
    ];

    public function test_media_attachments_table_has_evidence_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('media_attachments', [
            'attachable_type', 'attachable_id', 'disk', 'path', 'original_name', 'mime', 'size_bytes',
            'sha256', 'caption', 'position_code', 'taken_at', 'uploaded_by_account_id', 'deleted_at',
        ]));
    }

    public function test_confirmation_otps_table_binds_code_to_target_and_content(): void
    {
        $this->assertTrue(Schema::hasColumns('confirmation_otps', [
            'customer_id', 'purpose', 'target_type', 'target_id', 'content_sha256', 'code_hash',
            'sent_to_email', 'expires_at', 'attempts', 'used_at', 'requested_by_account_id',
        ]));
        $this->assertNotContains('code', Schema::getColumnListing('confirmation_otps'), 'OTP must never be stored in plain text');
    }

    public function test_customer_confirmations_table_records_method_hash_and_context(): void
    {
        $this->assertTrue(Schema::hasColumns('customer_confirmations', [
            'confirmable_type', 'confirmable_id', 'customer_id', 'method', 'confirmation_otp_id',
            'content_sha256', 'ip_address', 'user_agent', 'witness_employee_id', 'confirmed_at', 'comment',
        ]));
    }

    public function test_evidence_migrations_roll_back_and_reapply_cleanly(): void
    {
        $migrations = array_map(
            fn (string $file): Migration => require database_path('migrations/'.$file),
            self::MIGRATIONS,
        );

        foreach (array_reverse($migrations, true) as $table => $migration) {
            $migration->down();
            $this->assertFalse(Schema::hasTable($table), "$table should be dropped by down()");
        }

        foreach ($migrations as $table => $migration) {
            $migration->up();
            $this->assertTrue(Schema::hasTable($table), "$table should be recreated by up()");
        }
    }
}
