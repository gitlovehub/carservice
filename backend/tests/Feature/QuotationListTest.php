<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use App\Support\GarageDay;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Trang "Báo giá & phê duyệt" của cố vấn: danh sách báo giá, lọc trạng thái / ngày lập, tìm kiếm, số đếm. */
class QuotationListTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);

        $this->quotation('BG-A', Quotation::SENT, 'RO-A', '51K-111.11', 'Nguyễn An', now()->subDays(1));
        $this->quotation('BG-B', Quotation::APPROVED, 'RO-B', '30A-222.22', 'Trần Bình', now()->subDays(2));
        $this->quotation('BG-C', Quotation::REJECTED, 'RO-C', '29H-333.33', 'Lê Cường', now()->subDays(5));
    }

    private function quotation(string $code, string $status, string $orderCode, string $plate, string $name, $createdAt): void
    {
        $customer = Customer::factory()->create(['full_name' => $name]);
        $order = RepairOrder::query()->create([
            'repair_order_code' => $orderCode, 'customer_id' => $customer->id, 'status' => RepairOrder::WAITING_APPROVAL, 'received_at' => $createdAt,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id, 'license_plate' => $plate])->id,
            'advisor_id' => $this->advisor->employee->id,
        ]);
        $quotation = Quotation::query()->create([
            'quotation_code' => $code, 'repair_order_id' => $order->id, 'advisor_id' => $this->advisor->employee->id,
            'status' => $status, 'total_amount' => 1000000, 'type' => Quotation::TYPE_INITIAL,
        ]);
        $quotation->forceFill(['created_at' => $createdAt])->save();
    }

    private function codes(string $query): array
    {
        return collect($this->actingAs($this->advisor)->getJson("/api/quotations{$query}")->assertOk()->json('data'))->pluck('quotation_code')->all();
    }

    public function test_lists_newest_first_with_order_customer_and_vehicle_and_counts(): void
    {
        $response = $this->actingAs($this->advisor)->getJson('/api/quotations')->assertOk()
            ->assertJsonPath('data.0.quotation_code', 'BG-A')
            ->assertJsonPath('data.0.repair_order.repair_order_code', 'RO-A')
            ->assertJsonPath('data.0.repair_order.customer.full_name', 'Nguyễn An')
            ->assertJsonPath('data.0.repair_order.vehicle.license_plate', '51K-111.11');
        $this->assertEqualsCanonicalizing(['SENT' => 1, 'APPROVED' => 1, 'REJECTED' => 1], $response->json('counts'));
    }

    public function test_filters_by_status_search_and_created_date(): void
    {
        $this->assertSame(['BG-B', 'BG-C'], $this->codes('?status=APPROVED,REJECTED'));
        $this->assertSame(['BG-B'], $this->codes('?search=30A'));
        $this->assertSame(['BG-C'], $this->codes('?search=RO-C'));
        $this->assertSame(['BG-A', 'BG-B'], $this->codes('?from='.now(GarageDay::TIMEZONE)->subDays(3)->toDateString().'&to='.GarageDay::today()));
        $this->actingAs($this->advisor)->getJson('/api/quotations?from=2026-11-10&to=2026-11-01')->assertUnprocessable();
    }

    public function test_customer_cannot_list_quotations(): void
    {
        $this->actingAs(Account::factory()->create())->getJson('/api/quotations')->assertForbidden();
    }
}
