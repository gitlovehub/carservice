<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Employee;
use App\Models\TechnicianProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_account_can_log_in_and_receive_a_bearer_token(): void
    {
        $account = $this->createAccount();

        $response = $this->postJson('/api/login', [
            'email' => $account->email,
            'password' => 'correct-password',
            'device_name' => 'test-client',
        ]);

        $response->assertOk()
            ->assertJsonPath('account.id', $account->id)
            ->assertJsonPath('account.role', Account::ROLE_ADVISOR)
            ->assertJsonMissingPath('account.password_hash');

        $this->assertIsString($response->json('token'));
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_invalid_credentials_do_not_create_a_token(): void
    {
        $account = $this->createAccount();

        $this->postJson('/api/login', [
            'email' => $account->email,
            'password' => 'incorrect-password',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email')
            ->assertJsonPath('errors.email.0', 'Email hoặc mật khẩu không đúng.');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_inactive_account_cannot_log_in(): void
    {
        $account = $this->createAccount(status: Account::STATUS_LOCKED);

        $this->postJson('/api/login', [
            'email' => $account->email,
            'password' => 'correct-password',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Tài khoản đang bị khóa hoặc ngừng hoạt động.');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_current_account_endpoint_requires_authentication(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_database_seeder_does_not_depend_on_a_users_table(): void
    {
        $this->seed();

        $this->assertDatabaseCount('accounts', 0);
    }

    public function test_authenticated_account_can_read_its_profile(): void
    {
        $account = $this->createAccount();
        $employee = Employee::query()->create([
            'account_id' => $account->id,
            'full_name' => 'Nguyen Van An',
            'phone' => '0900000000',
            'status' => 'ACTIVE',
        ]);
        $technicianProfile = TechnicianProfile::query()->create([
            'employee_id' => $employee->id,
            'specialty' => 'Engine',
            'level' => 'SENIOR',
            'is_available' => true,
        ]);
        $token = $account->createToken('test-client')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('account.employee.full_name', 'Nguyen Van An')
            ->assertJsonPath('account.employee.technician_profile_id', $technicianProfile->id)
            ->assertJsonPath('account.customer', null);
    }

    public function test_logout_revokes_the_current_bearer_token(): void
    {
        $account = $this->createAccount();
        $token = $account->createToken('test-client')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Đã đăng xuất.');

        $this->assertDatabaseCount('personal_access_tokens', 0);

        Auth::forgetGuards();
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_role_middleware_allows_advisors_and_rejects_customers(): void
    {
        Route::get('/api/test/advisor-only', fn () => response()->json(['allowed' => true]))
            ->middleware(['auth:sanctum', 'role:ADVISOR']);

        $advisor = $this->createAccount(role: Account::ROLE_ADVISOR);
        $advisorToken = $advisor->createToken('advisor-client')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$advisorToken)
            ->getJson('/api/test/advisor-only')
            ->assertOk()
            ->assertJsonPath('allowed', true);

        Auth::forgetGuards();
        $customer = $this->createAccount(
            email: 'customer@example.com',
            role: Account::ROLE_CUSTOMER,
        );
        $customerToken = $customer->createToken('customer-client')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$customerToken)
            ->getJson('/api/test/advisor-only')
            ->assertForbidden()
            ->assertJsonPath('message', 'Bạn không có quyền thực hiện thao tác này.');
    }

    public function test_spa_login_uses_a_session_instead_of_creating_a_bearer_token(): void
    {
        config(['sanctum.stateful' => ['localhost:5173']]);
        $account = $this->createAccount();

        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/login', [
                'email' => $account->email,
                'password' => 'correct-password',
            ])
            ->assertOk()
            ->assertJsonPath('token', null)
            ->assertJsonPath('account.id', $account->id);

        $this->assertAuthenticatedAs($account, 'web');
        $this->assertDatabaseCount('personal_access_tokens', 0);

        Auth::forgetGuards();
        $this->withHeader('Origin', 'http://localhost:5173')
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('account.id', $account->id);

        Auth::forgetGuards();
        $this->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Đã đăng xuất.');

        $this->assertGuest('web');
    }

    public function test_cors_allows_the_configured_spa_to_send_credentials(): void
    {
        $response = $this->call('OPTIONS', '/api/login', server: [
            'HTTP_ORIGIN' => 'http://localhost:5173',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        ]);

        $response->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173')
            ->assertHeader('Access-Control-Allow-Credentials', 'true');
    }

    private function createAccount(
        string $email = 'advisor@example.com',
        string $role = Account::ROLE_ADVISOR,
        string $status = Account::STATUS_ACTIVE,
    ): Account {
        return Account::query()->create([
            'email' => $email,
            'password_hash' => Hash::make('correct-password'),
            'role' => $role,
            'status' => $status,
        ]);
    }
}
