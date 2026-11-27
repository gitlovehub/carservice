<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleTrim;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Lưu xe đã chọn từ bộ chọn Hãng → Dòng xe → Phiên bản vào hồ sơ xe và lịch hẹn.
 */
class VehicleCatalogSelectionTest extends TestCase
{
    use RefreshDatabase;

    private VehicleModel $vios;

    private VehicleTrim $g;

    private VehicleTrim $e;

    protected function setUp(): void
    {
        parent::setUp();

        $brand = VehicleBrand::factory()->create(['name' => 'Toyota']);
        $this->vios = VehicleModel::factory()->create(['brand_id' => $brand->id, 'name' => 'Vios']);
        $this->g = VehicleTrim::factory()->create(['model_id' => $this->vios->id, 'name' => '1.5G-CVT']);
        $this->e = VehicleTrim::factory()->create(['model_id' => $this->vios->id, 'name' => '1.5E-MT']);
    }

    private function customer(): Customer
    {
        $account = Account::factory()->customer()->create();
        Sanctum::actingAs($account);

        return Customer::factory()->create(['account_id' => $account->id]);
    }

    public function test_customer_saves_vehicle_with_model_and_trim(): void
    {
        $customer = $this->customer();

        $this->postJson('/api/me/vehicles', [
            'model_id' => $this->vios->id,
            'trim_id' => $this->g->id,
            'license_plate' => '30A-111.11',
        ])
            ->assertCreated()
            ->assertJsonPath('data.trim_id', $this->g->id)
            ->assertJsonPath('data.variant', '1.5G-CVT')
            ->assertJsonPath('data.trim.name', '1.5G-CVT')
            ->assertJsonPath('data.model.brand.name', 'Toyota');

        $this->getJson('/api/me/vehicles')
            ->assertOk()
            ->assertJsonPath('data.0.trim.name', '1.5G-CVT')
            ->assertJsonPath('data.0.model.brand.name', 'Toyota');

        $this->assertDatabaseHas('vehicles', ['customer_id' => $customer->id, 'trim_id' => $this->g->id]);
    }

    public function test_rejects_trim_of_another_model_and_hidden_new_choices(): void
    {
        $this->customer();
        $otherTrim = VehicleTrim::factory()->create();

        $this->postJson('/api/me/vehicles', ['model_id' => $this->vios->id, 'trim_id' => $otherTrim->id])
            ->assertJsonValidationErrors('trim_id');

        $this->e->update(['status' => 'INACTIVE']);
        $this->postJson('/api/me/vehicles', ['model_id' => $this->vios->id, 'trim_id' => $this->e->id])
            ->assertJsonValidationErrors('trim_id');

        $this->vios->update(['status' => 'INACTIVE']);
        $this->postJson('/api/me/vehicles', ['model_id' => $this->vios->id])
            ->assertJsonValidationErrors('model_id');

        $this->assertSame(0, Vehicle::count());
    }

    public function test_update_keeps_hidden_current_choice_and_clears_trim_when_model_changes(): void
    {
        $customer = $this->customer();
        $vehicle = Vehicle::factory()->create([
            'customer_id' => $customer->id,
            'model_id' => $this->vios->id,
            'trim_id' => $this->g->id,
            'variant' => '1.5G-CVT',
        ]);

        // Admin ẩn phiên bản: khách sửa thông tin khác vẫn được, xe giữ phiên bản cũ.
        $this->g->update(['status' => 'INACTIVE']);
        $this->patchJson("/api/me/vehicles/{$vehicle->id}", ['model_id' => $this->vios->id, 'mileage' => 12000])
            ->assertOk()
            ->assertJsonPath('data.trim_id', $this->g->id);

        $this->patchJson("/api/me/vehicles/{$vehicle->id}", ['trim_id' => $this->e->id])
            ->assertOk()
            ->assertJsonPath('data.variant', '1.5E-MT');

        $camry = VehicleModel::factory()->create(['brand_id' => $this->vios->brand_id, 'name' => 'Camry']);
        $this->patchJson("/api/me/vehicles/{$vehicle->id}", ['model_id' => $camry->id])
            ->assertOk()
            ->assertJsonPath('data.trim_id', null)
            ->assertJsonPath('data.variant', null)
            ->assertJsonPath('data.model.name', 'Camry');
    }

    public function test_staff_can_register_vehicle_on_hidden_model_but_trim_must_match(): void
    {
        Sanctum::actingAs(Account::factory()->create(['role' => Account::ROLE_ADVISOR]));
        $customer = Customer::factory()->create();
        $this->vios->update(['status' => 'INACTIVE']);

        $this->postJson('/api/vehicles', ['customer_id' => $customer->id, 'model_id' => $this->vios->id, 'trim_id' => $this->g->id])
            ->assertCreated()
            ->assertJsonPath('data.trim.name', '1.5G-CVT');

        $this->postJson('/api/vehicles', ['customer_id' => $customer->id, 'model_id' => $this->vios->id, 'trim_id' => VehicleTrim::factory()->create()->id])
            ->assertJsonValidationErrors('trim_id');
    }

