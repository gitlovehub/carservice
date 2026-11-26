<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Employee;
use App\Models\Inventory;
use App\Models\Part;
use App\Models\VehicleModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Trang "Phụ tùng" của cố vấn: chỉ xem tồn kho (D-020), không lộ giá vốn, lọc theo mức tồn / dòng xe. */
class AdvisorPartsTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);

        $this->part('PT-1', 'Lọc dầu', 24, 10);
        $this->part('PT-2', 'Má phanh', 8, 10);
        $this->part('PT-3', 'Cần gạt mưa', 0, 5);
        $this->part('PT-4', 'Bugi cũ', 50, 5, 'INACTIVE');
    }

    private function part(string $sku, string $name, int $stock, int $min, string $status = 'ACTIVE'): Part
    {
        $part = Part::query()->create(['sku' => $sku, 'name' => $name, 'unit' => 'Cái', 'cost_price' => 100000, 'sell_price' => 150000, 'status' => $status, 'category' => 'Lọc']);
        Inventory::query()->create(['part_id' => $part->id, 'quantity' => $stock, 'min_quantity' => $min]);

        return $part;
    }

    private function skus(string $query = ''): array
    {
        return collect($this->actingAs($this->advisor)->getJson("/api/advisor/parts{$query}")->assertOk()->json('data'))->pluck('sku')->all();
    }

    public function test_lists_active_parts_with_stock_levels_and_summary_without_cost(): void
    {
        $response = $this->actingAs($this->advisor)->getJson('/api/advisor/parts')->assertOk()
            ->assertJsonPath('summary.total', 3)->assertJsonPath('summary.ok', 1)->assertJsonPath('summary.low', 1)->assertJsonPath('summary.out', 1)
            ->assertJsonPath('data.0.sku', 'PT-1')->assertJsonPath('data.0.level', 'ok');
        $this->assertArrayNotHasKey('cost', $response->json('data.0'));
        $this->assertSame(['PT-1', 'PT-2', 'PT-3'], $this->skus());
    }

    public function test_filters_by_level_search_and_compatible_model(): void
    {
        $this->assertSame(['PT-2'], $this->skus('?status=low'));
        $this->assertSame(['PT-3'], $this->skus('?status=out'));
        $this->assertSame(['PT-1'], $this->skus('?status=ok&search=lọc'));

        $model = VehicleModel::factory()->create();
        Part::query()->where('sku', 'PT-2')->firstOrFail()->compatibleModels()->sync([$model->id]);
        $this->assertSame(['PT-2'], $this->skus("?model_id={$model->id}"));
    }

    public function test_shared_parts_catalog_never_exposes_cost_price(): void
    {
        $response = $this->actingAs($this->advisor)->getJson('/api/parts')->assertOk();

        $this->assertNotEmpty($response->json());
        $this->assertArrayNotHasKey('cost_price', $response->json('0'));
        $this->assertArrayHasKey('sell_price', $response->json('0'));
    }

    public function test_advisor_reads_stock_moves_but_cannot_adjust_stock(): void
    {
        $this->actingAs($this->advisor)->getJson('/api/advisor/stock-moves')->assertOk();
        $part = Part::query()->where('sku', 'PT-1')->firstOrFail();
        $this->actingAs($this->advisor)->postJson("/api/admin/parts/{$part->id}/stock", ['type' => 'IN', 'quantity' => 5])->assertForbidden();
    }
}
