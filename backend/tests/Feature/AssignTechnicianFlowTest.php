<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\RepairOrder;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssignTechnicianFlowTest extends TestCase
{
    use RefreshDatabase;

    private function createAdvisor(): Account
    {
        $account = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $account->id]);

        return $account;
    }

    private function createTechnician(): TechnicianProfile
    {
        $account = Account::factory()->technician()->create();
        $employee = Employee::factory()->create(['account_id' => $account->id]);

        return TechnicianProfile::factory()->create(['employee_id' => $employee->id]);
    }

    private function createRepairOrder(string $status = RepairOrder::RECEIVED): RepairOrder
    {
        $customer = Customer::factory()->create();

        return RepairOrder::query()->create([
            'repair_order_code' => 'RO-'.uniqid(),
            'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'advisor_id' => Employee::factory()->create()->id,
            'status' => $status,
            'received_at' => now(),
        ]);
    }

    public function test_advisor_lists_only_active_technicians(): void
    {
        $technician = $this->createTechnician();
        $lockedTechnician = $this->createTechnician();
        $lockedTechnician->employee->account->update(['status' => Account::STATUS_LOCKED]);

        $this->actingAs($this->createAdvisor())
            ->getJson('/api/technicians')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $technician->id)
            ->assertJsonPath('0.active_assignments_count', 0);
    }

    public function test_customer_cannot_list_technicians(): void
    {
        $this->actingAs(Account::factory()->create())
            ->getJson('/api/technicians')
            ->assertForbidden();
    }

    public function test_assigning_moves_order_to_inspecting_and_rejects_duplicates(): void
    {
        $advisor = $this->createAdvisor();
        $technician = $this->createTechnician();
        $repairOrder = $this->createRepairOrder();
        $url = "/api/repair-orders/{$repairOrder->id}/assign-technician";

        $this->actingAs($advisor)->postJson($url, ['technician_id' => $technician->id])->assertCreated();
        $this->assertSame(RepairOrder::INSPECTING, $repairOrder->fresh()->status);

        $this->actingAs($advisor)->postJson($url, ['technician_id' => $technician->id])->assertUnprocessable();
        $this->assertDatabaseCount('assignments', 1);
    }

    public function test_cannot_assign_technician_to_finished_order(): void
    {
        $repairOrder = $this->createRepairOrder(RepairOrder::CLOSED);

        $this->actingAs($this->createAdvisor())
            ->postJson("/api/repair-orders/{$repairOrder->id}/assign-technician", ['technician_id' => $this->createTechnician()->id])
            ->assertUnprocessable();
    }
}
