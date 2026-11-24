<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\RepairOrder;
use App\Models\Review;
use App\Models\ReviewReplyRevision;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdvisorReviewControllerTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisorAccount;

    private Employee $advisor;

    private Employee $otherAdvisor;

    private int $sequence = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->advisorAccount = Account::factory()->create(['role' => Account::ROLE_ADVISOR]);
        $this->advisor = Employee::factory()->create(['account_id' => $this->advisorAccount->id]);
        $this->otherAdvisor = Employee::factory()->create(['account_id' => Account::factory()->create(['role' => Account::ROLE_ADVISOR])->id]);
        Sanctum::actingAs($this->advisorAccount);
    }

    /** @param  array<string, mixed>  $attributes */
    private function reviewFor(Employee $advisor, array $attributes = []): Review
    {
        $customer = Customer::factory()->create();
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id, 'license_plate' => sprintf('30A-%03d.00', ++$this->sequence)]);
        $order = RepairOrder::query()->forceCreate([
            'repair_order_code' => 'RO-ADV-'.$this->sequence, 'customer_id' => $customer->id, 'vehicle_id' => $vehicle->id,
            'advisor_id' => $advisor->id, 'status' => RepairOrder::HANDED_OVER, 'received_at' => now(),
        ]);

        return Review::query()->forceCreate([
            'repair_order_id' => $order->id, 'customer_id' => $customer->id, 'overall_rating' => 4, 'comment' => 'Làm nhanh', ...$attributes,
        ]);
    }

    public function test_lists_only_visible_reviews_of_assigned_orders_with_summary(): void
    {
        $mine = $this->reviewFor($this->advisor, ['overall_rating' => 5]);
        $this->reviewFor($this->advisor, ['overall_rating' => 3, 'reply' => 'Cảm ơn', 'replied_at' => now()]);
        $this->reviewFor($this->advisor, ['is_hidden' => true]);
        $this->reviewFor($this->otherAdvisor);

        $this->getJson('/api/advisor/reviews')->assertOk()
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('summary.total', 2)
            ->assertJsonPath('summary.average', 4)
            ->assertJsonPath('summary.unreplied', 1)
            ->assertJsonPath('summary.replied', 1);
        $this->getJson('/api/advisor/reviews?status=unreplied&rating=5')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $mine->id);
        $this->getJson('/api/advisor/reviews?status=hidden')->assertUnprocessable();
    }

    public function test_replies_and_edits_own_reply_with_history(): void
    {
        $review = $this->reviewFor($this->advisor);

        $this->postJson("/api/advisor/reviews/{$review->id}/reply", ['reply' => 'Bản một'])->assertOk()->assertJsonPath('data.can_edit_reply', true);
        $this->postJson("/api/advisor/reviews/{$review->id}/reply", ['reply' => 'Gửi trùng'])->assertConflict();
        $this->putJson("/api/advisor/reviews/{$review->id}/reply", ['reply' => 'Bản hai', 'expected_reply' => 'Bản một', 'overall_rating' => 1, 'is_hidden' => true])->assertOk();

        $fresh = $review->fresh();
        $this->assertSame('Bản hai', $fresh->reply);
        $this->assertSame(4, $fresh->overall_rating);
        $this->assertFalse($fresh->is_hidden);
        $this->assertSame(2, ReviewReplyRevision::query()->where('review_id', $review->id)->where('edited_by_account_id', $this->advisorAccount->id)->count());
    }

    public function test_cannot_touch_unassigned_hidden_or_other_authors_replies(): void
    {
        $unassigned = $this->reviewFor($this->otherAdvisor);
        $hidden = $this->reviewFor($this->advisor, ['is_hidden' => true]);
        $legacy = $this->reviewFor($this->advisor, ['reply' => 'Phản hồi cũ', 'replied_at' => now()]);
        $byAdmin = $this->reviewFor($this->advisor);
        Sanctum::actingAs(Account::factory()->admin()->create());
        $this->postJson("/api/admin/reviews/{$byAdmin->id}/reply", ['reply' => 'Admin trả lời'])->assertOk();
        Sanctum::actingAs($this->advisorAccount);

        $this->postJson("/api/advisor/reviews/{$unassigned->id}/reply", ['reply' => 'X'])->assertForbidden();
        $this->postJson("/api/advisor/reviews/{$hidden->id}/reply", ['reply' => 'X'])->assertNotFound();
        $this->putJson("/api/advisor/reviews/{$legacy->id}/reply", ['reply' => 'X', 'expected_reply' => 'Phản hồi cũ'])->assertForbidden();
        $this->putJson("/api/advisor/reviews/{$byAdmin->id}/reply", ['reply' => 'X', 'expected_reply' => 'Admin trả lời'])->assertForbidden();

        $this->assertNull($unassigned->fresh()->reply);
        $this->assertSame('Admin trả lời', $byAdmin->fresh()->reply);
    }

    public function test_advisor_cannot_use_admin_review_actions_and_other_roles_cannot_use_advisor_api(): void
    {
        $review = $this->reviewFor($this->advisor, ['reply' => 'Có sẵn', 'replied_at' => now()]);

        $this->patchJson("/api/admin/reviews/{$review->id}", ['is_hidden' => true])->assertForbidden();
        $this->getJson("/api/admin/reviews/{$review->id}/reply-history")->assertForbidden();
        $this->deleteJson("/api/advisor/reviews/{$review->id}/reply")->assertStatus(405);

        foreach ([Account::factory()->admin()->create(), Account::factory()->create(['role' => Account::ROLE_CUSTOMER])] as $account) {
            Sanctum::actingAs($account);
            $this->getJson('/api/advisor/reviews')->assertForbidden();
        }
    }
}
