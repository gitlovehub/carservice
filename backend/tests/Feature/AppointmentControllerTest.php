<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentControllerTest extends TestCase
{
    use RefreshDatabase;

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

    public function test_rejects_a_new_vehicle_booking_without_a_license_plate(): void
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
        ])
            ->assertUnprocessable()
            ->assertJsonFragment([
                'new_vehicle.license_plate' => ['Vui lòng nhập biển số xe.'],
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
            ->assertBadRequest()
            ->assertJsonPath('message', 'Khung giờ này đã đầy lịch hẹn. Quý khách vui lòng chọn khung giờ khác.');
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
