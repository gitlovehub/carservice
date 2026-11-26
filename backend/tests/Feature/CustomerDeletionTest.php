<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Admin chỉ xoá được hồ sơ khách trống; hồ sơ có tài khoản / xe / lịch sử được giữ nguyên. */
class CustomerDeletionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(Account::factory()->admin()->create());
    }

    public function test_empty_customer_profile_can_be_deleted(): void
    {
        $customer = Customer::factory()->create(['account_id' => null]);

        $this->deleteJson("/api/customers/{$customer->id}")->assertOk();
        $this->assertSoftDeleted($customer);
    }

    public function test_customer_with_account_or_vehicle_cannot_be_deleted(): void
    {
        $withAccount = Customer::factory()->create(['account_id' => Account::factory()->customer()->create()->id]);
        $withVehicle = Customer::factory()->create(['account_id' => null]);
        Vehicle::factory()->create(['customer_id' => $withVehicle->id]);

        foreach ([$withAccount, $withVehicle] as $customer) {
            $this->deleteJson("/api/customers/{$customer->id}")->assertUnprocessable()->assertJsonPath('success', false);
            $this->assertNotSoftDeleted($customer);
        }
    }
}
