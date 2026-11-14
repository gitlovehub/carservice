<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\ContactMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContactMessageControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_send_a_contact_message(): void
    {
        $this->postJson('/api/contact-messages', [
            'name' => '  Nguyễn Văn An ',
            'phone' => '0901 234 567',
            'message' => 'Tôi muốn hỏi giá bảo dưỡng 20.000 km.',
        ])->assertCreated();

        $this->assertDatabaseHas('contact_messages', [
            'name' => 'Nguyễn Văn An', 'phone' => '0901 234 567', 'email' => null, 'status' => ContactMessage::NEW,
        ]);
    }

    public function test_contact_message_is_validated(): void
    {
        $this->postJson('/api/contact-messages', ['name' => '', 'phone' => 'abc', 'email' => 'sai', 'message' => 'ngắn'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'phone', 'email', 'message']);

        $this->assertDatabaseCount('contact_messages', 0);
    }

    public function test_contact_form_is_rate_limited(): void
    {
        $payload = ['name' => 'Lan', 'phone' => '0901234567', 'message' => 'Cho tôi hỏi lịch trống ngày mai.'];
        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/contact-messages', $payload)->assertCreated();
        }

        $this->postJson('/api/contact-messages', $payload)->assertTooManyRequests();
    }

    public function test_admin_lists_filters_and_marks_messages_handled(): void
    {
        $new = ContactMessage::factory()->create();
        ContactMessage::factory()->handled()->create();
        Sanctum::actingAs(Account::factory()->admin()->create());

        $this->getJson('/api/admin/contact-messages')->assertOk()
            ->assertJsonPath('meta.total', 2)->assertJsonPath('summary.new', 1);
        $this->getJson('/api/admin/contact-messages?status=NEW')->assertOk()
            ->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $new->id);

        $this->patchJson("/api/admin/contact-messages/{$new->id}", ['status' => ContactMessage::HANDLED])->assertOk()
            ->assertJsonPath('data.status', ContactMessage::HANDLED);
        $this->assertNotNull($new->fresh()->handled_at);
    }

    public function test_only_admin_can_read_messages(): void
    {
        $this->getJson('/api/admin/contact-messages')->assertUnauthorized();

        Sanctum::actingAs(Account::factory()->create());
        $this->getJson('/api/admin/contact-messages')->assertForbidden();
    }
}
