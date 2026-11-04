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

    public function test_advisor_can_override_customer_active_booking_limit_with_reason(): void
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
            'override_active_limit' => true,
            'override_reason' => 'Khách hàng doanh nghiệp cần ưu tiên lịch.',
        ]);

        $response->assertCreated();
        $this->assertDatabaseCount('appointments', 4);
        $this->assertDatabaseHas('audit_logs', [
            'account_id' => $advisor->id,
            'action' => 'appointment.limit_overridden',
            'reason' => 'Khách hàng doanh nghiệp cần ưu tiên lịch.',
        ]);
    }

    public function test_internal_booking_requires_override_reason_when_limit_is_exceeded(): void
    {
        $advisor = Account::factory()->advisor()->create();
        $customer = Customer::factory()->create();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $this->createActiveAppointments($customer);

        $this->actingAs($advisor)
            ->postJson('/api/advisor/appointments', [
                'customer_id' => $customer->id,
                'vehicle_id' => $vehicle->id,
                'appointment_date' => now()->addDays(2)->toDateString(),
                'appointment_time' => '10:00',
                'request_type' => 'MAINTENANCE',
                'override_active_limit' => true,
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('override_reason');
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

    public function test_internal_booking_without_override_still_enforces_active_limit(): void
    {
        $advisor = Account::factory()->advisor()->create();
        $customer = Customer::factory()->create();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $this->createActiveAppointments($customer);

        $this->actingAs($advisor)
            ->postJson('/api/advisor/appointments', $this->payload($customer, $vehicle))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('override_active_limit');
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
                [
                    'override_active_limit' => true,
                    'override_reason' => 'Ưu tiên xử lý.',
                ],
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
                [
                    'override_active_limit' => true,
                    'override_reason' => 'Ưu tiên xử lý.',
                ],
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
