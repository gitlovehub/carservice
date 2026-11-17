<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\MaintenancePackage;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** ADV-09 — khách hàng của cố vấn: số xe, số lần ghé, lần gần nhất, có tài khoản; chi tiết kèm xe / phiếu / lịch sắp tới. */
class AdvisorCustomerListTest extends TestCase
{
    use RefreshDatabase;

    public function test_list_and_detail_include_visit_stats(): void
    {
        $advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $advisor->id]);
        $withAccount = Customer::factory()->create(['full_name' => 'Có Tài Khoản', 'account_id' => Account::factory()->create()->id]);
        $vehicle = Vehicle::factory()->create(['customer_id' => $withAccount->id]);
        Vehicle::factory()->create(['customer_id' => $withAccount->id]);
        foreach (['RO-L1' => now()->subDays(10), 'RO-L2' => now()->subDay()] as $code => $at) {
            RepairOrder::query()->create(['repair_order_code' => $code, 'customer_id' => $withAccount->id, 'vehicle_id' => $vehicle->id,
                'advisor_id' => $advisor->employee->id, 'status' => RepairOrder::HANDED_OVER, 'received_at' => $at]);
        }
        Appointment::query()->create(['appointment_code' => 'APT-L1', 'customer_id' => $withAccount->id, 'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(), 'appointment_time' => '09:00:00', 'request_type' => 'DIAGNOSIS', 'status' => 'CONFIRMED']);
        Customer::factory()->create(['full_name' => 'Vãng Lai', 'account_id' => null]);

        $response = $this->actingAs($advisor)->getJson('/api/customers?search='.urlencode('Có Tài'))->assertOk();
        $row = $response->json('data.data.0');
        $this->assertSame(2, $row['vehicles_count']);
        $this->assertSame(2, $row['repair_orders_count']);
        $this->assertTrue($row['has_account']);
        $this->assertNotNull($row['last_visit_at']);
        $this->assertSame(2, $response->json('summary.total'));
        $this->assertSame(1, $response->json('summary.with_account'));

        // Danh sách xe: tìm theo tên chủ xe, lọc theo hãng, lần sửa gần nhất.
        $vehicles = $this->actingAs($advisor)->getJson('/api/vehicles?search='.urlencode('Có Tài'))->assertOk()->json('data.data');
        $this->assertCount(2, $vehicles);
        $this->assertNotNull(collect($vehicles)->firstWhere('id', $vehicle->id)['last_service_at']);
        $brandId = $vehicle->model->brand_id;
        $this->assertTrue(collect($this->actingAs($advisor)->getJson("/api/vehicles?brand_id={$brandId}")->json('data.data'))->contains('id', $vehicle->id));

        $detail = $this->actingAs($advisor)->getJson("/api/customers/{$withAccount->id}")->assertOk()->json('data');
        $this->assertCount(2, $detail['vehicles']);
        $this->assertTrue($detail['has_account']);
        $this->assertNull(collect($detail['vehicles'])->firstWhere('id', $vehicle->id)['open_repair_order_code']);
        $this->assertSame('RO-L2', $detail['repair_orders'][0]['repair_order_code']);
        $this->assertSame('APT-L1', $detail['appointments'][0]['appointment_code']);
    }

    public function test_spending_tier_segments_and_plate_search(): void
    {
        $advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $advisor->id]);
        $loyal = Customer::factory()->create(['full_name' => 'Khách Quen']);
        $car = Vehicle::factory()->create(['customer_id' => $loyal->id, 'license_plate' => '76A-482.04']);
        foreach (range(1, Customer::LOYAL_MIN_VISITS) as $i) {
            $order = RepairOrder::query()->create(['repair_order_code' => "RO-LY{$i}", 'customer_id' => $loyal->id, 'vehicle_id' => $car->id,
                'advisor_id' => $advisor->employee->id, 'status' => RepairOrder::HANDED_OVER, 'received_at' => now()->subDays(40 + $i)]);
            Invoice::query()->create(['repair_order_id' => $order->id, 'invoice_code' => "INV-LY{$i}", 'status' => Invoice::PAID, 'subtotal' => 1000000, 'discount_amount' => 0, 'total_amount' => 1000000]);
        }
        $unpaid = RepairOrder::query()->create(['repair_order_code' => 'RO-LY-OPEN', 'customer_id' => $loyal->id, 'vehicle_id' => $car->id,
            'advisor_id' => $advisor->employee->id, 'status' => RepairOrder::IN_PROGRESS, 'received_at' => now()]);
        Invoice::query()->create(['repair_order_id' => $unpaid->id, 'invoice_code' => 'INV-LY-OPEN', 'status' => Invoice::UNPAID, 'subtotal' => 9, 'discount_amount' => 0, 'total_amount' => 9]);
        $loyal->forceFill(['created_at' => now()->subDays(90)])->save();
        $fresh = Customer::factory()->create(['full_name' => 'Khách Mới']);

        $response = $this->actingAs($advisor)->getJson('/api/customers?search=482.04')->assertOk();
        $row = $response->json('data.data.0');
        $this->assertSame('Khách Quen', $row['full_name']);
        $this->assertEquals(3000000, $row['total_spent']);
        $this->assertSame('LOYAL', $row['tier']);
        $this->assertTrue((bool) $row['in_shop']);
        $this->assertSame(1, $response->json('summary.loyal'));
        $this->assertSame(1, $response->json('summary.in_shop'));
        $this->assertSame(1, $response->json('summary.new_30_days'));

        $names = fn (string $segment) => collect($this->actingAs($advisor)->getJson("/api/customers?segment={$segment}")->json('data.data'))->pluck('full_name')->all();
        $this->assertSame(['Khách Quen'], $names('loyal'));
        $this->assertSame(['Khách Quen'], $names('in_shop'));
        $this->assertSame([$fresh->full_name], $names('new'));
        $this->actingAs($advisor)->getJson('/api/customers?segment=vip')->assertUnprocessable();

        $detail = $this->actingAs($advisor)->getJson("/api/customers/{$loyal->id}")->assertOk()->json('data');
        $this->assertSame('LOYAL', $detail['tier']);
        $this->assertEquals(3000000, $detail['total_spent']);
        $this->assertSame('RO-LY-OPEN', $detail['repair_orders'][0]['repair_order_code']);
        $this->assertSame(Invoice::UNPAID, $detail['repair_orders'][0]['invoice']['status']);
        $this->assertArrayHasKey('past_appointments', $detail);
        $this->assertArrayHasKey('reviews', $detail);
    }

    public function test_vehicle_segments_summary_and_detail_history(): void
    {
        $advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $advisor->id]);
        $inShop = Vehicle::factory()->create(['license_plate' => '51K-000.01']);
        $order = RepairOrder::query()->create(['repair_order_code' => 'RO-V1', 'customer_id' => $inShop->customer_id, 'vehicle_id' => $inShop->id,
            'advisor_id' => $advisor->employee->id, 'status' => RepairOrder::IN_PROGRESS, 'received_at' => now()]);
        Invoice::query()->create(['repair_order_id' => $order->id, 'invoice_code' => 'INV-V1', 'status' => Invoice::UNPAID, 'subtotal' => 5, 'discount_amount' => 0, 'total_amount' => 5]);
        $booked = Vehicle::factory()->create(['license_plate' => '51K-000.02']);
        $appointment = Appointment::query()->create(['appointment_code' => 'APT-V2', 'customer_id' => $booked->customer_id, 'vehicle_id' => $booked->id,
            'appointment_date' => now()->addDays(3)->toDateString(), 'appointment_time' => '09:00:00', 'request_type' => 'MAINTENANCE', 'status' => 'CONFIRMED']);
        $package = MaintenancePackage::factory()->create();
        $appointment->packages()->attach($package->id);
        Vehicle::factory()->create(['license_plate' => '51K-000.03']);

        $response = $this->actingAs($advisor)->getJson('/api/vehicles?search=51K-000')->assertOk();
        $this->assertEqualsCanonicalizing(['total' => 3, 'in_shop' => 1, 'upcoming' => 1, 'maintenance' => 1], collect($response->json('summary'))->only(['total', 'in_shop', 'upcoming', 'maintenance'])->all());
        $this->assertSame(now()->addDays(3)->toDateString(), substr((string) collect($response->json('data.data'))->firstWhere('id', $booked->id)['next_appointment_date'], 0, 10));

        $plates = fn (string $segment) => collect($this->actingAs($advisor)->getJson("/api/vehicles?segment={$segment}")->json('data.data'))->pluck('license_plate')->all();
        $this->assertSame(['51K-000.01'], $plates('in_shop'));
        $this->assertSame(['51K-000.02'], $plates('upcoming'));
        $this->assertSame(['51K-000.02'], $plates('maintenance'));

        $detail = $this->actingAs($advisor)->getJson("/api/vehicles/{$inShop->id}")->assertOk()->json('data');
        $this->assertSame('RO-V1', $detail['open_repair_order']['repair_order_code']);
        $this->assertEquals(5, $detail['repair_orders'][0]['invoice']['total_amount']);
        $this->assertSame(1, $detail['repair_orders_count']);
        $booking = $this->actingAs($advisor)->getJson("/api/vehicles/{$booked->id}")->json('data');
        $this->assertSame('APT-V2', $booking['upcoming_appointments'][0]['appointment_code']);
        $this->assertSame($package->name, $booking['upcoming_appointments'][0]['packages'][0]['name']);
    }

    public function test_advisor_cannot_delete_vehicle_in_workshop(): void
    {
        $advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $advisor->id]);
        $vehicle = Vehicle::factory()->create();
        RepairOrder::query()->create(['repair_order_code' => 'RO-DEL1', 'customer_id' => $vehicle->customer_id, 'vehicle_id' => $vehicle->id,
            'advisor_id' => $advisor->employee->id, 'status' => RepairOrder::RECEIVED, 'received_at' => now()]);
        $free = Vehicle::factory()->create();

        $this->actingAs($advisor)->deleteJson("/api/vehicles/{$vehicle->id}")->assertStatus(422);
        $this->assertNotSoftDeleted($vehicle);
        $this->actingAs($advisor)->deleteJson("/api/vehicles/{$free->id}")->assertOk();
        $this->assertSoftDeleted($free);
    }
}
