<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Part;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminInventoryControllerTest extends TestCase
{
    use RefreshDatabase;

    private Account $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = Account::factory()->admin()->create();
        Employee::factory()->create(['account_id' => $this->admin->id, 'full_name' => 'Quản Trị Kho']);
        Sanctum::actingAs($this->admin);
    }

    private function part(string $sku, int $stock, int $min, string $status = 'ACTIVE', string $category = 'Phanh'): Part
    {
        $part = Part::query()->create(['sku' => $sku, 'name' => "Phụ tùng {$sku}", 'category' => $category, 'unit' => 'Bộ', 'cost_price' => 100_000, 'sell_price' => 150_000, 'status' => $status]);
        Inventory::query()->create(['part_id' => $part->id, 'quantity' => $stock, 'min_quantity' => $min]);

        return $part;
    }

    public function test_requires_admin(): void
    {
        Sanctum::actingAs(Account::factory()->create(['role' => Account::ROLE_ADVISOR]));
        $this->getJson('/api/admin/parts')->assertForbidden();
        $this->getJson('/api/admin/stock-moves')->assertForbidden();
    }

    public function test_lists_parts_with_stock_levels_and_summary(): void
    {
        $this->part('OK-1', 20, 5);
        $low = $this->part('LOW-1', 2, 5);
        $out = $this->part('OUT-1', 0, 5, 'ACTIVE', 'Lọc');
        $this->part('OFF-1', 10, 5, 'INACTIVE');

        $this->getJson('/api/admin/parts')->assertOk()
            ->assertJsonPath('meta.total', 4)
            ->assertJsonPath('summary.active', 3)
            ->assertJsonPath('summary.low', 1)
            ->assertJsonPath('summary.out', 1)
            ->assertJsonPath('summary.stock_value', 3_200_000)
            ->assertJsonPath('categories', ['Lọc', 'Phanh']);
        $this->getJson('/api/admin/parts?status=low')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $low->id)->assertJsonPath('data.0.level', 'low');
        $this->getJson('/api/admin/parts?status=out')->assertJsonPath('data.0.id', $out->id);
        $this->getJson('/api/admin/parts?category=Lọc')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/admin/parts?search=low-1')->assertJsonPath('meta.total', 1);
    }

    public function test_create_and_update_part_with_compatible_models(): void
    {
        $vios = VehicleModel::factory()->create(['brand_id' => VehicleBrand::factory()->create(['name' => 'Toyota'])->id, 'name' => 'Vios']);

        $id = $this->postJson('/api/admin/parts', [
            'sku' => ' ty-90915 ', 'name' => 'Lọc dầu Toyota', 'category' => 'Lọc', 'unit' => 'Cái', 'cost_price' => 90_000, 'sell_price' => 150_000,
            'min_quantity' => 10, 'compat_model_ids' => [$vios->id],
        ])->assertCreated()
            ->assertJsonPath('data.sku', 'TY-90915')
            ->assertJsonPath('data.stock', 0)
            ->assertJsonPath('data.min', 10)
            ->assertJsonPath('data.compat.0.name', 'Toyota Vios')
            ->json('data.id');

        $this->postJson('/api/admin/parts', ['sku' => 'TY-90915', 'name' => 'X', 'unit' => 'Cái', 'cost_price' => 200, 'sell_price' => 100])
            ->assertJsonValidationErrors('sku');
        $this->postJson('/api/admin/parts', ['sku' => 'NEW-1', 'name' => 'X', 'unit' => 'Cái', 'cost_price' => 200, 'sell_price' => 100])
            ->assertJsonValidationErrors('sell_price');

        $this->patchJson("/api/admin/parts/{$id}", [
            'sku' => 'TY-90915', 'name' => 'Lọc dầu Toyota chính hãng', 'unit' => 'Cái', 'cost_price' => 95_000, 'sell_price' => 160_000, 'status' => 'INACTIVE', 'compat_model_ids' => [],
        ])->assertOk()->assertJsonPath('data.status', 'INACTIVE')->assertJsonPath('data.compat', []);
    }

    public function test_stock_in_out_and_moves_history(): void
    {
        $part = $this->part('BRK-1', 3, 5);

        $this->postJson("/api/admin/parts/{$part->id}/stock", ['type' => 'IN', 'quantity' => 10, 'note' => 'Nhập NCC Toyota'])
            ->assertOk()->assertJsonPath('data.stock', 13);
        $this->postJson("/api/admin/parts/{$part->id}/stock", ['type' => 'OUT', 'quantity' => 20])->assertJsonValidationErrors('quantity');
        $this->postJson("/api/admin/parts/{$part->id}/stock", ['type' => 'OUT', 'quantity' => 4, 'note' => 'Hỏng khi vận chuyển'])
            ->assertOk()->assertJsonPath('data.stock', 9);

        // Xuất theo phiếu (không có người tạo) → hiển thị cố vấn của phiếu.
        $advisor = Employee::factory()->create(['full_name' => 'Cố Vấn Hai']);
        $customer = Customer::factory()->create();
        $order = RepairOrder::query()->create(['repair_order_code' => 'RO-2026-X1', 'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id, 'advisor_id' => $advisor->id, 'status' => RepairOrder::IN_PROGRESS]);
        InventoryTransaction::query()->create(['inventory_id' => $part->inventory->id, 'repair_order_id' => $order->id, 'transaction_type' => 'OUT', 'quantity' => 1]);

        $rows = $this->getJson('/api/admin/stock-moves')->assertOk()->assertJsonPath('meta.total', 3)->json('data');
        $this->assertSame(['RO-2026-X1', 'Cố Vấn Hai'], [$rows[0]['ref'], $rows[0]['by']]);
        $this->assertSame('Quản Trị Kho', $rows[1]['by']);
        $this->getJson('/api/admin/stock-moves?type=IN')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.note', 'Nhập NCC Toyota');
        $this->getJson('/api/admin/stock-moves?search=X1')->assertJsonPath('meta.total', 1);
    }
}
