<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\GarageSetting;
use App\Models\MaintenancePackage;
use App\Models\Service;
use App\Models\Vehicle;
use App\Models\VehicleModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * ADV-04 — cố vấn đặt lịch hộ: chỉ vào khung giờ đặt lịch đã cấu hình, có thể tạo khách / xe mới cùng lịch,
 * và xem tình trạng từng khung giờ trong ngày.
 */
class AdvisorBookingTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private string $date;

    protected function setUp(): void
    {
        parent::setUp();
        $this->advisor = Account::factory()->advisor()->create();
        $this->date = now()->addDays(3)->toDateString();
        DB::table('working_hours')->updateOrInsert(
            ['day_of_week' => now()->addDays(3)->dayOfWeek],
            ['open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 2, 'is_active' => true],
        );
        GarageSetting::query()->create(['name' => 'Gara', 'booking_slots' => ['morning' => ['08:00', '09:30'], 'afternoon' => ['14:15']]]);
    }

    private function book(array $overrides = [])
    {
        $customer = Customer::factory()->create();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);

        return $this->actingAs($this->advisor)->postJson('/api/advisor/appointments', [
            'customer_id' => $customer->id, 'vehicle_id' => $vehicle->id,
            'appointment_date' => $this->date, 'appointment_time' => '09:30', 'request_type' => 'MAINTENANCE',
            ...$overrides,
        ]);
    }

    public function test_internal_booking_must_use_a_configured_slot(): void
    {
        $this->book(['appointment_time' => '10:00'])->assertUnprocessable()->assertJsonValidationErrors('appointment_time');
        $this->book(['appointment_time' => '09:30'])->assertCreated()->assertJsonPath('data.status', 'PENDING');
    }

    public function test_reschedule_by_advisor_must_use_a_configured_slot(): void
    {
        $id = $this->book()->assertCreated()->json('data.id');
        $this->actingAs($this->advisor)->postJson("/api/advisor/appointments/{$id}/reschedule", [
            'appointment_date' => $this->date, 'appointment_time' => '15:00', 'reason_type' => 'CUSTOMER_REQUEST', 'reason' => 'Khách xin đổi giờ',
            'customer_agreed' => true, 'contact_method' => 'PHONE',
        ])->assertUnprocessable()->assertJsonValidationErrors('appointment_time');
        $this->assertSame('09:30:00', substr((string) Appointment::query()->findOrFail($id)->appointment_time, 0, 8));
    }

    public function test_phone_booking_creates_new_customer_and_vehicle_atomically(): void
    {
        $model = VehicleModel::factory()->create();
        $payload = [
            'customer' => ['full_name' => 'Khách gọi điện', 'phone' => '0911222333'],
            'vehicle' => ['model_id' => $model->id, 'license_plate' => '51g-888.88'],
            'appointment_date' => $this->date, 'appointment_time' => '08:00', 'request_type' => 'REPAIR',
            'symptom_description' => 'Xe kêu khi phanh',
        ];

        // Khung giờ sai → không để lại khách / xe.
        $this->actingAs($this->advisor)->postJson('/api/advisor/appointments', [...$payload, 'appointment_time' => '08:45'])->assertUnprocessable();
        $this->assertDatabaseMissing('customers', ['phone' => '0911222333']);
        $this->assertDatabaseMissing('vehicles', ['license_plate' => '51G-888.88']);

        $id = $this->actingAs($this->advisor)->postJson('/api/advisor/appointments', $payload)->assertCreated()->json('data.id');
        $appointment = Appointment::query()->with(['customer', 'vehicle'])->findOrFail($id);
        $this->assertSame('Khách gọi điện', $appointment->customer->full_name);
        $this->assertSame('51G-888.88', $appointment->vehicle->license_plate);
        $this->assertSame($this->advisor->id, (int) $appointment->created_by_account_id);
    }

    public function test_list_filters_by_requested_service_including_package_services(): void
    {
        $oil = Service::factory()->create(['name' => 'Thay dầu', 'status' => 'ACTIVE']);
        $brake = Service::factory()->create(['name' => 'Phanh', 'status' => 'ACTIVE']);
        $package = MaintenancePackage::factory()->create(['status' => 'ACTIVE']);
        $package->services()->attach($oil->id, ['quantity' => 1]);

        $direct = $this->book(['service_ids' => [$oil->id]])->assertCreated()->json('data.id');
        $viaPackage = $this->book(['appointment_time' => '08:00', 'package_ids' => [$package->id]])->assertCreated()->json('data.id');
        $this->book(['appointment_time' => '14:15', 'service_ids' => [$brake->id]])->assertCreated();

        $ids = collect($this->actingAs($this->advisor)->getJson("/api/advisor/appointments?service_id={$oil->id}")->assertOk()->json('data'))->pluck('id')->sort()->values()->all();
        $this->assertSame(collect([$direct, $viaPackage])->sort()->values()->all(), $ids);
    }

    public function test_appointment_list_and_detail_include_the_created_repair_order(): void
    {
        $id = $this->book()->assertCreated()->json('data.id');
        $appointment = Appointment::query()->findOrFail($id);
        $appointment->update(['status' => 'CHECKED_IN']);
        $this->actingAs($this->advisor)->getJson("/api/advisor/appointments/{$id}")->assertOk()->assertJsonPath('data.repair_order', null);

        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $orderId = $this->actingAs($this->advisor)->postJson('/api/repair-orders', [
            'appointment_id' => $id, 'customer_id' => $appointment->customer_id, 'vehicle_id' => $appointment->vehicle_id, 'mileage_received' => 1000,
        ])->assertCreated()->json('id');

        $this->actingAs($this->advisor)->getJson("/api/advisor/appointments/{$id}")->assertOk()->assertJsonPath('data.repair_order.id', $orderId);
        $row = collect($this->actingAs($this->advisor)->getJson("/api/advisor/appointments?date={$this->date}")->json('data'))->firstWhere('id', $id);
        $this->assertSame($orderId, $row['repair_order']['id']);
    }

    public function test_availability_reports_each_slot(): void
    {
        $this->book(['appointment_time' => '09:30'])->assertCreated();
        $this->book(['appointment_time' => '09:30'])->assertCreated();
        $this->book(['appointment_time' => '09:30'])->assertUnprocessable(); // max_slots = 2

        $slots = collect($this->actingAs($this->advisor)->getJson("/api/advisor/booking-availability?date={$this->date}")
            ->assertOk()->assertJsonPath('data.active', true)->json('data.slots'))->keyBy('time');
        $this->assertSame('full', $slots['09:30']['status']);
        $this->assertSame(2, $slots['09:30']['booked']);
        $this->assertSame('available', $slots['08:00']['status']);
        $this->assertSame('afternoon', $slots['14:15']['period']);

        DB::table('holidays')->insert(['holiday_date' => $this->date, 'reason' => 'Nghỉ bù']);
        $closed = $this->actingAs($this->advisor)->getJson("/api/advisor/booking-availability?date={$this->date}")->assertOk();
        $closed->assertJsonPath('data.holiday', 'Nghỉ bù')->assertJsonPath('data.slots.0.status', 'closed');

        $this->actingAs(Account::factory()->create())->getJson("/api/advisor/booking-availability?date={$this->date}")->assertForbidden();
    }
}
