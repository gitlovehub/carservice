<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Service;
use App\Models\Vehicle;
use App\Models\WorkingHour;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** P7 — công suất theo phút / ngày: chỉ cảnh báo (Q6), tính theo loại dịch vụ, gợi ý ngày còn chỗ. */
class CapacityTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private CarbonImmutable $date;

    private ?Vehicle $vehicle = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $this->date = CarbonImmutable::today()->addDays(10);
    }

    private function hours(array $overrides = []): void
    {
        for ($day = 0; $day <= 6; $day++) {
            WorkingHour::query()->updateOrCreate(['day_of_week' => $day], [
                'open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 5, 'is_active' => true, ...$overrides,
            ]);
        }
    }

    private function appointment(string $status, array $services = [], ?CarbonImmutable $date = null): Appointment
    {
        $vehicle = $this->vehicle ??= Vehicle::factory()->create();
        $appointment = Appointment::query()->create([
            'appointment_code' => 'APT-'.uniqid(), 'customer_id' => $vehicle->customer_id, 'vehicle_id' => $vehicle->id,
            'appointment_date' => ($date ?? $this->date)->toDateString(), 'appointment_time' => '09:00:00',
            'request_type' => 'MAINTENANCE', 'status' => $status,
        ]);
        $appointment->services()->attach(collect($services)->pluck('id')->all());

        return $appointment;
    }

    private function capacity(?CarbonImmutable $date = null)
    {
        return $this->actingAs($this->advisor)->getJson('/api/advisor/capacity?date='.($date ?? $this->date)->toDateString());
    }

    public function test_load_depends_on_service_minutes_not_vehicle_count(): void
    {
        $this->hours(['daily_capacity_minutes' => 600]);
        $oil = Service::factory()->create(['estimated_minutes' => 30]);
        $engine = Service::factory()->create(['estimated_minutes' => 240]);

        for ($i = 0; $i < 12; $i++) {
            $this->appointment('CONFIRMED', [$oil]);
        }
        $this->capacity()->assertOk()->assertJsonPath('load_minutes', 360)->assertJsonPath('over_capacity', false)->assertJsonPath('appointments', 12);

        $other = $this->date->addDay();
        for ($i = 0; $i < 3; $i++) {
            $this->appointment('CHECKED_IN', [$engine], $other);
        }
        $this->capacity($other)->assertOk()->assertJsonPath('load_minutes', 720)->assertJsonPath('over_capacity', true)
            ->assertJsonPath('utilization', 1.2);
    }

    public function test_only_confirmed_appointments_count_and_unknown_duration_uses_default(): void
    {
        $this->hours(['daily_capacity_minutes' => 100]);
        $this->appointment('PENDING', [Service::factory()->create(['estimated_minutes' => 500])]);
        $this->appointment('CANCELLED', [Service::factory()->create(['estimated_minutes' => 500])]);
        $this->appointment('CONFIRMED');

        $this->capacity()->assertOk()->assertJsonPath('load_minutes', 60)->assertJsonPath('over_capacity', false);
    }

    public function test_over_capacity_only_warns_and_suggests_free_days(): void
    {
        $this->hours(['daily_capacity_minutes' => 60]);
        $this->appointment('CONFIRMED', [Service::factory()->create(['estimated_minutes' => 90])]);

        $response = $this->capacity()->assertOk()->assertJsonPath('over_capacity', true);
        $this->assertNotEmpty($response->json('suggestions'));
        $this->assertSame($this->date->addDay()->toDateString(), $response->json('suggestions.0.date'));

        // Chỉ cảnh báo: cố vấn vẫn xác nhận được lịch mới trong ngày quá tải.
        $extra = $this->appointment('PENDING');
        $this->actingAs($this->advisor)->postJson("/api/advisor/appointments/{$extra->id}/confirm")->assertSuccessful();
    }

    public function test_capacity_from_bays_and_unconfigured_or_closed_days(): void
    {
        $this->hours();
        $this->capacity()->assertOk()->assertJsonPath('capacity_minutes', null)->assertJsonPath('over_capacity', false);

        $this->hours(['bay_count' => 2]);
        $this->capacity()->assertOk()->assertJsonPath('capacity_minutes', 1080);

        $this->hours(['is_active' => false]);
        $this->capacity()->assertOk()->assertJsonPath('capacity_minutes', 0);
    }

    public function test_capacity_defaults_to_active_technicians_times_open_hours(): void
    {
        $this->hours();
        Account::factory()->count(3)->create(['role' => Account::ROLE_TECHNICIAN, 'status' => Account::STATUS_ACTIVE]);
        Account::factory()->create(['role' => Account::ROLE_TECHNICIAN, 'status' => Account::STATUS_LOCKED]);

        // 3 KTV đang hoạt động × 9 giờ (08:00–17:00) = 1620 phút; KTV bị khoá không tính.
        $this->capacity()->assertOk()->assertJsonPath('capacity_minutes', 1620);

        // Giá trị admin tự đặt vẫn được ưu tiên.
        $this->hours(['daily_capacity_minutes' => 500]);
        $this->capacity()->assertOk()->assertJsonPath('capacity_minutes', 500);

        $admin = Account::factory()->create(['role' => Account::ROLE_ADMIN]);
        $this->actingAs($admin)->getJson('/api/admin/working-hours')->assertOk()->assertJsonPath('meta.technicians', 3);
    }

    public function test_admin_sets_capacity_and_customers_cannot_read_it(): void
    {
        $this->hours();
        $admin = Account::factory()->create(['role' => Account::ROLE_ADMIN]);
        $id = WorkingHour::query()->value('id');
        $this->actingAs($admin)->putJson("/api/admin/working-hours/{$id}", [
            'open_time' => '08:00', 'close_time' => '17:00', 'max_slots' => 5, 'is_active' => true, 'daily_capacity_minutes' => 900, 'bay_count' => 3,
        ])->assertOk();
        $this->assertSame(900, WorkingHour::query()->find($id)->daily_capacity_minutes);

        $customer = Account::factory()->create();
        Customer::factory()->create(['account_id' => $customer->id]);
        $this->actingAs($customer)->getJson('/api/advisor/capacity?date='.$this->date->toDateString())->assertForbidden();
        $this->actingAs($this->advisor)->getJson('/api/advisor/capacity/range?from='.$this->date->toDateString().'&days=3')->assertOk()->assertJsonCount(3, 'data');
    }
}
