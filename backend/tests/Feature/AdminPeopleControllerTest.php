<?php

namespace Tests\Feature;

use App\Mail\PasswordResetOtpMail;
use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\PasswordResetOtp;
use App\Models\Payment;
use App\Models\RepairOrder;
use App\Models\Review;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPeopleControllerTest extends TestCase
{
    use RefreshDatabase;

    private Account $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->admin = Account::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
    }

    public function test_endpoints_require_admin(): void
    {
        Sanctum::actingAs(Account::factory()->create(['role' => Account::ROLE_ADVISOR]));
        foreach (['customers', 'staff', 'accounts'] as $path) {
            $this->getJson("/api/admin/{$path}")->assertForbidden();
        }
        $this->postJson('/api/admin/accounts', [])->assertForbidden();
    }

    public function test_customers_with_spending_visits_filters_and_detail(): void
    {
        Model::unguard();
        $account = Account::factory()->customer()->create();
        $rich = Customer::factory()->create(['account_id' => $account->id, 'full_name' => 'Trần Minh Quân', 'address' => 'Số 12 Kim Mã, Ba Đình, Hà Nội']);
        $vehicle = Vehicle::factory()->create(['customer_id' => $rich->id, 'license_plate' => '30A-123.45']);
        $advisor = Employee::factory()->create();
        $order = RepairOrder::query()->create(['repair_order_code' => 'RO-T-1', 'customer_id' => $rich->id, 'vehicle_id' => $vehicle->id, 'advisor_id' => $advisor->id,
            'status' => RepairOrder::HANDED_OVER, 'received_at' => now()->subDay()]);
        $invoice = Invoice::query()->create(['repair_order_id' => $order->id, 'invoice_code' => 'INV-T-1', 'subtotal' => 25_000_000, 'discount_amount' => 0, 'total_amount' => 25_000_000, 'status' => Invoice::PAID]);
        Payment::query()->create(['invoice_id' => $invoice->id, 'amount' => 25_000_000, 'payment_method' => Payment::DIRECT, 'status' => Payment::SUCCESS, 'paid_at' => now()]);
        Payment::query()->create(['invoice_id' => $invoice->id, 'amount' => 9_000_000, 'payment_method' => Payment::VNPAY, 'status' => Payment::PENDING]);
        Review::query()->create(['repair_order_id' => $order->id, 'customer_id' => $rich->id, 'overall_rating' => 5, 'comment' => 'Tốt']);
        $walkIn = Customer::factory()->walkIn()->create(['full_name' => 'Lê Thu Hà']);
        Model::reguard();

        $rows = $this->getJson('/api/admin/customers?sort=spent')->assertOk()->assertJsonPath('meta.total', 2)->json('data');
        $this->assertSame($rich->id, $rows[0]['id']);
        $this->assertEquals(25_000_000, $rows[0]['total_spent']);
        $this->assertTrue($rows[0]['vip']);
        $this->assertSame('Hà Nội', $rows[0]['city']);
        $this->assertSame(1, $rows[0]['vehicles_count']);
        $this->assertNull($rows[1]['last_visit']);

        $this->getJson('/api/admin/customers?cars=none')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $walkIn->id);
        $this->getJson('/api/admin/customers?search=123.45')->assertJsonPath('data.0.id', $rich->id);
        $this->getJson('/api/admin/customers?search=minh qu')->assertJsonPath('meta.total', 1);

        $detail = $this->getJson("/api/admin/customers/{$rich->id}")->assertOk()->json('data');
        $this->assertSame('30A-123.45', $detail['vehicles'][0]['plate']);
        $this->assertSame('RO-T-1', $detail['history'][0]['code']);
        $this->assertEquals(25_000_000, $detail['history'][0]['amount']);
        $this->assertSame(5, $detail['last_review']['rating']);

        // Khoá tài khoản khách: thu hồi phiên; khách vãng lai không khoá được.
        $account->createToken('web');
        $this->patchJson("/api/admin/customers/{$rich->id}/lock", ['locked' => true])->assertOk()->assertJsonPath('data.locked', true);
        $this->assertSame(Account::STATUS_LOCKED, $account->fresh()->status);
        $this->assertSame(0, $account->tokens()->count());
        $this->patchJson("/api/admin/customers/{$walkIn->id}/lock", ['locked' => true])->assertJsonValidationErrors('locked');
    }

    public function test_staff_list_create_update_and_deactivate(): void
    {
        $advisor = Employee::factory()->create(['full_name' => 'Phạm Thị Lan']);
        $tech = Employee::factory()->technicianRole()->create(['full_name' => 'Nguyễn Văn Hải']);
        TechnicianProfile::factory()->create(['employee_id' => $tech->id, 'specialty' => 'Động cơ', 'level' => 'SENIOR']);

        $this->getJson('/api/admin/staff')->assertOk()
            ->assertJsonPath('summary.total', 2)
            ->assertJsonPath('summary.technicians', 1)
            ->assertJsonCount(2, 'data');
        $this->getJson('/api/admin/staff?role=TECHNICIAN')->assertJsonPath('data.0.specialty', 'Động cơ');

        $created = $this->postJson('/api/admin/staff', [
            'name' => 'Bùi Đức Anh', 'email' => 'Duc.Anh@Carservice.vn', 'phone' => '0912345678', 'role' => 'TECHNICIAN', 'specialty' => 'Hộp số', 'level' => 'JUNIOR',
        ])->assertCreated()->assertJsonPath('data.email', 'duc.anh@carservice.vn')->assertJsonPath('data.specialty', 'Hộp số')->json('data');
        Mail::assertSent(PasswordResetOtpMail::class, fn ($mail) => $mail->hasTo('duc.anh@carservice.vn'));
        $this->assertSame(Account::ROLE_TECHNICIAN, Account::query()->find($created['account_id'])->role);

        $this->postJson('/api/admin/staff', ['name' => 'X', 'email' => 'duc.anh@carservice.vn', 'phone' => '12', 'role' => 'ADMIN'])
            ->assertJsonValidationErrors(['email', 'phone', 'role']);

        $this->patchJson("/api/admin/staff/{$advisor->id}", [
            'name' => 'Phạm Thị Lan', 'email' => $advisor->account->email, 'phone' => '0987654321', 'role' => 'ADVISOR', 'status' => 'INACTIVE',
        ])->assertOk()->assertJsonPath('data.status', 'INACTIVE');
        $this->assertSame(Account::STATUS_INACTIVE, $advisor->account->fresh()->status);
    }

    public function test_accounts_list_create_lock_and_reset_password(): void
    {
        $customer = Account::factory()->customer()->create(['email' => 'khach@gmail.com']);
        Customer::factory()->create(['account_id' => $customer->id, 'full_name' => 'Đỗ Thành Nam']);
        $customer->createToken('web');

        $rows = $this->getJson('/api/admin/accounts?role=CUSTOMER')->assertOk()->json('data');
        $this->assertSame('Đỗ Thành Nam', $rows[0]['name']);
        $this->assertNotNull($rows[0]['last_login_at']);
        $this->getJson('/api/admin/accounts?search=thành nam')->assertJsonPath('meta.total', 1);

        $this->postJson('/api/admin/accounts', ['email' => 'quanly@carservice.vn', 'name' => 'Trần Văn Quản', 'role' => 'ADMIN', 'send_invite' => false])
            ->assertCreated()->assertJsonPath('data.role', 'ADMIN')->assertJsonPath('data.verified', true);
        Mail::assertNothingSent();
        $this->postJson('/api/admin/accounts', ['email' => 'x@gmail.com', 'name' => 'X', 'role' => 'CUSTOMER'])->assertJsonValidationErrors('role');

        $this->patchJson("/api/admin/accounts/{$customer->id}/status", ['status' => 'LOCKED'])->assertOk()->assertJsonPath('data.status', 'LOCKED');
        $this->assertSame(0, $customer->tokens()->count());
        $this->patchJson("/api/admin/accounts/{$this->admin->id}/status", ['status' => 'LOCKED'])->assertJsonValidationErrors('status');

        $this->postJson("/api/admin/accounts/{$customer->id}/reset-password")->assertOk();
        Mail::assertSent(PasswordResetOtpMail::class, fn ($mail) => $mail->hasTo('khach@gmail.com'));
        $this->assertSame(1, PasswordResetOtp::query()->where('account_id', $customer->id)->whereNull('used_at')->count());
    }
}
