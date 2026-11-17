<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use App\Models\VehicleModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * ADV-02 / ADV-03 — tiếp nhận tại quầy: khách vãng lai mới (tạo hồ sơ khách), xe chưa có trong hệ thống
 * (tạo hồ sơ xe), tất cả trong một giao dịch với phiếu sửa chữa.
 */
class WalkInReceptionTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private VehicleModel $model;

    protected function setUp(): void
    {
        parent::setUp();
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $this->model = VehicleModel::factory()->create();
    }

    private function receive(array $payload)
    {
        return $this->actingAs($this->advisor)->postJson('/api/repair-orders', $payload);
    }

    public function test_new_walk_in_customer_and_vehicle_are_created_with_the_order(): void
    {
        $id = $this->receive([
            'customer' => ['full_name' => 'Trần Văn Vãng', 'phone' => '0912 345 678'],
            'vehicle' => ['model_id' => $this->model->id, 'license_plate' => '51k-123.45', 'year' => 2020],
            'mileage_received' => 42000,
            'initial_condition' => 'Khách báo máy rung khi chạy chậm.',
        ])->assertCreated()->json('id');

        $order = RepairOrder::query()->with(['customer', 'vehicle'])->findOrFail($id);
        $this->assertSame(RepairOrder::SOURCE_WALK_IN, $order->source);
        $this->assertNull($order->appointment_id);
        $this->assertTrue($order->requires_check_in);
        $this->assertSame('Trần Văn Vãng', $order->customer->full_name);
        $this->assertSame('51K-123.45', $order->vehicle->license_plate);
        $this->assertSame($order->customer_id, $order->vehicle->customer_id);
        $this->assertSame($this->model->id, (int) $order->vehicle->model_id);
        $this->assertSame(42000, (int) $order->vehicle->mileage);
    }

    public function test_existing_customer_can_bring_a_vehicle_not_yet_registered(): void
    {
        $customer = Customer::factory()->create();
        $id = $this->receive([
            'customer_id' => $customer->id,
            'vehicle' => ['model_id' => $this->model->id, 'license_plate' => '30A-999.01'],
        ])->assertCreated()->json('id');

        $this->assertSame($customer->id, (int) RepairOrder::query()->findOrFail($id)->vehicle->customer_id);
    }

    public function test_appointment_customer_brings_unregistered_vehicle_with_reason(): void
    {
        $customer = Customer::factory()->create();
        $booked = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $appointment = Appointment::query()->create([
            'appointment_code' => 'APT-NEWCAR', 'customer_id' => $customer->id, 'vehicle_id' => $booked->id,
            'appointment_date' => now()->toDateString(), 'appointment_time' => '09:00:00', 'request_type' => 'MAINTENANCE', 'status' => 'CHECKED_IN',
        ]);
        $payload = [
            'appointment_id' => $appointment->id, 'customer_id' => $customer->id,
            'vehicle' => ['model_id' => $this->model->id, 'license_plate' => '29H-555.55'],
        ];

        $this->receive($payload)->assertUnprocessable(); // thiếu lý do đổi xe
        $this->assertDatabaseMissing('vehicles', ['license_plate' => '29H-555.55']); // không để lại xe dở dang

        $id = $this->receive($payload + ['vehicle_change_reason' => 'Khách đi xe của người nhà'])->assertCreated()->json('id');
        $order = RepairOrder::query()->findOrFail($id);
        $this->assertSame($booked->id, (int) $order->booked_vehicle_id);
        $this->assertSame('29H-555.55', $order->vehicle->license_plate);

        // Có lịch hẹn thì không được tạo hồ sơ khách mới.
        $this->receive([
            'appointment_id' => $appointment->id,
            'customer' => ['full_name' => 'Người khác', 'phone' => '0987000111'],
            'vehicle_id' => $booked->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('customer');
    }

    public function test_duplicates_are_rejected_and_nothing_is_left_behind(): void
    {
        $existing = Customer::factory()->create(['phone' => '0909111222']);
        Vehicle::factory()->create(['customer_id' => $existing->id, 'license_plate' => '60A-111.11']);

        $this->receive([
            'customer' => ['full_name' => 'Trùng SĐT', 'phone' => '0909111222'],
            'vehicle' => ['model_id' => $this->model->id, 'license_plate' => '60A-222.22'],
        ])->assertUnprocessable()->assertJsonValidationErrors('customer.phone');

        $this->receive([
            'customer' => ['full_name' => 'Khách mới', 'phone' => '0909333444'],
            'vehicle' => ['model_id' => $this->model->id, 'license_plate' => '60A-111.11'],
        ])->assertUnprocessable()->assertJsonValidationErrors('vehicle.license_plate');

        $this->receive(['vehicle' => ['model_id' => $this->model->id, 'license_plate' => '60A-333.33']])
            ->assertUnprocessable()->assertJsonValidationErrors('customer_id');
        $this->receive(['customer_id' => $existing->id, 'vehicle_id' => $existing->vehicles()->value('id'), 'vehicle' => ['model_id' => $this->model->id, 'license_plate' => '60A-444.44']])
            ->assertUnprocessable()->assertJsonValidationErrors('vehicle');

        $this->assertDatabaseMissing('customers', ['phone' => '0909333444']);
        $this->assertDatabaseCount('vehicles', 1);
        $this->assertDatabaseCount('repair_orders', 0);
    }

    public function test_vehicle_with_open_order_is_rolled_back_with_new_customer(): void
    {
        // Xe mới tạo nhưng service từ chối (ví dụ khách của lịch khác) → không còn khách / xe nào được tạo.
        $other = Customer::factory()->create();
        $foreignVehicle = Vehicle::factory()->create(['customer_id' => $other->id]);
        $this->receive([
            'customer' => ['full_name' => 'Khách lạ', 'phone' => '0977666555'],
            'vehicle_id' => $foreignVehicle->id,
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('customers', ['phone' => '0977666555']);
        $this->assertDatabaseCount('repair_orders', 0);
    }

    public function test_customer_vehicle_list_flags_vehicles_with_an_open_order(): void
    {
        $customer = Customer::factory()->create();
        $busy = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $free = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $code = RepairOrder::query()->findOrFail($this->receive(['customer_id' => $customer->id, 'vehicle_id' => $busy->id])->assertCreated()->json('id'))->repair_order_code;

        $rows = collect($this->actingAs($this->advisor)->getJson("/api/customers/{$customer->id}/vehicles")->assertOk()->json('data'))->keyBy('id');
        $this->assertSame($code, $rows[$busy->id]['open_repair_order_code']);
        $this->assertNull($rows[$free->id]['open_repair_order_code']);
        $this->assertArrayNotHasKey('repair_orders', $rows[$busy->id]);
    }

    public function test_customers_cannot_receive_walk_ins(): void
    {
        $customer = Account::factory()->create();
        $this->actingAs($customer)->postJson('/api/repair-orders', [
            'customer' => ['full_name' => 'X', 'phone' => '0911000000'],
            'vehicle' => ['model_id' => $this->model->id, 'license_plate' => '11A-000.00'],
        ])->assertForbidden();
    }
}
