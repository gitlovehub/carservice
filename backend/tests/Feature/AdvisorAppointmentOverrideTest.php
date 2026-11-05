<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdvisorAppointmentOverrideTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        DB::table('working_hours')->updateOrInsert(
            ['day_of_week' => now()->addDays(2)->dayOfWeek],
            [
                'open_time' => '08:00:00',
                'close_time' => '17:00:00',
                'max_slots' => 5,
                'is_active' => true,
            ]
        );
    }

    public function test_advisor_can_create_internal_appointment_without_active_booking_limit(): void
    {
        $advisor = Account::factory()->advisor()->create();
        $customer = Customer::factory()->create();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $this->createActiveAppointments($customer);

        $response = $this->actingAs($advisor)->postJson('/api/advisor/appointments', [
            'customer_id' => $customer->id,
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '10:00',
            'request_type' => 'MAINTENANCE',
        ]);

        $response->assertCreated();
        $this->assertDatabaseCount('appointments', 4);
    }

    public function test_administrator_can_create_internal_appointment(): void
    {
        $admin = Account::factory()->admin()->create();
        $customer = Customer::factory()->create();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);

        $this->actingAs($admin)
            ->postJson('/api/advisor/appointments', $this->payload($customer, $vehicle))
            ->assertCreated();
    }

    public function test_override_does_not_bypass_slot_capacity(): void
    {
        $advisor = Account::factory()->advisor()->create();
        $customer = Customer::factory()->create();
        $date = now()->addDays(2)->toDateString();
        $time = '10:00:00';

        for ($number = 1; $number <= 5; $number++) {
            Appointment::query()->create([
                'appointment_code' => 'APT-'.uniqid(),
                'customer_id' => $customer->id,
                'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
                'appointment_date' => $date,
                'appointment_time' => $time,
                'request_type' => 'MAINTENANCE',
                'status' => 'PENDING',
            ]);
        }

        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);

        $this->actingAs($advisor)
            ->postJson('/api/advisor/appointments', array_merge(
                $this->payload($customer, $vehicle, $date, '10:00'),
                [],
            ))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('appointment_time');
    }

    public function test_override_does_not_bypass_vehicle_time_collision(): void
    {
        $advisor = Account::factory()->advisor()->create();
        $customer = Customer::factory()->create();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $date = now()->addDays(2)->toDateString();

        Appointment::query()->create([
            'appointment_code' => 'APT-'.uniqid(),
            'customer_id' => $customer->id,
            'vehicle_id' => $vehicle->id,
            'appointment_date' => $date,
            'appointment_time' => '10:00:00',
            'request_type' => 'MAINTENANCE',
            'status' => 'PENDING',
        ]);

        $this->actingAs($advisor)
            ->postJson('/api/advisor/appointments', array_merge(
                $this->payload($customer, $vehicle, $date, '10:00'),
                [],
            ))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('vehicle_id');
    }

    public function test_customer_cannot_create_internal_appointment(): void
    {
        $customerAccount = Account::factory()->customer()->create();

        $this->actingAs($customerAccount)
            ->postJson('/api/advisor/appointments', [])
            ->assertForbidden();
    }

    public function test_check_in_requires_the_actual_license_plate(): void
    {
        $advisor = Account::factory()->advisor()->create();
        $customer = Customer::factory()->create();
        $vehicle = Vehicle::factory()->create([
            'customer_id' => $customer->id,
            'license_plate' => null,
        ]);
        $appointment = Appointment::query()->create([
            'appointment_code' => 'APT-'.uniqid(),
            'customer_id' => $customer->id,
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '10:00:00',
            'request_type' => 'MAINTENANCE',
            'status' => 'CONFIRMED',
        ]);

        $this->actingAs($advisor)
            ->postJson("/api/advisor/appointments/{$appointment->id}/check-in", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('license_plate');
    }

    public function test_check_in_records_actual_license_plate_and_audit_log(): void
    {
        $advisor = Account::factory()->advisor()->create();
        $customer = Customer::factory()->create();
        $vehicle = Vehicle::factory()->create([
            'customer_id' => $customer->id,
            'license_plate' => null,
        ]);
        $appointment = Appointment::query()->create([
            'appointment_code' => 'APT-'.uniqid(),
            'customer_id' => $customer->id,
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '10:00:00',
            'request_type' => 'MAINTENANCE',
            'status' => 'CONFIRMED',
        ]);

        $this->actingAs($advisor)
            ->postJson("/api/advisor/appointments/{$appointment->id}/check-in", [
                'license_plate' => ' 30A-123.45 ',
            ])
            ->assertOk();

        $this->assertDatabaseHas('vehicles', [
            'id' => $vehicle->id,
            'license_plate' => '30A-123.45',
        ]);
        $this->assertDatabaseHas('appointments', [
            'id' => $appointment->id,
            'status' => 'CHECKED_IN',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'account_id' => $advisor->id,
            'action' => 'vehicle.plate_recorded_at_checkin',
            'auditable_id' => $vehicle->id,
        ]);
    }

    private function createActiveAppointments(Customer $customer): void
    {
        for ($number = 1; $number <= 3; $number++) {
            Appointment::query()->create([
                'appointment_code' => 'APT-'.uniqid(),
                'customer_id' => $customer->id,
                'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
                'appointment_date' => now()->addDays($number)->toDateString(),
                'appointment_time' => '09:00:00',
                'request_type' => 'MAINTENANCE',
                'status' => 'PENDING',
            ]);
        }
    }

    private function payload(Customer $customer, Vehicle $vehicle, ?string $date = null, string $time = '10:00'): array
    {
        return [
            'customer_id' => $customer->id,
            'vehicle_id' => $vehicle->id,
            'appointment_date' => $date ?? now()->addDays(2)->toDateString(),
            'appointment_time' => $time,
            'request_type' => 'MAINTENANCE',
        ];
    }
}
