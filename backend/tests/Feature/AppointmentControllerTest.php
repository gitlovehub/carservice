<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\MaintenancePackage;
use App\Models\Service;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
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
            ],
            'appointment_date' => now()->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
        ]);

        $response->assertCreated();

        $vehicle = Vehicle::query()
            ->where('customer_id', $customer['customer']->id)
            ->with('model.brand')
            ->firstOrFail();

        $this->assertSame('30A-123.45', $vehicle->license_plate);
        $this->assertSame('Vios', $vehicle->model->name);
        $this->assertSame('Toyota', $vehicle->model->brand->name);
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
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
        ])->assertCreated();

        $this->assertDatabaseHas('vehicles', [
            'customer_id' => $customer['customer']->id,
            'license_plate' => null,
        ]);
    }

    public function test_new_vehicle_with_catalog_model_keeps_catalog_body_type(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $brand = VehicleBrand::factory()->create(['name' => 'Toyota']);
        $catalogModel = VehicleModel::factory()->create([
            'brand_id' => $brand->id,
            'name' => 'Hilux',
            'body_type' => 'PICKUP',
        ]);

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Hilux',
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
        ])->assertCreated();

        $vehicle = Vehicle::where('customer_id', $customer['customer']->id)->firstOrFail();

        $this->assertSame($catalogModel->id, $vehicle->model_id);
        $this->assertSame('PICKUP', $catalogModel->fresh()->body_type);
    }

    public function test_new_vehicle_with_unknown_model_leaves_body_type_empty(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Mẫu xe tự nhập',
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
        ])->assertCreated();

        $vehicle = Vehicle::where('customer_id', $customer['customer']->id)->with('model')->firstOrFail();

        $this->assertSame('Mẫu xe tự nhập', $vehicle->model->name);
        $this->assertNull($vehicle->model->body_type);
    }

    public function test_rejects_the_sixth_booking_for_a_time_slot(): void
    {
        $this->travelTo(now()->startOfDay());
        $bookingDate = now()->addDays(2)->toDateString();

        for ($bookingNumber = 1; $bookingNumber <= 5; $bookingNumber++) {
            $customer = $this->createAuthenticatedCustomer();

            $this->withToken($customer['token'])->postJson('/api/appointments', [
                'new_vehicle' => [
                    'brand' => 'Toyota',
                    'model' => 'Vios',
                    'license_plate' => sprintf('30A-100.%02d', $bookingNumber),
                ],
                'appointment_date' => $bookingDate,
                'appointment_time' => '09:00',
                'request_type' => 'MAINTENANCE',
                'symptom_description' => 'Kiểm tra tổng quát',
            ])->assertCreated();

            Auth::forgetGuards();
        }

        $customer = $this->createAuthenticatedCustomer();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-100.06',
            ],
            'appointment_date' => $bookingDate,
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
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
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
        ])->assertCreated();

        $vehicle = Vehicle::where('customer_id', $customer['customer']->id)->firstOrFail();
        $vehicleCount = Vehicle::count();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(3)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
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
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
        ])->assertCreated();

        $vehicle = Vehicle::where('customer_id', $owner['customer']->id)->firstOrFail();
        $otherCustomer = $this->createAuthenticatedCustomer();
        $this->app['auth']->forgetGuards();

        $this->withToken($otherCustomer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(3)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
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
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '23:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
        ])->assertUnprocessable();

        $this->assertSame($vehicleCount, Vehicle::count());
        $this->assertDatabaseMissing('vehicles', ['license_plate' => '30A-777.77']);
    }

    public function test_rebooking_with_own_license_plate_reuses_existing_vehicle(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $payload = fn (int $days) => [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-888.88',
            ],
            'appointment_date' => now()->addDays($days)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
        ];

        $first = $this->withToken($customer['token'])->postJson('/api/appointments', $payload(2))->assertCreated();
        $vehicleCount = Vehicle::count();

        $this->withToken($customer['token'])->postJson('/api/appointments', $payload(3))
            ->assertCreated()
            ->assertJsonPath('data.vehicle_id', $first->json('data.vehicle_id'));

        $this->assertSame($vehicleCount, Vehicle::count());
    }

    public function test_rebooking_restores_soft_deleted_own_vehicle(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create([
            'customer_id' => $customer['customer']->id,
            'license_plate' => '30A-999.99',
        ]);
        $vehicle->delete();

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30a-999.99',
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
        ])->assertCreated()->assertJsonPath('data.vehicle_id', $vehicle->id);

        $this->assertNotSoftDeleted('vehicles', ['id' => $vehicle->id]);
    }

    public function test_cannot_book_with_license_plate_of_another_customer(): void
    {
        $this->travelTo(now()->startOfDay());
        $owner = $this->createAuthenticatedCustomer();
        Vehicle::factory()->create(['customer_id' => $owner['customer']->id, 'license_plate' => '30A-121.21']);

        $other = $this->createAuthenticatedCustomer();
        $this->app['auth']->forgetGuards();

        $this->withToken($other['token'])->postJson('/api/appointments', [
            'new_vehicle' => [
                'brand' => 'Toyota',
                'model' => 'Vios',
                'license_plate' => '30A-121.21',
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
        ])->assertUnprocessable()->assertJsonValidationErrors('new_vehicle.license_plate');

        $this->assertDatabaseMissing('appointments', ['customer_id' => $other['customer']->id]);
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
            ],
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
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
            'symptom_description' => 'Kiểm tra tổng quát',
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
            'symptom_description' => 'Kiểm tra tổng quát',
        ];

        $this->withToken($customer['token'])->postJson('/api/appointments', $payload)->assertCreated();
        $this->withToken($customer['token'])->postJson('/api/appointments', $payload)->assertUnprocessable();

        $this->assertDatabaseCount('appointments', 1);
    }

    public function test_customer_can_create_more_than_three_active_appointments(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();

        for ($appointmentNumber = 1; $appointmentNumber <= 3; $appointmentNumber++) {
            $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
            $this->createAppointment($vehicle, sprintf('0%d:00', 8 + $appointmentNumber));
        }

        $newVehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);

        $this->withToken($customer['token'])
            ->postJson('/api/appointments', [
                'vehicle_id' => $newVehicle->id,
                'appointment_date' => now()->addDays(2)->toDateString(),
                'appointment_time' => '12:00',
                'request_type' => 'MAINTENANCE',
                'symptom_description' => 'Kiểm tra tổng quát',
            ])
            ->assertCreated();
    }

    public function test_cancelled_appointments_do_not_count_towards_active_limit(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();

        for ($appointmentNumber = 1; $appointmentNumber <= 3; $appointmentNumber++) {
            $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
            $appointment = $this->createAppointment($vehicle, sprintf('0%d:00', 8 + $appointmentNumber));
            $appointment->update(['status' => 'CANCELLED']);
        }

        $newVehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);

        $this->withToken($customer['token'])
            ->postJson('/api/appointments', [
                'vehicle_id' => $newVehicle->id,
                'appointment_date' => now()->addDays(2)->toDateString(),
                'appointment_time' => '12:00',
                'request_type' => 'MAINTENANCE',
                'symptom_description' => 'Kiểm tra tổng quát',
            ])
            ->assertCreated();
    }

    public function test_idempotency_key_replays_the_original_booking_response(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
        $payload = [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '12:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
        ];

        $first = $this->withToken($customer['token'])
            ->withHeader('Idempotency-Key', 'booking-replay-1')
            ->postJson('/api/appointments', $payload)
            ->assertCreated();

        $second = $this->withToken($customer['token'])
            ->withHeader('Idempotency-Key', 'booking-replay-1')
            ->postJson('/api/appointments', $payload)
            ->assertCreated();

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertDatabaseCount('appointments', 1);
        $this->assertDatabaseCount('idempotency_keys', 1);
    }

    public function test_idempotency_key_cannot_be_reused_for_a_different_booking(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $firstVehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
        $secondVehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
        $headers = ['Idempotency-Key' => 'booking-reuse-1'];

        $this->withToken($customer['token'])->withHeaders($headers)->postJson('/api/appointments', [
            'vehicle_id' => $firstVehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '12:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
        ])->assertCreated();

        $this->withToken($customer['token'])->withHeaders($headers)->postJson('/api/appointments', [
            'vehicle_id' => $secondVehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '13:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
        ])->assertStatus(409);

        $this->assertDatabaseCount('appointments', 1);
    }

    public function test_booking_endpoint_is_rate_limited_per_customer(): void
    {
        $customer = $this->createAuthenticatedCustomer();

        for ($requestNumber = 1; $requestNumber <= 10; $requestNumber++) {
            $this->withToken($customer['token'])
                ->postJson('/api/appointments', [])
                ->assertUnprocessable();
        }

        $this->withToken($customer['token'])
            ->postJson('/api/appointments', [])
            ->assertTooManyRequests();
    }

    /**
     * @return array{customer: Customer, token: string}
     */
    /**
     * Tạo lịch hẹn trực tiếp trong DB cho một xe vào ngày mai lúc $time.
     */
    private function createAppointment(Vehicle $vehicle, string $time, string $status = 'PENDING'): Appointment
    {
        return Appointment::query()->create([
            'appointment_code' => 'APT-'.uniqid(),
            'customer_id' => $vehicle->customer_id,
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDay()->toDateString(),
            'appointment_time' => $time.':00',
            'request_type' => 'MAINTENANCE',
            'status' => $status,
        ]);
    }

    public function test_rescheduling_into_a_full_slot_is_rejected_like_booking(): void
    {
        $customer = $this->createAuthenticatedCustomer();
        $mine = $this->createAppointment(Vehicle::factory()->create(['customer_id' => $customer['customer']->id]), '09:00');
        DB::table('working_hours')->update(['max_slots' => 2]);
        $this->createAppointment(Vehicle::factory()->create(), '10:00');
        $this->createAppointment(Vehicle::factory()->create(), '10:00', 'NO_SHOW');
        $this->createAppointment(Vehicle::factory()->create(), '10:00');

        $this->withToken($customer['token'])
            ->patchJson("/api/appointments/{$mine->id}", ['appointment_time' => '10:00'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['appointment_time' => 'Khung giờ đã đầy.']);
    }

    public function test_rescheduling_ignores_no_show_when_counting_slots(): void
    {
        $customer = $this->createAuthenticatedCustomer();
        $mine = $this->createAppointment(Vehicle::factory()->create(['customer_id' => $customer['customer']->id]), '09:00');
        DB::table('working_hours')->update(['max_slots' => 1]);
        $this->createAppointment(Vehicle::factory()->create(), '10:00', 'NO_SHOW');

        $this->withToken($customer['token'])
            ->patchJson("/api/appointments/{$mine->id}", ['appointment_time' => '10:00'])
            ->assertOk();

        $this->assertSame('10:00:00', substr((string) $mine->fresh()->appointment_time, 0, 8));
    }

    public function test_rescheduling_rejects_vehicle_already_booked_in_that_slot(): void
    {
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
        $mine = $this->createAppointment($vehicle, '09:00');
        $this->createAppointment($vehicle, '11:00');

        $this->withToken($customer['token'])
            ->patchJson("/api/appointments/{$mine->id}", ['appointment_time' => '11:00'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['vehicle_id' => 'Xe đã có lịch hẹn tại khung giờ này.']);
    }

    public function test_rescheduling_to_another_customers_vehicle_is_rejected(): void
    {
        $customer = $this->createAuthenticatedCustomer();
        $mine = $this->createAppointment(Vehicle::factory()->create(['customer_id' => $customer['customer']->id]), '09:00');

        $this->withToken($customer['token'])
            ->patchJson("/api/appointments/{$mine->id}", ['vehicle_id' => Vehicle::factory()->create()->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('vehicle_id');
    }

    public function test_invalid_time_format_returns_vietnamese_message(): void
    {
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDay()->toDateString(),
            'appointment_time' => '9h',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Kiểm tra tổng quát',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['appointment_time' => 'Giờ hẹn phải đúng định dạng HH:MM (ví dụ 09:00).']);

        $mine = $this->createAppointment($vehicle, '09:00');
        $this->withToken($customer['token'])
            ->patchJson("/api/appointments/{$mine->id}", ['appointment_time' => '9h'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['appointment_time' => 'Giờ hẹn phải đúng định dạng HH:MM (ví dụ 09:00).']);
    }

    public function test_rejects_booking_without_service_package_or_symptom(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('service_ids');

        $this->assertDatabaseCount('appointments', 0);
    }

    public function test_booking_snapshots_prices_skips_services_already_in_package_and_infers_maintenance(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
        $oilChange = Service::factory()->create(['name' => 'Thay dầu', 'base_price' => 300000]);
        $brakeCheck = Service::factory()->create(['name' => 'Kiểm tra phanh', 'base_price' => 200000]);
        $package = MaintenancePackage::factory()->create(['vehicle_model_id' => null]);
        $package->services()->attach($oilChange->id, ['quantity' => 1]);

        $response = $this->withToken($customer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'service_ids' => [$oilChange->id, $brakeCheck->id],
            'package_ids' => [$package->id],
        ])->assertCreated();

        $appointmentId = $response->json('data.id');
        $oilChange->update(['base_price' => 999000]);

        $this->assertDatabaseHas('appointments', ['id' => $appointmentId, 'request_type' => 'MAINTENANCE']);
        $this->assertDatabaseMissing('appointment_services', ['appointment_id' => $appointmentId, 'service_id' => $oilChange->id]);
        $this->assertDatabaseHas('appointment_services', [
            'appointment_id' => $appointmentId,
            'service_id' => $brakeCheck->id,
            'estimated_price' => 200000,
        ]);
        $this->assertDatabaseHas('appointment_packages', [
            'appointment_id' => $appointmentId,
            'package_id' => $package->id,
            'estimated_price' => 300000,
        ]);
    }

    public function test_symptom_only_booking_is_a_diagnosis(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);

        $this->withToken($customer['token'])->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'symptom_description' => 'Xe rung khi phanh',
        ])->assertCreated()->assertJsonPath('data.status', 'PENDING');

        $this->assertDatabaseHas('appointments', ['vehicle_id' => $vehicle->id, 'request_type' => 'DIAGNOSIS']);
    }

    public function test_rejects_package_for_another_vehicle_model_or_more_than_one_package(): void
    {
        $this->travelTo(now()->startOfDay());
        $customer = $this->createAuthenticatedCustomer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer['customer']->id]);
        $otherModelPackage = MaintenancePackage::factory()->create([
            'vehicle_model_id' => VehicleModel::factory()->create()->id,
        ]);
        $payload = [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
        ];

        $this->withToken($customer['token'])
            ->postJson('/api/appointments', [...$payload, 'package_ids' => [$otherModelPackage->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['package_ids' => 'Gói bảo dưỡng không áp dụng cho dòng xe này.']);

        $sharedPackages = MaintenancePackage::factory()->count(2)->create(['vehicle_model_id' => null]);

        $this->withToken($customer['token'])
            ->postJson('/api/appointments', [...$payload, 'package_ids' => $sharedPackages->modelKeys()])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['package_ids' => 'Mỗi lịch hẹn chỉ chọn một gói bảo dưỡng.']);

        $this->assertDatabaseCount('appointments', 0);
    }

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
