<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Employee;
use App\Models\Part;
use App\Models\RepairOrder;
use App\Models\Review;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicReviewControllerTest extends TestCase
{
    use RefreshDatabase;

    private int $seq = 0;

    protected function setUp(): void
    {
        parent::setUp();
        Model::unguard();
    }

    protected function tearDown(): void
    {
        Model::reguard();
        parent::tearDown();
    }

    private function review(int $rating, ?string $comment, bool $hidden = false, string $name = 'Nguyễn Văn An'): Review
    {
        $customer = Customer::factory()->create(['full_name' => $name, 'phone' => '0900000'.str_pad((string) ++$this->seq, 3, '0', STR_PAD_LEFT)]);
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id, 'license_plate' => sprintf('30A-%03d.%02d', $this->seq, $this->seq)]);
        $order = RepairOrder::query()->create([
            'repair_order_code' => 'RO-2026-P'.str_pad((string) $this->seq, 4, '0', STR_PAD_LEFT),
            'customer_id' => $customer->id, 'vehicle_id' => $vehicle->id,
            'advisor_id' => Employee::factory()->create()->id,
            'status' => RepairOrder::HANDED_OVER, 'received_at' => now()->subDays($this->seq),
        ]);

        return Review::query()->create([
            'repair_order_id' => $order->id, 'customer_id' => $customer->id,
            'overall_rating' => $rating, 'comment' => $comment, 'is_hidden' => $hidden,
        ]);
    }

    public function test_featured_reviews_are_public_filtered_and_anonymised(): void
    {
        $good = $this->review(5, 'Làm nhanh, báo giá rõ ràng.');
        $this->review(4, 'Nhân viên tư vấn nhiệt tình.', false, 'Lan');
        $this->review(2, 'Chờ lâu, không hài lòng.');
        $this->review(5, 'Spam nội dung bị ẩn đi', true);
        $this->review(5, '');
        $this->review(5, 'tot');

        $res = $this->getJson('/api/reviews/featured')->assertOk();

        $res->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $good->id)
            ->assertJsonPath('data.0.customer', 'Nguyễn V. An')
            ->assertJsonPath('data.1.customer', 'Lan')
            // Trung bình & số lượng tính trên mọi đánh giá không bị ẩn (5, 4, 2, 5 rỗng, 5 "tot").
            ->assertJsonPath('summary.count', 5)
            ->assertJsonPath('summary.average', 4.2);

        $json = $res->getContent();
        $this->assertStringNotContainsString('0900000', $json);
        $this->assertStringNotContainsString('30A-', $json);
        $this->assertStringNotContainsString('RO-2026', $json);
    }

    public function test_featured_reviews_are_capped_at_six(): void
    {
        for ($i = 0; $i < 8; $i++) {
            $this->review(5, "Dịch vụ tốt, nhân viên nhiệt tình số {$i}.");
        }

        $this->getJson('/api/reviews/featured')->assertOk()
            ->assertJsonCount(6, 'data')
            ->assertJsonPath('summary.count', 8);
    }

    public function test_home_stats_counts_finished_orders_and_visible_reviews(): void
    {
        $this->review(5, 'Làm nhanh, báo giá rõ ràng.');   // HANDED_OVER
        $this->review(4, 'Nhân viên tư vấn nhiệt tình.');  // HANDED_OVER
        $this->review(1, 'Spam nội dung bị ẩn đi', true);  // HANDED_OVER, đánh giá ẩn
        // Phiếu đang sửa: không tính là đã phục vụ.
        $customer = Customer::factory()->create();
        RepairOrder::query()->create([
            'repair_order_code' => 'RO-2026-P9999', 'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id, 'license_plate' => '30A-999.99'])->id,
            'advisor_id' => Employee::factory()->create()->id, 'status' => RepairOrder::IN_PROGRESS, 'received_at' => now(),
        ]);

        Part::query()->create(['sku' => 'P-001', 'name' => 'Lọc dầu', 'unit' => 'cái', 'status' => 'ACTIVE']);
        Part::query()->create(['sku' => 'P-002', 'name' => 'Má phanh', 'unit' => 'bộ', 'status' => 'ACTIVE']);
        Part::query()->create(['sku' => 'P-003', 'name' => 'Ngừng bán', 'unit' => 'cái', 'status' => 'INACTIVE']);

        $this->getJson('/api/home-stats')->assertOk()
            ->assertJsonPath('data.parts_count', 2)
            ->assertJsonPath('data.completed_orders', 3)
            ->assertJsonPath('data.vehicles_served', 3)
            ->assertJsonPath('data.customers_served', 3)
            ->assertJsonPath('data.rating_count', 2)
            ->assertJsonPath('data.rating_average', 4.5);
    }
}