    public function test_booking_new_vehicle_from_catalog_selection(): void
    {
        $this->travelTo(now()->startOfDay());
        for ($day = 0; $day <= 6; $day++) {
            DB::table('working_hours')->updateOrInsert(['day_of_week' => $day], [
                'open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 5, 'is_active' => true,
            ]);
        }
        $customer = $this->customer();
        $booking = fn (array $vehicle) => $this->postJson('/api/appointments', [
            'new_vehicle' => $vehicle,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '09:00',
            'symptom_description' => 'Kiểm tra tổng quát',
        ]);

        $booking(['model_id' => $this->vios->id, 'trim_id' => VehicleTrim::factory()->create()->id])
            ->assertJsonValidationErrors('new_vehicle.trim_id');
        $booking(['license_plate' => '30A-222.22'])
            ->assertJsonValidationErrors(['new_vehicle.brand', 'new_vehicle.model']);

        $booking(['model_id' => $this->vios->id, 'trim_id' => $this->g->id, 'license_plate' => '30A-222.22'])
            ->assertCreated();

        $vehicle = Vehicle::where('customer_id', $customer->id)->firstOrFail();
        $this->assertSame($this->vios->id, $vehicle->model_id);
        $this->assertSame($this->g->id, $vehicle->trim_id);
        $this->assertSame('1.5G-CVT', $vehicle->variant);
        $this->assertSame(1, VehicleModel::where('name', 'Vios')->count());

        $this->getJson('/api/appointments')
            ->assertOk()
            ->assertJsonPath('data.0.vehicle.trim.name', '1.5G-CVT');
    }

    public function test_booking_same_plateless_vehicle_twice_reuses_it_but_different_plates_are_separate(): void
    {
        $this->travelTo(now()->startOfDay());
        for ($day = 0; $day <= 6; $day++) {
            DB::table('working_hours')->updateOrInsert(['day_of_week' => $day], [
                'open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 5, 'is_active' => true,
            ]);
        }
        $customer = $this->customer();
        $book = fn (array $vehicle, string $time) => $this->postJson('/api/appointments', [
            'new_vehicle' => $vehicle,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => $time,
            'symptom_description' => 'Kiểm tra tổng quát',
        ])->assertCreated();

        $book(['model_id' => $this->vios->id, 'trim_id' => $this->g->id], '09:00');
        $book(['model_id' => $this->vios->id, 'trim_id' => $this->g->id, 'license_plate' => ''], '10:00');
        $this->assertSame(1, Vehicle::where('customer_id', $customer->id)->count());

        // Khác phiên bản, hoặc có biển số riêng → là xe khác.
        $book(['model_id' => $this->vios->id, 'trim_id' => $this->e->id], '11:00');
        $book(['model_id' => $this->vios->id, 'trim_id' => $this->g->id, 'license_plate' => '30A-333.33'], '13:00');
        $book(['model_id' => $this->vios->id, 'trim_id' => $this->g->id, 'license_plate' => '30A-444.44'], '14:00');
        $this->assertSame(4, Vehicle::where('customer_id', $customer->id)->count());
    }

    public function test_booking_saves_mileage_to_vehicle_only_when_it_increases(): void
    {
        $this->travelTo(now()->startOfDay());
        for ($day = 0; $day <= 6; $day++) {
            DB::table('working_hours')->updateOrInsert(['day_of_week' => $day], [
                'open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 5, 'is_active' => true,
            ]);
        }
        $customer = $this->customer();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id, 'model_id' => $this->vios->id, 'mileage' => 10000]);
        $book = fn (array $extra, string $time) => $this->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => $time,
            'symptom_description' => 'Kiểm tra tổng quát',
            ...$extra,
        ]);

        $book(['mileage' => 15000], '09:00')->assertCreated();
        $this->assertSame(15000, $vehicle->fresh()->mileage);

        // Nhập nhỏ hơn (gõ nhầm) hoặc bỏ trống: giữ nguyên odo đã lưu.
        $book(['mileage' => 900], '10:00')->assertCreated();
        $book([], '11:00')->assertCreated();
        $this->assertSame(15000, $vehicle->fresh()->mileage);

        $book(['mileage' => -5], '13:00')->assertJsonValidationErrors('mileage');

        // Xe mới khai báo khi đặt lịch cũng nhận số km.
        $this->postJson('/api/appointments', [
            'new_vehicle' => ['model_id' => $this->vios->id, 'license_plate' => '30A-555.55'],
            'mileage' => 42000,
            'appointment_date' => now()->addDays(2)->toDateString(),
            'appointment_time' => '14:00',
            'symptom_description' => 'Kiểm tra tổng quát',
        ])->assertCreated();
        $this->assertSame(42000, Vehicle::where('license_plate', '30A-555.55')->value('mileage'));
    }
}
