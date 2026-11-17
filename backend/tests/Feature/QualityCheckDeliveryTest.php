<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Invoice;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Kiểm tra sau sửa chữa (PO 17/11/2026: bắt buộc trước bàn giao) + trang Kiểm tra & bàn giao
 * (danh sách theo tình trạng: chờ kiểm tra → chờ thanh toán → chờ biên bản trả xe → đủ điều kiện).
 */
class QualityCheckDeliveryTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
    }

    private function order(string $code, string $status = RepairOrder::COMPLETED, array $attributes = []): RepairOrder
    {
        $customer = Customer::factory()->create();

        return RepairOrder::query()->create([
            'repair_order_code' => $code, 'customer_id' => $customer->id, 'status' => $status, 'received_at' => now()->subDay(),
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id, 'advisor_id' => $this->advisor->employee->id,
            'requires_check_in' => false, ...$attributes,
        ]);
    }

    private function paid(RepairOrder $order): void
    {
        Invoice::query()->create(['repair_order_id' => $order->id, 'invoice_code' => 'INV-'.$order->id, 'status' => Invoice::PAID, 'subtotal' => 0, 'discount_amount' => 0, 'total_amount' => 0]);
    }

    public function test_quality_check_requires_every_item_and_completed_status_then_unlocks_hand_over(): void
    {
        $order = $this->order('RO-QC');
        $this->paid($order);
        $all = array_keys(RepairOrder::QUALITY_CHECK_ITEMS);

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$order->id}/hand-over")->assertUnprocessable();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$order->id}/quality-check", ['items' => array_slice($all, 1)])
            ->assertUnprocessable()->assertJsonFragment(['message' => 'Chưa kiểm đủ: '.RepairOrder::QUALITY_CHECK_ITEMS['ENGINE'].'.']);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$order->id}/quality-check", ['items' => [...$all, 'FAKE']])->assertUnprocessable();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$order->id}/quality-check", ['items' => $all, 'note' => 'Chạy thử 3 km'])
            ->assertOk()->assertJsonPath('quality_check.note', 'Chạy thử 3 km')->assertJsonPath('quality_checked_by', $this->advisor->id)->assertJsonPath('quality_inspector.employee.full_name', $this->advisor->employee->full_name);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$order->id}/hand-over")->assertOk()->assertJsonPath('status', RepairOrder::HANDED_OVER);
    }

    public function test_quality_check_only_when_repair_completed(): void
    {
        $order = $this->order('RO-IP', RepairOrder::IN_PROGRESS);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$order->id}/quality-check", ['items' => array_keys(RepairOrder::QUALITY_CHECK_ITEMS)])->assertUnprocessable();
    }

    public function test_delivery_list_groups_orders_by_hand_over_readiness(): void
    {
        $this->order('RO-CHECK');
        $this->order('RO-PAY', attributes: ['quality_checked_at' => now()]);
        $this->paid($this->order('RO-OUT', attributes: ['quality_checked_at' => now(), 'requires_check_in' => true]));
        $this->paid($this->order('RO-READY', attributes: ['quality_checked_at' => now(), 'estimated_ready_at' => now()->subHour()]));
        $handed = $this->order('RO-DONE', RepairOrder::HANDED_OVER);
        $handed->statusHistory()->create(['status' => RepairOrder::HANDED_OVER]);

        $response = $this->actingAs($this->advisor)->getJson('/api/repair-orders?with_delivery=1&status=COMPLETED')->assertOk();
        $this->assertSame(['check' => 1, 'payment' => 1, 'checkout' => 1, 'ready' => 1, 'handed_today' => 1, 'late' => 1], $response->json('delivery'));
        $this->assertArrayHasKey('check_out_confirmed', $response->json('data.0'));

        foreach (['check' => 'RO-CHECK', 'payment' => 'RO-PAY', 'checkout' => 'RO-OUT', 'ready' => 'RO-READY', 'handed_today' => 'RO-DONE', 'late' => 'RO-READY'] as $key => $code) {
            $codes = collect($this->actingAs($this->advisor)->getJson("/api/repair-orders?delivery={$key}")->json('data'))->pluck('repair_order_code')->all();
            $this->assertSame([$code], $codes, $key);
        }
    }
}
