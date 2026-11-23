<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Review;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use PDOException;
use RuntimeException;
use Tests\TestCase;

class ApiErrorHandlingTest extends TestCase
{
    use RefreshDatabase;

    private function assertNoInternals(string $body): void
    {
        foreach (['SQLSTATE', 'select ', 'App\\\\', 'Illuminate', 'vendor', '.php', 'trace', 'review_reply_revisions'] as $needle) {
            $this->assertStringNotContainsStringIgnoringCase($needle, $body);
        }
    }

    public function test_server_error_is_generic_logged_and_has_reference_even_with_debug_on(): void
    {
        config(['app.debug' => true]);
        Log::spy();
        Route::get('/api/_test/boom', fn () => throw new QueryException('mysql', 'select * from review_reply_revisions', [], new PDOException('SQLSTATE[42S02]: Base table not found')));

        $response = $this->getJson('/api/_test/boom')->assertStatus(500)
            ->assertJsonPath('success', false)
            ->assertJsonPath('code', 'SERVER_ERROR');

        $this->assertNotEmpty($response->json('reference'));
        $this->assertNoInternals($response->getContent());
        Log::shouldHaveReceived('error')->once();
    }

    public function test_lost_database_connection_returns_503(): void
    {
        Route::get('/api/_test/db-down', fn () => throw new QueryException('mysql', 'select 1', [], new PDOException('SQLSTATE[HY000] [2002] Connection refused')));

        $response = $this->getJson('/api/_test/db-down')->assertStatus(503)->assertJsonPath('code', 'SERVICE_UNAVAILABLE');
        $this->assertNoInternals($response->getContent());
    }

    public function test_status_codes_use_vietnamese_messages_without_framework_details(): void
    {
        $this->getJson('/api/me')->assertUnauthorized()->assertJsonPath('code', 'UNAUTHENTICATED');

        Sanctum::actingAs(Account::factory()->create(['role' => Account::ROLE_CUSTOMER]));
        $this->getJson('/api/admin/reviews')->assertForbidden()->assertJsonPath('code', 'FORBIDDEN');

        Sanctum::actingAs(Account::factory()->admin()->create());
        $missingModel = $this->getJson('/api/admin/reviews/999999/reply-history')->assertNotFound()->assertJsonPath('code', 'NOT_FOUND');
        $this->assertStringNotContainsString(Review::class, $missingModel->json('message'));
        $this->assertNoInternals($this->getJson('/api/route-khong-ton-tai')->assertNotFound()->getContent());
        $this->getJson('/api/admin/reviews?status=sai')->assertUnprocessable()->assertJsonPath('code', 'VALIDATION_ERROR')->assertJsonValidationErrors('status');
    }

    public function test_rate_limit_returns_retry_message_and_header(): void
    {
        Route::middleware('throttle:1,1')->get('/api/_test/limited', fn () => response()->json(['ok' => true]));

        $this->getJson('/api/_test/limited')->assertOk();
        $response = $this->getJson('/api/_test/limited')->assertStatus(429)->assertJsonPath('code', 'TOO_MANY_REQUESTS')->assertHeader('Retry-After');
        $this->assertStringContainsString('giây', $response->json('message'));
    }

    public function test_authored_business_message_is_kept_and_unknown_exception_message_is_not(): void
    {
        Route::get('/api/_test/conflict', fn () => abort(409, 'Phản hồi vừa được thay đổi.'));
        Route::get('/api/_test/runtime', fn () => throw new RuntimeException('Lỗi nội bộ D:\\laragon\\www'));

        $this->getJson('/api/_test/conflict')->assertConflict()->assertJsonPath('message', 'Phản hồi vừa được thay đổi.');
        $this->assertNoInternals($this->getJson('/api/_test/runtime')->assertStatus(500)->getContent());
    }

    public function test_production_never_enables_debug(): void
    {
        $config = file_get_contents(config_path('app.php'));

        $this->assertStringContainsString("env('APP_ENV') !== 'production' && (bool) env('APP_DEBUG', false)", $config);
    }
}
