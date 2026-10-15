<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Inspection;
use App\Models\InspectionItem;
use App\Models\InspectionRecommendation;
use App\Models\Part;
use App\Models\RepairOrder;
use App\Models\Service;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InspectionControllerTest extends TestCase
{
    use RefreshDatabase;

    private function createTechnician(): array
    {
        $account = Account::factory()->technician()->create();
        $employee = Employee::factory()->create([
            'account_id' => $account->id,
        ]);
        $technician = TechnicianProfile::factory()->create(['employee_id' => $employee->id]);

        return [$account, $employee, $technician];
    }

    private function createAdvisor(): array
    {
        $account = Account::factory()->advisor()->create();
        $employee = Employee::factory()->create([
            'account_id' => $account->id,
        ]);

        return [$account, $employee];
    }

    private function createRepairOrder(string $status = RepairOrder::RECEIVED): RepairOrder
    {
        $customer = Customer::factory()->create();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $advisor = Employee::factory()->create();

        return RepairOrder::query()->create([
            'repair_order_code' => 'RO-'.uniqid(),
            'customer_id' => $customer->id,
            'vehicle_id' => $vehicle->id,
            'advisor_id' => $advisor->id,
            'status' => $status,
            'received_at' => now(),
        ]);
    }

    public function test_technician_can_create_inspection_with_passed_warning_failed_items(): void
    {
        [$account, , $technician] = $this->createTechnician();
        $repairOrder = $this->createRepairOrder(RepairOrder::RECEIVED);

        $service = Service::factory()->create();
        $part = Part::query()->create([
            'sku' => 'SKU-TEST-1',
            'name' => 'Má phanh gốm',
            'category' => 'Phanh',
            'unit' => 'Bộ',
            'cost_price' => 200000,
            'sell_price' => 350000,
            'status' => 'ACTIVE',
        ]);

        $payload = [
            'condition_description' => 'Xe rung lắc khi phanh',
            'diagnosis' => 'Má phanh mòn nghiêm trọng, lốp mòn nhẹ',
            'inspection_items' => [
                [
                    'item_name' => 'Má phanh trước',
                    'status' => InspectionItem::FAILED,
                    'condition_description' => 'Má phanh dưới 2mm',
                    'note' => 'Cần thay thế ngay',
                ],
                [
                    'item_name' => 'Lốp trước',
                    'status' => InspectionItem::WARNING,
                    'condition_description' => 'Gai lốp còn 3mm',
                    'note' => 'Theo dõi định kỳ',
                ],
                [
                    'item_name' => 'Đèn xe',
                    'status' => InspectionItem::PASSED,
                    'condition_description' => 'Hoạt động tốt',
                    'note' => null,
                ],
            ],
            'recommendations' => [
                [
                    'item_type' => InspectionRecommendation::TYPE_SERVICE,
                    'service_id' => $service->id,
                    'quantity' => 1,
                    'note' => 'Gói công thay phanh',
                ],
                [
                    'item_type' => InspectionRecommendation::TYPE_PART,
                    'part_id' => $part->id,
                    'quantity' => 2,
                    'note' => 'Bộ má phanh trước chính hãng',
                ],
            ],
        ];

        $response = $this->actingAs($account)
            ->postJson("/api/repair-orders/{$repairOrder->id}/inspections", $payload);

        $response->assertCreated()
            ->assertJsonPath('condition_description', 'Xe rung lắc khi phanh')
            ->assertJsonPath('technician_id', $technician->id)
            ->assertJsonCount(3, 'items')
            ->assertJsonCount(2, 'recommendations');

        $this->assertDatabaseHas('inspections', [
            'repair_order_id' => $repairOrder->id,
            'technician_id' => $technician->id,
        ]);

        $this->assertDatabaseHas('inspection_items', [
            'item_name' => 'Má phanh trước',
            'condition_status' => 'FAILED',
        ]);

        $this->assertDatabaseHas('inspection_recommendations', [
            'item_type' => 'SERVICE',
            'service_id' => $service->id,
        ]);

        $this->assertSame(RepairOrder::INSPECTING, $repairOrder->fresh()->status);
    }

    public function test_validation_fails_for_invalid_status_or_empty_items(): void
    {
        [$account] = $this->createTechnician();
        $repairOrder = $this->createRepairOrder();

        $payload = [
            'inspection_items' => [
                [
                    'item_name' => 'Bugi',
                    'status' => 'UNKNOWN_STATUS',
                ],
            ],
        ];

        $this->actingAs($account)
            ->postJson("/api/repair-orders/{$repairOrder->id}/inspections", $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['inspection_items.0.status']);
    }

    public function test_cannot_create_duplicate_inspection_for_same_repair_order(): void
    {
        [$account, , $technician] = $this->createTechnician();
        $repairOrder = $this->createRepairOrder();

        Inspection::query()->create([
            'repair_order_id' => $repairOrder->id,
            'technician_id' => $technician->id,
            'condition_description' => 'Phiếu đã có',
        ]);

        $payload = [
            'inspection_items' => [
                [
                    'item_name' => 'Lọc gió',
                    'status' => 'PASSED',
                ],
            ],
        ];

        $this->actingAs($account)
            ->postJson("/api/repair-orders/{$repairOrder->id}/inspections", $payload)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Mỗi lệnh sửa chữa chỉ thuộc về 1 phiếu kiểm tra tổng thể.');
    }

    public function test_technician_and_advisor_can_view_inspection_details(): void
    {
        [$techAccount, , $technician] = $this->createTechnician();
        [$advisorAccount] = $this->createAdvisor();
        $repairOrder = $this->createRepairOrder(RepairOrder::INSPECTING);

        $inspection = Inspection::query()->create([
            'repair_order_id' => $repairOrder->id,
            'technician_id' => $technician->id,
            'condition_description' => 'Đã kiểm tra sơ bộ',
        ]);

        InspectionItem::query()->create([
            'inspection_id' => $inspection->id,
            'item_name' => 'Ắc quy',
            'condition_status' => 'PASSED',
        ]);

        // Kỹ thuật viên xem chi tiết
        $this->actingAs($techAccount)
            ->getJson("/api/repair-orders/{$repairOrder->id}/inspections")
            ->assertOk()
            ->assertJsonPath('id', $inspection->id)
            ->assertJsonCount(1, 'items');

        // Cố vấn cũng có thể xem chi tiết để lập báo giá
        $this->actingAs($advisorAccount)
            ->getJson("/api/repair-orders/{$repairOrder->id}/inspections")
            ->assertOk()
            ->assertJsonPath('id', $inspection->id);
    }

    public function test_view_inspection_returns_404_if_no_inspection_exists(): void
    {
        [$account] = $this->createTechnician();
        $repairOrder = $this->createRepairOrder();

        $this->actingAs($account)
            ->getJson("/api/repair-orders/{$repairOrder->id}/inspections")
            ->assertNotFound()
            ->assertJsonPath('message', 'Lệnh sửa chữa này chưa có phiếu kiểm tra/chẩn đoán.');
    }

    public function test_technician_can_add_recommendations(): void
    {
        [$account, , $technician] = $this->createTechnician();
        $repairOrder = $this->createRepairOrder(RepairOrder::INSPECTING);

        Inspection::query()->create([
            'repair_order_id' => $repairOrder->id,
            'technician_id' => $technician->id,
        ]);

        $service = Service::factory()->create();

        $payload = [
            'item_type' => 'SERVICE',
            'service_id' => $service->id,
            'quantity' => 1,
            'note' => 'Bổ sung dịch vụ vệ sinh buồng đốt',
        ];

        $this->actingAs($account)
            ->postJson("/api/repair-orders/{$repairOrder->id}/inspections/recommendations", $payload)
            ->assertCreated()
            ->assertJsonPath('item_type', 'SERVICE')
            ->assertJsonPath('service_id', $service->id);

        $this->assertDatabaseHas('inspection_recommendations', [
            'service_id' => $service->id,
            'item_type' => 'SERVICE',
        ]);
    }

    public function test_technician_can_complete_inspection_and_status_changes_to_quoting(): void
    {
        [$account, , $technician] = $this->createTechnician();
        $repairOrder = $this->createRepairOrder(RepairOrder::INSPECTING);

        $inspection = Inspection::query()->create([
            'repair_order_id' => $repairOrder->id,
            'technician_id' => $technician->id,
        ]);

        $this->actingAs($account)
            ->postJson("/api/repair-orders/{$repairOrder->id}/inspections/complete")
            ->assertOk()
            ->assertJsonPath('id', $inspection->id);

        $this->assertSame(RepairOrder::QUOTING, $repairOrder->fresh()->status);
        $this->assertNotNull($inspection->fresh()->inspected_at);

        $this->assertDatabaseHas('repair_order_status_history', [
            'repair_order_id' => $repairOrder->id,
            'status' => RepairOrder::QUOTING,
        ]);
    }

    public function test_customer_cannot_call_technician_inspection_endpoints(): void
    {
        $customerAccount = Account::factory()->customer()->create();
        $repairOrder = $this->createRepairOrder();

        $this->actingAs($customerAccount)
            ->postJson("/api/repair-orders/{$repairOrder->id}/inspections", [
                'inspection_items' => [['item_name' => 'Lốp', 'status' => 'PASSED']],
            ])
            ->assertForbidden();
    }
}
