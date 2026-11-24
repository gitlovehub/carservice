<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class VehicleIdentityValidationTest extends TestCase
{
    use RefreshDatabase;

    private Account $customerAccount;

    private Vehicle $vehicle;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customerAccount = Account::factory()->customer()->create();
        $customer = Customer::factory()->create(['account_id' => $this->customerAccount->id]);
        $this->vehicle = Vehicle::factory()->create(['customer_id' => $customer->id, 'license_plate' => '30A-111.11', 'vin' => null]);
    }

    /** @return array<string, array{string}> */
    public static function invalidPlates(): array
    {
        return ['thiếu số' => ['30A-123'], 'toàn số' => ['124123123'], 'sai mã tỉnh' => ['00A-123.45'], 'có dấu' => ['30Á-123.45'], 'thừa số' => ['30A-120620'], 'chữ' => ['ABCDEF']];
    }

    #[DataProvider('invalidPlates')]
    public function test_customer_cannot_save_invalid_plate(string $plate): void
    {
        Sanctum::actingAs($this->customerAccount);

        $this->patchJson("/api/me/vehicles/{$this->vehicle->id}", ['license_plate' => $plate])
            ->assertUnprocessable()->assertJsonValidationErrors('license_plate');
        $this->postJson('/api/me/vehicles', ['model_id' => $this->vehicle->model_id, 'license_plate' => $plate])
            ->assertUnprocessable()->assertJsonValidationErrors('license_plate');

        $this->assertSame('30A-111.11', $this->vehicle->fresh()->license_plate);
    }

    public function test_customer_plate_is_normalized_and_can_be_cleared(): void
    {
        Sanctum::actingAs($this->customerAccount);
        $url = "/api/me/vehicles/{$this->vehicle->id}";

        $this->patchJson($url, ['license_plate' => '51k88899'])->assertOk()->assertJsonPath('data.license_plate', '51K-888.99');
        $this->patchJson($url, ['license_plate' => '29ld-1234'])->assertOk()->assertJsonPath('data.license_plate', '29LD-1234');
        $this->patchJson($url, ['license_plate' => null])->assertOk()->assertJsonPath('data.license_plate', null);
    }

    public function test_legacy_plate_is_kept_when_unchanged_but_cannot_change_to_invalid(): void
    {
        $this->vehicle->update(['license_plate' => '30A-120620']);
        Sanctum::actingAs($this->customerAccount);
        $url = "/api/me/vehicles/{$this->vehicle->id}";

        $this->patchJson($url, ['license_plate' => '30A-120620', 'mileage' => 1000])->assertOk();
        $this->assertSame('30A-120620', $this->vehicle->fresh()->license_plate);
        $this->patchJson($url, ['license_plate' => '30A-120621'])->assertUnprocessable();
    }

    public function test_advisor_cannot_save_vietnamese_or_malformed_vin(): void
    {
        Sanctum::actingAs(Account::factory()->create(['role' => Account::ROLE_ADVISOR]));
        $url = "/api/vehicles/{$this->vehicle->id}";

        foreach (['vádqweeqw', 'ABC12', 'ABC-12345', 'WBAI2345678901234', 'WBA123456789012345'] as $vin) {
            $this->putJson($url, ['vin' => $vin])->assertUnprocessable()->assertJsonValidationErrors('vin');
            $this->postJson('/api/vehicles', ['customer_id' => $this->vehicle->customer_id, 'model_id' => $this->vehicle->model_id, 'vin' => $vin])
                ->assertUnprocessable()->assertJsonValidationErrors('vin');
        }
        $this->assertNull($this->vehicle->fresh()->vin);

        $this->putJson($url, ['vin' => ' 1hgcm82633a004352 '])->assertOk()->assertJsonPath('data.vin', '1HGCM82633A004352');
        $this->putJson($url, ['vin' => 'kf80123456'])->assertOk()->assertJsonPath('data.vin', 'KF80123456');
        $this->putJson($url, ['vin' => ''])->assertOk()->assertJsonPath('data.vin', null);
    }

    public function test_legacy_vin_can_be_kept_but_vietnamese_vin_must_be_fixed(): void
    {
        Sanctum::actingAs(Account::factory()->create(['role' => Account::ROLE_ADVISOR]));
        $url = "/api/vehicles/{$this->vehicle->id}";

        $this->vehicle->update(['vin' => 'AG4PGHU5L85ZEJNQR']);
        $this->putJson($url, ['vin' => 'AG4PGHU5L85ZEJNQR', 'mileage' => 1234])->assertOk()->assertJsonPath('data.mileage', 1234);
        $this->putJson($url, ['vin' => 'AG4PGHU5L85ZEJNQX'])->assertUnprocessable()->assertJsonValidationErrors('vin');

        $this->vehicle->update(['vin' => 'vádqweeqw']);
        $this->putJson($url, ['vin' => 'vádqweeqw', 'mileage' => 2000])->assertUnprocessable()->assertJsonValidationErrors('vin');
    }

    public function test_customer_api_also_rejects_invalid_vin(): void
    {
        Sanctum::actingAs($this->customerAccount);

        $this->patchJson("/api/me/vehicles/{$this->vehicle->id}", ['vin' => 'vádqweeqw'])
            ->assertUnprocessable()->assertJsonValidationErrors('vin');
    }
}
