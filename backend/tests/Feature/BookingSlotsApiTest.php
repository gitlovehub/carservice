<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\GarageSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingSlotsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (range(0, 6) as $day) {
            DB::table('working_hours')->insert(['day_of_week' => $day, 'open_time' => '07:30:00', 'close_time' => '17:30:00', 'max_slots' => 5, 'is_active' => $day !== 0]);
        }
    }

    public function test_public_gets_default_slots_when_not_configured(): void
    {
        $this->getJson('/api/booking-slots')->assertOk()->assertExactJson(['data' => GarageSetting::DEFAULT_BOOKING_SLOTS]);
    }

    public function test_admin_updates_slots_sorted_and_public_sees_them(): void
    {
        Sanctum::actingAs(Account::factory()->admin()->create());

        $this->putJson('/api/admin/booking-slots', ['morning' => ['10:00', '08:00'], 'afternoon' => ['14:00']])
            ->assertOk()
            ->assertJsonPath('message', 'Đã lưu 3 khung giờ đặt lịch (sáng 2, chiều 1).')
            ->assertJsonPath('data.morning', ['08:00', '10:00']);

        $this->getJson('/api/booking-slots')->assertJsonPath('data.afternoon', ['14:00'])->assertJsonPath('data.morning', ['08:00', '10:00']);
        $this->assertSame(1, GarageSetting::query()->count());
    }

    public function test_rejects_invalid_slots(): void
    {
        Sanctum::actingAs(Account::factory()->admin()->create());

        $this->putJson('/api/admin/booking-slots', ['morning' => ['13:00'], 'afternoon' => []])->assertJsonValidationErrors('morning.0');
        $this->putJson('/api/admin/booking-slots', ['morning' => [], 'afternoon' => ['11:00']])->assertJsonValidationErrors('afternoon.0');
        $this->putJson('/api/admin/booking-slots', ['morning' => ['08:00', '08:00'], 'afternoon' => []])->assertJsonValidationErrors('morning.0');
        $this->putJson('/api/admin/booking-slots', ['morning' => [], 'afternoon' => []])->assertJsonValidationErrors('morning');
        $this->putJson('/api/admin/booking-slots', ['morning' => ['07:00'], 'afternoon' => ['18:00']])
            ->assertJsonValidationErrors('morning')
            ->assertJsonPath('errors.morning.0', 'Khung giờ 07:00, 18:00 nằm ngoài giờ mở cửa (07:30–17:30).');
    }

    public function test_only_admin_can_update(): void
    {
        Sanctum::actingAs(Account::factory()->create(['role' => Account::ROLE_ADVISOR]));
        $this->putJson('/api/admin/booking-slots', ['morning' => ['08:00'], 'afternoon' => []])->assertForbidden();
    }
}
