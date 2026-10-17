<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AppointmentControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        for ($day = 0; $day <= 6; $day++) {
            DB::table('working_hours')->updateOrInsert(
                ['day_of_week' => $day],
                [
                    'open_time' => '08:00:00',
                    'close_time' => '17:00:00',
                    'max_slots' => 5,
                    'is_active' => true,
                ]
            );
        }
    }

    public function test_creates_a_booking_for_a_new_vehicle_without_a_saved_vehicle(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();

        $response = $this->withToken($customer['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-123.45',
                'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
            ],
            'appointment_date' => now()->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'service_name' => 'Bảo dưỡng định kỳ',
        ]);

        $response->assertCreated();

        $vehicle = Vehicle::query()
            ->where('customer_id', $customer['customer']->id)
            ->with('model.brand')
            ->firstOrFail();

        $this->assertSame('30A-123.45', $vehicle->license_plate);
        $this->assertSame('Vios', $vehicle->model->name);
        $this->assertSame('Toyota', $vehicle->model->brand->name);
        $this->assertSame('SEDAN', $vehicle->model->body_type);
        $this->assertDatabaseHas('appointments', [
            'vehicle_id' => $vehicle->id,
            'customer_id' => $customer['customer']->id,
        ]);
    }

    public function test_allows_a_new_vehicle_booking_without_a_license_plate(): void
    {
        $customer = $this->createAuthenticatedCustomer();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])->assertCreated();

        $this->assertDatabaseHas('vehicles', [
            'customer_id' => $customer['customer']->id,
            'license_plate' => null,
        ]);
    }

    public function test_rejects_the_sixth_booking_for_a_time_slot(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $bookingDate = now()->addDays(2)->toDateString();

        for ($bookingNumber = 1; $bookingNumber <= 5; $bookingNumber++) {
            $this->withToken($customer['token'])->postJson('/api/appointments', [
                'new_vehicle' => [
                    'brand' => 'Toyota',
                    'model' => 'Vios',
                    'license_plate' => sprintf('30A-100.%02d', $bookingNumber),
                    'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
                ],
                'appointment_date' => $bookingDate,
                'appointment_time' => '09:00',
                'request_type' => 'MAINTENANCE',
            ])->assertCreated();
        }

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-100.06',
                'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
            ],
            'appointment_date' => $bookingDate,
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Khung giờ đã đầy.')
            ->assertJsonPath('errors.appointment_time.0', 'Khung giờ đã đầy.');
    }

    public function test_booking_with_existing_vehicle_does_not_create_duplicate_vehicle(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-555.55',
                'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])->assertCreated();

        $vehicle = Vehicle::where('customer_id', $customer['customer']->id)->firstOrFail();
        $vehicleCount = Vehicle::count();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(3)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])->assertCreated()->assertJsonPath('data.vehicle_id', $vehicle->id);

        $this->assertSame($vehicleCount, Vehicle::count());
    }

    public function test_customer_cannot_book_another_customers_vehicle(): void
    {
        $this->travelTo(now()->startOfDay());
        $owner = $this->createAuthenticatedCustomer();

        $this->withToken($owner['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-666.66',
                'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])->assertCreated();

        $vehicle = Vehicle::where('customer_id', $owner['customer']->id)->firstOrFail();
        $otherCustomer = $this->createAuthenticatedCustomer();
        $this->app['auth']->forgetGuards();

        $this->withToken($otherCustomer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(3)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('appointments', [
            'customer_id' => $otherCustomer['customer']->id,
            'vehicle_id' => $vehicle->id,
        ]);
    }

    public function test_failed_booking_does_not_save_new_vehicle(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $vehicleCount = Vehicle::count();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-777.77',
                'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '23:00',
            'request_type' => 'MAINTENANCE',
        ])->assertUnprocessable();

        $this->assertSame($vehicleCount, Vehicle::count());
        $this->assertDatabaseMissing('vehicles', ['license_plate' => '30A-777.77']);
    }

    public function test_rejects_both_existing_and_new_vehicle_in_same_booking(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
        $before = Vehicle::count();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-888.88',
                'vehicle_type' => 'Sedan / Hatchback (4-5 chỗ)',
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])->assertUnprocessable();

        $this->assertSame($before, Vehicle::count());
        $this->assertDatabaseCount('appointments', 0);
    }

    public function test_rejects_booking_with_soft_deleted_vehicle(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
        $vehicle->delete();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ])->assertUnprocessable();

        $this->assertDatabaseCount('appointments', 0);
    }

    public function test_rejects_duplicate_booking_for_same_vehicle_and_time(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
        $payload = [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
        ];

        $this->withToken($customer['token'])->postJson('/api/appointments', $payload)->assertCreated();
        $this->withToken($customer['token'])->postJson('/api/appointments', $payload)->assertUnprocessable();

        $this->assertDatabaseCount('appointments', 1);
    }

    /**
     * @return array{customer: Customer, token: string}
     */
    private function createAuthenticatedCustomer(): array
    {
        $account = Account::factory()->customer()->create();
        $customer = Customer::factory()->create(['account_id' => $account->id]);

        return [
            'customer' => $customer,
            'token' => $account->createToken('booking-test')->plainTextToken,
        ];
    }
}
