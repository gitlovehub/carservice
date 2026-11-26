<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Xe đã có lịch sử sửa chữa: xóa không làm mất lịch sử, không xóa được khi xe còn ở garage,
 * không đổi được thông tin xác định xe, và thêm lại biển số cũ thì khôi phục xe.
 */
class CustomerVehicleHistoryProtectionTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;

    private Vehicle $vehicle;

    private VehicleModel $vios;

    private int $sequence = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $account = Account::factory()->customer()->create();
        Sanctum::actingAs($account);
        $this->customer = Customer::factory()->create(['account_id' => $account->id]);

        $brand = VehicleBrand::factory()->create(['name' => 'Toyota']);
        $this->vios = VehicleModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Vios']);
        $this->vehicle = Vehicle::factory()->create([
            'customer_id' => $this->customer->id,
            'model_id' => $this->vios->id,
            'trim_id' => null,
            'year' => 2020,
            'license_plate' => '30A-123.45',
            'mileage' => 20000,
        ]);
    }

    private function repairOrder(string $status): RepairOrder
    {
        return Model::unguarded(fn () => RepairOrder::query()->create([
            'repair_order_code' => 'RO-H-'.(++$this->sequence),
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'advisor_id' => Employee::factory()->create()->id,
            'status' => $status,
            'received_at' => now()->subDays(10),
        ]));
    }

    public function test_cannot_delete_vehicle_still_at_garage(): void
    {
        $order = $this->repairOrder(RepairOrder::COMPLETED);

        $this->deleteJson("/api/me/vehicles/{$this->vehicle->id}")
            ->assertStatus(422)
            ->assertJsonPath('success', false);
        $this->assertNotSoftDeleted($this->vehicle);

        $order->update(['status' => RepairOrder::HANDED_OVER]);
        $this->deleteJson("/api/me/vehicles/{$this->vehicle->id}")->assertOk();
        $this->assertSoftDeleted($this->vehicle);
    }

    public function test_deleted_vehicle_still_shows_in_repair_history(): void
    {
        $this->repairOrder(RepairOrder::HANDED_OVER);

        $this->deleteJson("/api/me/vehicles/{$this->vehicle->id}")->assertOk();

        $this->getJson('/api/me/vehicles')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/me/repair-orders')
            ->assertOk()
            ->assertJsonPath('data.0.vehicle.license_plate', '30A-123.45')
            ->assertJsonPath('data.0.vehicle.model.name', 'Vios');
    }

    public function test_vehicle_with_history_cannot_change_identity_but_can_change_plate_and_mileage(): void
    {
        $this->repairOrder(RepairOrder::HANDED_OVER);
        $camry = VehicleModel::factory()->create(['brand_id' => $this->vios->brand_id, 'name' => 'Camry']);

        $this->patchJson("/api/me/vehicles/{$this->vehicle->id}", ['model_id' => $camry->id])
            ->assertJsonValidationErrors('model_id');
        $this->patchJson("/api/me/vehicles/{$this->vehicle->id}", ['year' => 2023])
            ->assertJsonValidationErrors('year');
        $this->assertSame($this->vios->id, $this->vehicle->fresh()->model_id);

        // Gửi lại đúng giá trị cũ (như form sửa xe) cùng biển số + ODO mới: hợp lệ.
        $this->patchJson("/api/me/vehicles/{$this->vehicle->id}", [
            'model_id' => $this->vios->id,
            'trim_id' => null,
            'year' => 2020,
            'license_plate' => '30A-999.99',
            'mileage' => 25000,
        ])
            ->assertOk()
            ->assertJsonPath('data.license_plate', '30A-999.99')
            ->assertJsonPath('data.mileage', 25000)
            ->assertJsonPath('data.repair_orders_count', 1);
    }

    public function test_vehicle_without_history_can_still_change_model(): void
    {
        $camry = VehicleModel::factory()->create(['brand_id' => $this->vios->brand_id, 'name' => 'Camry']);

        $this->patchJson("/api/me/vehicles/{$this->vehicle->id}", ['model_id' => $camry->id])
            ->assertOk()
            ->assertJsonPath('data.model.name', 'Camry');
    }

    public function test_adding_plate_of_own_deleted_vehicle_restores_it_with_history(): void
    {
        $this->repairOrder(RepairOrder::HANDED_OVER);
        $this->deleteJson("/api/me/vehicles/{$this->vehicle->id}")->assertOk();

        $this->postJson('/api/me/vehicles', [
            'model_id' => $this->vios->id,
            'license_plate' => '30a-123.45',
            'mileage' => 30000,
        ])
            ->assertOk()
            ->assertJsonPath('restored', true)
            ->assertJsonPath('data.id', $this->vehicle->id)
            ->assertJsonPath('data.mileage', 30000)
            ->assertJsonPath('data.repair_orders_count', 1);

        $this->assertNotSoftDeleted($this->vehicle);
        $this->assertSame(1, Vehicle::withTrashed()->where('license_plate', '30A-123.45')->count());
    }

    public function test_new_owner_can_register_a_sold_vehicle_while_old_owner_keeps_history(): void
    {
        // Chủ cũ đã xoá xe (đã bán) — xe cũ còn lịch sử của chủ cũ.
        $old = Vehicle::factory()->create(['license_plate' => '51K-888.88', 'vin' => 'RLA1234567890ABCD']);
        $old->delete();

        $this->postJson('/api/me/vehicles', ['model_id' => $this->vios->id, 'license_plate' => '51K-888.88', 'vin' => 'RLA1234567890ABCD'])
            ->assertCreated()
            ->assertJsonMissingPath('restored');

        $this->assertSoftDeleted($old);
        $this->assertNotSame($this->customer->id, $old->fresh()->customer_id);
        $this->assertSame(1, Vehicle::query()->where('license_plate', '51K-888.88')->where('customer_id', $this->customer->id)->count());
    }

    public function test_plate_of_another_customers_active_vehicle_is_still_rejected(): void
    {
        Vehicle::factory()->create(['license_plate' => '51K-888.88']);

        $this->postJson('/api/me/vehicles', ['model_id' => $this->vios->id, 'license_plate' => '51K-888.88'])
            ->assertJsonValidationErrors('license_plate');
    }

    public function test_adding_vin_of_own_deleted_vehicle_restores_it(): void
    {
        $this->vehicle->update(['license_plate' => null, 'vin' => 'RLA1234567890ABCD']);
        $this->vehicle->delete();

        $this->postJson('/api/me/vehicles', ['model_id' => $this->vios->id, 'vin' => 'rla1234567890abcd'])
            ->assertOk()->assertJsonPath('restored', true)->assertJsonPath('data.id', $this->vehicle->id);
    }

    public function test_restoring_is_blocked_when_the_plate_now_belongs_to_another_active_vehicle(): void
    {
        $this->vehicle->delete();
        Vehicle::factory()->create(['license_plate' => '30A-123.45']);

        $this->postJson('/api/me/vehicles', ['model_id' => $this->vios->id, 'license_plate' => '30A-123.45'])
            ->assertUnprocessable()->assertJsonValidationErrors('license_plate');
        $this->assertSoftDeleted($this->vehicle);
    }

    public function test_advisor_adding_a_customers_deleted_vehicle_restores_it(): void
    {
        $this->repairOrder(RepairOrder::HANDED_OVER);
        $this->vehicle->delete();
        Sanctum::actingAs(Account::factory()->advisor()->create());

        $this->postJson('/api/vehicles', ['customer_id' => $this->customer->id, 'model_id' => $this->vios->id, 'license_plate' => '30A-123.45'])
            ->assertOk()->assertJsonPath('restored', true)->assertJsonPath('data.id', $this->vehicle->id);
        $this->assertNotSoftDeleted($this->vehicle);
    }

    public function test_database_rejects_two_active_vehicles_with_the_same_plate(): void
    {
        $this->expectException(QueryException::class);

        Vehicle::factory()->create(['license_plate' => '30A-123.45']);
    }
}
