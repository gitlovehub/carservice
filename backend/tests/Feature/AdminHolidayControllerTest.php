<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Holiday;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminHolidayControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 11, 20));
        Sanctum::actingAs(Account::factory()->admin()->create());
    }

    public function test_requires_admin(): void
    {
        Sanctum::actingAs(Account::factory()->create(['role' => Account::ROLE_ADVISOR]));
        $this->getJson('/api/admin/holidays')->assertForbidden();
        $this->postJson('/api/admin/holidays', ['from' => '2027-01-01', 'reason' => 'X'])->assertForbidden();
    }

    public function test_creates_ranges_groups_them_and_reports_affected_appointments(): void
    {
        $customer = Customer::factory()->create();
        Appointment::query()->create(['appointment_code' => 'APT-T-1', 'customer_id' => $customer->id, 'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'appointment_date' => '2027-02-17', 'appointment_time' => '09:00:00', 'request_type' => 'MAINTENANCE', 'status' => 'CONFIRMED']);

        $this->postJson('/api/admin/holidays', ['from' => '2027-02-16', 'to' => '2027-02-20', 'reason' => 'Tết Nguyên Đán'])
            ->assertCreated()
            ->assertJsonPath('affected_appointments', 1)
            ->assertJsonPath('data.days', 5);
        $this->postJson('/api/admin/holidays', ['from' => '2027-01-01', 'reason' => 'Tết Dương lịch'])->assertCreated();
        $this->assertSame(6, Holiday::query()->count());

        $ranges = $this->getJson('/api/admin/holidays')->assertOk()->json('data');
        $this->assertSame([['2027-01-01', '2027-01-01'], ['2027-02-16', '2027-02-20']], array_map(fn ($r) => [$r['from'], $r['to']], $ranges));

        // Trùng ngày đã có → lỗi; khoảng quá dài → lỗi.
        $this->postJson('/api/admin/holidays', ['from' => '2027-02-20', 'to' => '2027-02-21', 'reason' => 'X'])->assertJsonValidationErrors('from');
        $this->postJson('/api/admin/holidays', ['from' => '2027-03-01', 'to' => '2027-04-15', 'reason' => 'X'])->assertJsonValidationErrors('to');
        $this->postJson('/api/admin/holidays', ['from' => '2027-03-05', 'to' => '2027-03-01', 'reason' => 'X'])->assertJsonValidationErrors('to');

        // Sửa khoảng Tết: thay bằng 17–19/02.
        $tet = $ranges[1];
        $this->postJson('/api/admin/holidays', ['from' => '2027-02-17', 'to' => '2027-02-19', 'reason' => 'Tết Nguyên Đán', 'replace_ids' => $tet['ids']])
            ->assertOk()->assertJsonPath('data.days', 3);
        $this->assertSame(4, Holiday::query()->count());

        // Xoá khoảng.
        $ids = collect($this->getJson('/api/admin/holidays')->json('data'))->firstWhere('from', '2027-02-17')['ids'];
        $this->deleteJson('/api/admin/holidays', ['ids' => $ids])->assertOk();
        $this->assertSame(1, Holiday::query()->count());
    }
}
