<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\Service;
use App\Models\Vehicle;
use App\Models\WorkItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** P5-B — dịch vụ nhanh: báo giá niêm yết, bỏ chẩn đoán, bắt buộc 4 ảnh tổng quan + khách duyệt giá. */
class QuickServiceFlowTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $owner;

    private int $orderId;

    private int $checkInId;

    private Service $oilChange;

    private Service $engineRepair;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
        $this->owner = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $this->owner->id]);
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $this->oilChange = Service::factory()->create(['name' => 'Thay dầu', 'base_price' => 250000, 'estimated_minutes' => 30, 'status' => 'ACTIVE', 'service_level' => 'QUICK']);
        $this->engineRepair = Service::factory()->create(['name' => 'Đại tu máy', 'base_price' => 9000000, 'status' => 'ACTIVE']);

        $this->orderId = $this->actingAs($this->advisor)->postJson('/api/repair-orders', ['customer_id' => $customer->id, 'vehicle_id' => $vehicle->id])->assertCreated()->json('id');
        $this->checkInId = $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/handovers", [
            'type' => 'CHECK_IN', 'person_name' => 'Chủ xe', 'person_relation' => 'OWNER',
            'items' => [['category' => 'EXTERIOR', 'label' => 'Tổng quan', 'condition' => 'OK']],
        ])->assertCreated()->json('id');
    }

    private function photos(array $positions): void
    {
        foreach ($positions as $position) {
            $this->actingAs($this->advisor)->post('/api/media', [
                'file' => UploadedFile::fake()->create("{$position}.jpg", 40, 'image/jpeg'),
                'attachable_type' => 'handover', 'attachable_id' => $this->checkInId, 'position_code' => $position,
            ], ['Accept' => 'application/json'])->assertCreated();
        }
    }

    private function confirmCheckIn(): void
    {
        $this->actingAs($this->advisor)->postJson("/api/handovers/{$this->checkInId}/submit")->assertOk();
        $this->actingAs($this->owner)->postJson("/api/me/handovers/{$this->checkInId}/confirm")->assertOk();
    }

    private function quick(array $serviceIds)
    {
        return $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/quick-quotation", ['service_ids' => $serviceIds]);
    }

    public function test_quick_service_skips_diagnosis_but_customer_still_approves_price(): void
    {
        $this->photos(['FRONT', 'REAR', 'LEFT', 'RIGHT']);
        $this->confirmCheckIn();

        $quotationId = $this->quick([$this->oilChange->id])->assertCreated()
            ->assertJsonPath('status', Quotation::SENT)->assertJsonPath('total_amount', '250000.00')->json('id');
        $order = RepairOrder::query()->find($this->orderId);
        $this->assertSame(RepairOrder::WAITING_APPROVAL, $order->status);
        $this->assertSame(RepairOrder::FLOW_QUICK, $order->flow_type);
        $this->assertFalse($order->inspections()->exists());

        // Chưa duyệt thì chưa được sửa.
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/start-repair")->assertUnprocessable();

        $itemId = Quotation::query()->find($quotationId)->items()->value('id');
        $this->actingAs($this->owner)->postJson("/api/me/quotations/{$quotationId}/respond", ['responses' => [['item_id' => $itemId, 'is_approved' => true]]])->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/start-repair")->assertOk();
        WorkItem::query()->where('repair_order_id', $this->orderId)->update(['status' => WorkItem::COMPLETED]);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/complete")->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->orderId}/invoice")->assertCreated()->assertJsonPath('total_amount', '250000.00');
    }

    public function test_requires_four_overview_photos_on_confirmed_check_in(): void
    {
        $this->quick([$this->oilChange->id])->assertUnprocessable();

        $this->photos(['FRONT', 'REAR', 'LEFT']);
        $this->confirmCheckIn();
        $this->quick([$this->oilChange->id])->assertUnprocessable()->assertJsonPath('message', fn ($m) => str_contains($m, 'RIGHT'));
        $this->assertSame(RepairOrder::RECEIVED, RepairOrder::query()->find($this->orderId)->status);
        $this->assertSame(0, Quotation::query()->count());
    }

    public function test_only_active_quick_services_and_only_from_received(): void
    {
        $this->photos(['FRONT', 'REAR', 'LEFT', 'RIGHT']);
        $this->confirmCheckIn();

        $this->quick([$this->oilChange->id, $this->engineRepair->id])->assertUnprocessable();
        $this->oilChange->update(['status' => 'INACTIVE']);
        $this->quick([$this->oilChange->id])->assertUnprocessable();
        $this->oilChange->update(['status' => 'ACTIVE']);
        $this->actingAs($this->owner)->postJson("/api/repair-orders/{$this->orderId}/quick-quotation", ['service_ids' => [$this->oilChange->id]])->assertForbidden();

        $this->quick([$this->oilChange->id])->assertCreated();
        $this->quick([$this->oilChange->id])->assertUnprocessable();
    }
}
