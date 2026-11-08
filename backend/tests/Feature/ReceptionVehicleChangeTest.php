<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** P2-B — tiếp nhận: đổi xe so với lịch hẹn (cùng chủ + lý do + audit), nguồn tiếp nhận. */
class ReceptionVehicleChangeTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Appointment $appointment;

    private Vehicle $otherOwnVehicle;

    protected function setUp(): void
    {
        parent::setUp();
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $customer = Customer::factory()->create();
        $booked = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $this->otherOwnVehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $this->appointment = Appointment::query()->create([
            'appointment_code' => 'APT-CHANGE', 'customer_id' => $customer->id, 'vehicle_id' => $booked->id,
            'appointment_date' => now()->toDateString(), 'appointment_time' => '09:00:00',
            'request_type' => 'MAINTENANCE', 'status' => 'CHECKED_IN',
        ]);
    }

    private function receive(array $overrides = [])
    {
        return $this->actingAs($this->advisor)->postJson('/api/repair-orders', [
            'appointment_id' => $this->appointment->id,
            'customer_id' => $this->appointment->customer_id,
            'vehicle_id' => $this->otherOwnVehicle->id,
            ...$overrides,
        ]);
    }

    public function test_changing_to_another_vehicle_of_same_owner_requires_reason(): void
    {
        $this->receive()->assertUnprocessable();
        $this->receive(['vehicle_change_reason' => 'abc'])->assertUnprocessable();
        $this->assertDatabaseCount('repair_orders', 0);
    }

    public function test_vehicle_change_with_reason_is_recorded_and_audited(): void
    {
        $id = $this->receive(['vehicle_change_reason' => 'Xe đặt lịch đang đi tỉnh, khách mang xe còn lại'])
            ->assertCreated()->json('id');

        $order = RepairOrder::query()->findOrFail($id);
        $this->assertSame($this->otherOwnVehicle->id, (int) $order->vehicle_id);
        $this->assertSame($this->appointment->vehicle_id, (int) $order->booked_vehicle_id);
        $this->assertSame(RepairOrder::SOURCE_APPOINTMENT, $order->source);
        $this->assertTrue($order->requires_check_in);

        $audit = AuditLog::query()->where('action', 'repair_order.vehicle_changed')->sole();
        $this->assertSame(['vehicle_id' => $this->appointment->vehicle_id], $audit->old_values);
        $this->assertSame(['vehicle_id' => $this->otherOwnVehicle->id], $audit->new_values);
        $this->assertSame($this->advisor->id, (int) $audit->account_id);
        $this->assertStringContainsString('đổi xe', $order->statusHistory()->first()->note);
    }

    public function test_vehicle_of_another_customer_is_still_rejected(): void
    {
        $foreign = Vehicle::factory()->create();

        $this->receive(['vehicle_id' => $foreign->id, 'vehicle_change_reason' => 'Lý do bất kỳ đủ dài'])->assertUnprocessable();
        $this->assertDatabaseCount('repair_orders', 0);
    }

    public function test_same_vehicle_needs_no_reason_and_walk_in_is_marked(): void
    {
        $id = $this->receive(['vehicle_id' => $this->appointment->vehicle_id])->assertCreated()->json('id');
        $order = RepairOrder::query()->findOrFail($id);
        $this->assertNull($order->booked_vehicle_id);
        $this->assertNull($order->vehicle_change_reason);
        $this->assertSame(0, AuditLog::query()->count());

        $walkIn = Vehicle::factory()->create();
        $walkInId = $this->actingAs($this->advisor)->postJson('/api/repair-orders', [
            'customer_id' => $walkIn->customer_id, 'vehicle_id' => $walkIn->id,
        ])->assertCreated()->json('id');
        $this->assertSame(RepairOrder::SOURCE_WALK_IN, RepairOrder::query()->findOrFail($walkInId)->source);
    }
}
