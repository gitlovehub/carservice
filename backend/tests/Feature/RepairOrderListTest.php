<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use App\Support\GarageDay;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/** ADV-07 — danh sách phiếu của cố vấn: lọc nhiều trạng thái, tìm kiếm, phiếu của tôi, số đếm theo trạng thái, sắp xếp. */
class RepairOrderListTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $otherAdvisor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $this->otherAdvisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->otherAdvisor->id]);

        $this->order('RO-A', RepairOrder::IN_PROGRESS, '51K-111.11', 'Nguyễn An', '0901111111', $this->advisor, now()->subDays(1));
        $this->order('RO-B', RepairOrder::WAITING_FOR_PARTS, '30A-222.22', 'Trần Bình', '0902222222', $this->advisor, now()->subDays(2));
        $this->order('RO-C', RepairOrder::IN_PROGRESS, '29H-333.33', 'Lê Cường', '0903333333', $this->otherAdvisor, now()->subDays(3));
        $this->order('RO-D', RepairOrder::HANDED_OVER, '51K-444.44', 'Nguyễn An', '0901111112', $this->otherAdvisor, now()->subDays(4));
    }

    private function order(string $code, string $status, string $plate, string $name, string $phone, Account $advisor, $receivedAt): void
    {
        $customer = Customer::factory()->create(['full_name' => $name, 'phone' => $phone]);
        RepairOrder::query()->create([
            'repair_order_code' => $code, 'customer_id' => $customer->id, 'status' => $status, 'received_at' => $receivedAt,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id, 'license_plate' => $plate])->id,
            'advisor_id' => $advisor->employee->id,
        ]);
    }

    private function codes(string $query): array
    {
        return collect($this->actingAs($this->advisor)->getJson("/api/repair-orders{$query}")->assertOk()->json('data'))->pluck('repair_order_code')->all();
    }

    public function test_filters_by_several_statuses_and_returns_counts(): void
    {
        $this->assertSame(['RO-A', 'RO-B', 'RO-C'], $this->codes('?status=IN_PROGRESS,WAITING_FOR_PARTS'));

        $counts = $this->actingAs($this->advisor)->getJson('/api/repair-orders?status=IN_PROGRESS')->assertOk()->json('counts');
        $this->assertEqualsCanonicalizing(['IN_PROGRESS' => 2, 'WAITING_FOR_PARTS' => 1, 'HANDED_OVER' => 1], $counts);
    }

    public function test_search_by_plate_code_name_and_phone(): void
    {
        $this->assertSame(['RO-A', 'RO-D'], $this->codes('?search=51K'));
        $this->assertSame(['RO-C'], $this->codes('?search=RO-C'));
        $this->assertSame(['RO-A', 'RO-D'], $this->codes('?search='.urlencode('Nguyễn An')));
        $this->assertSame(['RO-B'], $this->codes('?search=0902222222'));
        // Số đếm theo cùng phạm vi tìm kiếm.
        $this->assertEqualsCanonicalizing(['IN_PROGRESS' => 1, 'HANDED_OVER' => 1], $this->actingAs($this->advisor)->getJson('/api/repair-orders?search=51K')->json('counts'));
    }

    public function test_filters_by_received_date_range_including_counts(): void
    {
        $from = now(GarageDay::TIMEZONE)->subDays(3)->toDateString();
        $to = now(GarageDay::TIMEZONE)->subDays(2)->toDateString();

        $this->assertSame(['RO-B', 'RO-C'], $this->codes("?from={$from}&to={$to}"));
        $this->assertEqualsCanonicalizing(['WAITING_FOR_PARTS' => 1, 'IN_PROGRESS' => 1],
            $this->actingAs($this->advisor)->getJson("/api/repair-orders?from={$from}&to={$to}")->json('counts'));
        $this->actingAs($this->advisor)->getJson("/api/repair-orders?from={$to}&to={$from}")->assertUnprocessable();
    }

    public function test_progress_counts_work_items_and_filters_completed_and_ready_today(): void
    {
        $orderA = RepairOrder::query()->where('repair_order_code', 'RO-A')->firstOrFail();
        foreach (['COMPLETED', 'COMPLETED', 'IN_PROGRESS', 'CANCELLED'] as $status) {
            $orderA->workItems()->create(['description' => 'Việc', 'status' => $status]);
        }
        $orderA->update(['estimated_ready_at' => now(GarageDay::TIMEZONE)->setTime(17, 30)->utc()]);
        $orderC = RepairOrder::query()->where('repair_order_code', 'RO-C')->firstOrFail();
        $orderC->update(['status' => RepairOrder::COMPLETED]);
        $orderC->statusHistory()->create(['status' => RepairOrder::COMPLETED]);

        $this->actingAs($this->advisor)->getJson('/api/repair-orders?with_progress=1&status=IN_PROGRESS')->assertOk()
            ->assertJsonPath('progress.completed_today', 1)
            ->assertJsonPath('progress.ready_today', 1)
            ->assertJsonPath('data.0.repair_order_code', 'RO-A')
            ->assertJsonPath('data.0.work_total', 3)
            ->assertJsonPath('data.0.work_done', 2);
        $this->assertArrayNotHasKey('progress', $this->actingAs($this->advisor)->getJson('/api/repair-orders')->json());

        $today = GarageDay::today();
        $this->assertSame(['RO-C'], $this->codes("?completed_on={$today}"));
        $this->assertSame(['RO-A'], $this->codes("?ready_on={$today}"));
    }

    public function test_day_filters_use_garage_local_day_not_utc_day(): void
    {
        // 05:30 sáng 17/11 giờ Việt Nam = 22:30 ngày 16/11 UTC.
        $this->travelTo(Carbon::parse('2026-11-16 22:30:00', 'UTC'));
        RepairOrder::query()->where('repair_order_code', 'RO-A')->firstOrFail()
            ->update(['received_at' => Carbon::parse('2026-11-16 23:00:00', 'UTC'), 'estimated_ready_at' => Carbon::parse('2026-11-17 09:00:00', 'UTC')]);
        // Các phiếu khác nhận "N ngày trước ngày chạy test" — chạy gần 17/11 thì có thể rơi vào 17/11; đưa ra xa để test không phụ thuộc ngày chạy.
        RepairOrder::query()->where('repair_order_code', '!=', 'RO-A')->update(['received_at' => Carbon::parse('2026-10-01 02:00:00', 'UTC')]);

        $this->assertSame('2026-11-17', GarageDay::today());
        $this->assertSame(['RO-A'], $this->codes('?from=2026-11-17&to=2026-11-17'));
        $this->assertSame([], $this->codes('?from=2026-11-16&to=2026-11-16&search=RO-A'));
        $this->actingAs($this->advisor)->getJson('/api/repair-orders?with_progress=1')->assertJsonPath('progress.ready_today', 1);
    }

    public function test_mine_and_sort(): void
    {
        $this->assertSame(['RO-A', 'RO-B'], $this->codes('?mine=1'));
        $this->assertSame(['RO-D', 'RO-C', 'RO-B', 'RO-A'], $this->codes('?sort=created&dir=asc'));
        $this->actingAs($this->advisor)->getJson('/api/repair-orders')->assertOk()->assertJsonPath('data.0.vehicle.license_plate', '51K-111.11');
    }
}
