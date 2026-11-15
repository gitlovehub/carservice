<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tra cứu tiến độ không cần đăng nhập: mã phiếu / mã lịch hẹn + 4 số cuối SĐT, chỉ trả thông tin tối thiểu.
 */
class PublicRepairLookupTest extends TestCase
{
    use RefreshDatabase;

    private Customer $customer;

    private Vehicle $vehicle;

    protected function setUp(): void
    {
        parent::setUp();
        $this->customer = Customer::factory()->create(['phone' => '0912 345 678']);
        $this->vehicle = Vehicle::factory()->create(['customer_id' => $this->customer->id, 'license_plate' => '30A-123.45']);
    }

    private function order(array $extra = []): RepairOrder
    {
        return RepairOrder::query()->create([
            'repair_order_code' => 'RO-2026-LOOK1',
            'customer_id' => $this->customer->id,
            'vehicle_id' => $this->vehicle->id,
            'advisor_id' => Employee::factory()->create()->id,
            'status' => RepairOrder::IN_PROGRESS,
            'received_at' => now()->subHours(3),
            'note' => 'Ghi chú nội bộ',
        ] + $extra);
    }

    public function test_guest_looks_up_repair_order_with_code_and_phone_last_four(): void
    {
        $this->order();

        $response = $this->postJson('/api/repair-orders/lookup', ['code' => ' ro-2026-look1 ', 'phone_last4' => '5678'])
            ->assertOk()
            ->assertJsonPath('data.type', 'repair_order')
            ->assertJsonPath('data.status', 'IN_PROGRESS')
            ->assertJsonPath('data.vehicle.license_plate', '30A-***.45')
            ->assertJsonPath('data.work_progress.total', 0);

        // Không lộ giá, ghi chú, thông tin khách.
        $json = json_encode($response->json());
        $this->assertStringNotContainsString('Ghi chú nội bộ', $json);
        $this->assertStringNotContainsString('0912', $json);
        $response->assertJsonMissingPath('data.customer')->assertJsonMissingPath('data.invoice')->assertJsonMissingPath('data.quotations');
    }

    public function test_wrong_phone_or_unknown_code_returns_the_same_not_found(): void
    {
        $this->order();

        $wrongPhone = $this->postJson('/api/repair-orders/lookup', ['code' => 'RO-2026-LOOK1', 'phone_last4' => '0000'])->assertNotFound();
        $unknown = $this->postJson('/api/repair-orders/lookup', ['code' => 'RO-NOPE', 'phone_last4' => '5678'])->assertNotFound();
        $this->assertSame($wrongPhone->json('message'), $unknown->json('message'));

        $this->postJson('/api/repair-orders/lookup', ['code' => 'RO-2026-LOOK1', 'phone_last4' => '56a8'])->assertJsonValidationErrors('phone_last4');
    }

    public function test_appointment_code_returns_repair_progress_or_appointment_status(): void
    {
        $appointment = Appointment::query()->create([
            'appointment_code' => 'APT-20261120-ABC', 'customer_id' => $this->customer->id, 'vehicle_id' => $this->vehicle->id,
            'appointment_date' => '2026-11-20', 'appointment_time' => '09:00:00', 'request_type' => 'MAINTENANCE', 'status' => 'CONFIRMED',
        ]);

        // Gara chưa tiếp nhận xe → trạng thái lịch hẹn.
        $this->postJson('/api/repair-orders/lookup', ['code' => 'APT-20261120-ABC', 'phone_last4' => '5678'])
            ->assertOk()
            ->assertJsonPath('data.type', 'appointment')
            ->assertJsonPath('data.status', 'CONFIRMED');

        // Đã tiếp nhận → tiến độ phiếu, kèm mã lịch hẹn.
        $this->order(['appointment_id' => $appointment->id]);
        $this->postJson('/api/repair-orders/lookup', ['code' => 'APT-20261120-ABC', 'phone_last4' => '5678'])
            ->assertOk()
            ->assertJsonPath('data.type', 'repair_order')
            ->assertJsonPath('data.repair_order_code', 'RO-2026-LOOK1')
            ->assertJsonPath('data.appointment_code', 'APT-20261120-ABC');
    }

    public function test_lookup_is_rate_limited(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/repair-orders/lookup', ['code' => 'RO-X'.$attempt, 'phone_last4' => '1111'])->assertNotFound();
        }
        $this->postJson('/api/repair-orders/lookup', ['code' => 'RO-X6', 'phone_last4' => '1111'])->assertStatus(429);
    }
}
