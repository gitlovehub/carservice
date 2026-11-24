<?php

namespace Tests\Feature;

use App\Mail\AccountEmailChangedMail;
use App\Mail\AccountEmailChangeMail;
use App\Mail\AccountVerificationMail;
use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Services\AccountEmailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** Một email duy nhất cho tài khoản: kích hoạt và đổi email đều bằng nút xác thực gửi tới chính email đó. */
class AccountEmailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        config(['services.frontend.url' => 'http://localhost:5173']);
    }

    private function customerAccount(string $email = 'khach@example.test'): Account
    {
        $account = Account::factory()->create(['email' => $email, 'password_hash' => Hash::make('Password123'), 'status' => Account::STATUS_ACTIVE, 'email_verified_at' => now()]);
        Customer::factory()->create(['account_id' => $account->id, 'email' => $email]);

        return $account;
    }

    private function changeUrl(string $email): string
    {
        $url = '';
        Mail::assertSent(AccountEmailChangeMail::class, function (AccountEmailChangeMail $mail) use ($email, &$url) {
            if ($mail->hasTo($email)) {
                $url = $mail->url;
            }

            return $mail->hasTo($email);
        });

        return $url;
    }

    public function test_verification_button_activates_and_redirects_to_login_without_a_session(): void
    {
        $this->postJson('/api/register', [
            'full_name' => 'Khách Mới', 'phone' => '0912345678', 'email' => 'moi@example.test',
            'password' => 'Password123@', 'password_confirmation' => 'Password123@', 'accept_terms' => true,
        ])->assertCreated();
        $url = '';
        Mail::assertSent(AccountVerificationMail::class, function (AccountVerificationMail $mail) use (&$url) {
            $url = $mail->url;

            return $mail->hasTo('moi@example.test');
        });
        $account = Account::query()->where('email', 'moi@example.test')->sole();

        // Trình quét link chỉ GET: không được kích hoạt hộ.
        $this->get($url)->assertOk()->assertSee('Đang xác thực tài khoản');
        $this->assertSame(Account::STATUS_PENDING, $account->fresh()->status);

        $this->post($url)->assertRedirect('http://localhost:5173/login?email=moi%40example.test&verified=1');
        $this->assertSame(Account::STATUS_ACTIVE, $account->fresh()->status);
        $this->assertNotNull($account->fresh()->email_verified_at);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertGuest('web');
    }

    public function test_tampered_verification_link_is_rejected(): void
    {
        $account = Account::factory()->create(['status' => Account::STATUS_PENDING, 'email_verified_at' => null]);

        $this->post(app(AccountEmailService::class)->verificationUrl($account).'x')->assertOk()->assertSee('Link không còn hiệu lực');

        $this->assertSame(Account::STATUS_PENDING, $account->fresh()->status);
    }

    public function test_otp_codes_are_never_written_to_logs(): void
    {
        Log::spy();
        $account = $this->customerAccount();

        $this->postJson('/api/forgot-password', ['email' => $account->email])->assertOk();

        Log::shouldNotHaveReceived('info');
    }

    public function test_customer_changes_email_only_after_clicking_the_new_address_button(): void
    {
        $account = $this->customerAccount();
        $token = $account->createToken('web')->plainTextToken;

        $this->withToken($token)->postJson('/api/me/email-change', ['email' => 'moi@example.test', 'current_password' => 'sai-mat-khau'])
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->withToken($token)->postJson('/api/me/email-change', ['email' => 'Moi@Example.test', 'current_password' => 'Password123'])->assertOk();

        // Chưa bấm nút: email cũ vẫn đăng nhập được.
        $this->assertSame('khach@example.test', $account->fresh()->email);
        $url = $this->changeUrl('moi@example.test');
        $this->get($url)->assertOk();
        $this->assertSame('khach@example.test', $account->fresh()->email);

        $this->post($url)->assertRedirect('http://localhost:5173/login?email=moi%40example.test&email_changed=1');
        $this->assertSame('moi@example.test', $account->fresh()->email);
        $this->assertSame('moi@example.test', $account->customer()->first()->email);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        Mail::assertSent(AccountEmailChangedMail::class, fn ($mail) => $mail->hasTo('khach@example.test') && $mail->stage === AccountEmailChangedMail::OLD_ADDRESS);

        // Link chỉ dùng một lần.
        $this->post($url)->assertOk()->assertSee('Link không còn hiệu lực');
    }

    public function test_change_link_dies_when_the_password_changes_or_email_is_taken(): void
    {
        $account = $this->customerAccount();
        $this->customerAccount('da-co@example.test');

        $this->actingAs($account)->postJson('/api/me/email-change', ['email' => 'da-co@example.test', 'current_password' => 'Password123'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->postJson('/api/me/email-change', ['email' => 'moi@example.test', 'current_password' => 'Password123'])->assertOk();
        $url = $this->changeUrl('moi@example.test');
        Auth::forgetGuards();

        $account->update(['password_hash' => Hash::make('Password456')]);
        $this->post($url)->assertOk()->assertSee('Link không còn hiệu lực');
        $this->assertSame('khach@example.test', $account->fresh()->email);
    }

    public function test_customer_cannot_change_email_through_the_profile_api(): void
    {
        $account = $this->customerAccount();

        $this->actingAs($account)->patchJson('/api/me/customer', ['email' => 'moi@example.test'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');

        $this->assertSame('khach@example.test', $account->customer()->first()->email);
    }

    public function test_staff_cannot_use_self_service_email_change(): void
    {
        $advisor = Account::factory()->advisor()->create(['password_hash' => Hash::make('Password123')]);

        $this->actingAs($advisor)->postJson('/api/me/email-change', ['email' => 'moi@example.test', 'current_password' => 'Password123'])->assertForbidden();
    }

    public function test_staff_sends_link_for_lost_email_and_current_address_is_warned(): void
    {
        $admin = Account::factory()->admin()->create();
        $account = $this->customerAccount();
        $customer = $account->customer()->first();

        // Không sửa thẳng email của khách có tài khoản.
        $this->actingAs($admin)->patchJson("/api/customers/{$customer->id}", ['email' => 'moi@example.test'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->postJson("/api/customers/{$customer->id}/email-verification", ['email' => 'moi@example.test'])->assertUnprocessable();

        $this->postJson("/api/customers/{$customer->id}/email-change-link", ['email' => 'moi@example.test'])->assertOk()->assertJsonPath('sent_to', 'moi@example.test');
        $this->assertSame('khach@example.test', $account->fresh()->email);
        Mail::assertSent(AccountEmailChangedMail::class, fn ($mail) => $mail->hasTo('khach@example.test') && $mail->stage === AccountEmailChangedMail::REQUESTED);

        Auth::forgetGuards();
        $this->post($this->changeUrl('moi@example.test'))->assertRedirect();
        $this->assertSame('moi@example.test', $account->fresh()->email);
    }

    public function test_walk_in_customer_cannot_receive_an_account_change_link(): void
    {
        $customer = Customer::factory()->walkIn()->create();

        $this->actingAs(Account::factory()->admin()->create())->postJson("/api/customers/{$customer->id}/email-change-link", ['email' => 'moi@example.test'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');

        Mail::assertNothingSent();
    }

    public function test_admin_changing_staff_email_notifies_both_addresses_and_logs_staff_out(): void
    {
        $staff = Account::factory()->advisor()->create(['email' => 'cu@example.test']);
        $employee = Employee::factory()->create(['account_id' => $staff->id, 'phone' => '0901234567']);
        $staff->createToken('web');

        $this->actingAs(Account::factory()->admin()->create())->patchJson("/api/admin/staff/{$employee->id}", [
            'name' => $employee->full_name, 'email' => 'moi@example.test', 'phone' => '0901234567', 'role' => Account::ROLE_ADVISOR,
        ])->assertOk();

        $this->assertSame('moi@example.test', $staff->fresh()->email);
        $this->assertSame(0, $staff->tokens()->count());
        Mail::assertSent(AccountEmailChangedMail::class, fn ($mail) => $mail->hasTo('cu@example.test'));
        Mail::assertSent(AccountEmailChangedMail::class, fn ($mail) => $mail->hasTo('moi@example.test'));
    }
}
