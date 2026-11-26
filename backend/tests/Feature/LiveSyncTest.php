<?php

namespace Tests\Feature;

use App\Events\LiveChanged;
use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Notification;
use App\Models\Vehicle;
use App\Support\LiveStamp;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/** Đồng bộ nhanh (GET /api/live) + xóa / đánh dấu toàn bộ thông báo của khách. */
class LiveSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_stamp_changes_when_business_data_changes_but_not_on_plain_reads(): void
    {
        $account = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $account->id]);

        $this->getJson('/api/live')->assertUnauthorized();

        $first = $this->actingAs($account)->getJson('/api/live')->assertOk()->json('stamp');
        foreach (['/api/me', '/api/me/notifications', '/api/me/appointments', '/api/me/repair-orders', '/api/me/vehicles'] as $read) {
            $this->actingAs($account)->getJson($read);
        }
        $this->assertSame($first, $this->actingAs($account)->getJson('/api/live')->json('stamp'), 'Đọc dữ liệu không làm đổi dấu');

        usleep(2000);
        Vehicle::factory()->create(['customer_id' => $customer->id]);
        app()->terminate();
        $this->assertNotSame($first, $this->actingAs($account)->getJson('/api/live')->json('stamp'), 'Lưu model → dấu đổi');
    }

    public function test_staff_list_pages_do_not_change_the_stamp(): void
    {
        $advisor = Account::factory()->advisor()->create();
        $this->actingAs($advisor)->getJson('/api/live'); // ghi nhận phần tạo dữ liệu mẫu
        $first = $this->actingAs($advisor)->getJson('/api/live')->assertOk()->json('stamp');
        usleep(2000);
        foreach (['/api/advisor/dashboard', '/api/advisor/customer-updates', '/api/advisor/appointments', '/api/repair-orders', '/api/advisor/quotations'] as $read) {
            $this->actingAs($advisor)->getJson($read);
        }
        $this->assertSame($first, $this->actingAs($advisor)->getJson('/api/live')->json('stamp'));
    }

    public function test_change_is_broadcast_to_staff_and_only_the_affected_customer(): void
    {
        Event::fake([LiveChanged::class]);
        $owner = Account::factory()->create();
        $stranger = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $owner->id]);
        Customer::factory()->create(['account_id' => $stranger->id]);
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);
        app()->terminate();
        Event::assertDispatched(LiveChanged::class);

        Event::fake([LiveChanged::class]);
        $appointment = Appointment::query()->create([
            'appointment_code' => 'APT-LIVE', 'customer_id' => $customer->id, 'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDay()->toDateString(), 'appointment_time' => '09:00:00', 'request_type' => 'MAINTENANCE', 'status' => 'PENDING',
        ]);
        app()->terminate();
        Event::assertDispatched(LiveChanged::class, function (LiveChanged $event) use ($owner, $stranger) {
            $channels = array_map(fn ($c) => $c->name, $event->broadcastOn());

            return in_array('private-staff', $channels, true)
                && in_array("private-account.{$owner->id}", $channels, true)
                && ! in_array("private-account.{$stranger->id}", $channels, true);
        });

        // Bản ghi con (thông báo) cũng tới đúng khách.
        Event::fake([LiveChanged::class]);
        Notification::query()->create(['account_id' => $owner->id, 'appointment_id' => $appointment->id, 'channel' => 'WEB', 'type' => 'APPOINTMENT_CONFIRMED', 'title' => 'T', 'content' => 'C', 'status' => 'SENT']);
        app()->terminate();
        Event::assertDispatched(LiveChanged::class, fn (LiveChanged $event) => $event->accountIds === [$owner->id]);
    }

    public function test_unreachable_websocket_server_does_not_block_later_requests(): void
    {
        // Reverb tắt: cổng không có máy chủ nào nghe.
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.options.host' => '127.0.0.1',
            'broadcasting.connections.reverb.options.port' => 1,
            'broadcasting.connections.reverb.options.scheme' => 'http',
        ]);
        $before = LiveStamp::current();
        usleep(2000);

        LiveStamp::bump();
        $this->assertNotSame($before, LiveStamp::current(), 'Dấu thời gian vẫn đổi → trang tự cập nhật qua /api/live');

        // Trong thời gian tạm ngừng: không thử kết nối lại, chỉ ghi dấu thời gian.
        Event::fake([LiveChanged::class]);
        $second = LiveStamp::current();
        usleep(2000);
        LiveStamp::bump();
        Event::assertNotDispatched(LiveChanged::class);
        $this->assertNotSame($second, LiveStamp::current());
    }

    public function test_customer_can_clear_and_read_all_own_notifications_only(): void
    {
        $account = Account::factory()->create();
        $other = Account::factory()->create();
        foreach ([$account, $account, $other] as $owner) {
            Notification::query()->create(['account_id' => $owner->id, 'channel' => 'WEB', 'type' => 'APPOINTMENT_CONFIRMED', 'title' => 'T', 'content' => 'C', 'status' => 'SENT']);
        }

        $this->actingAs($account)->getJson('/api/me/notifications?limit=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('unread_count', 2);

        $before = LiveStamp::current();
        usleep(2000);
        $this->actingAs($account)->patchJson('/api/me/notifications/read-all')->assertOk();
        $this->assertNotSame($before, LiveStamp::current(), 'Đánh dấu hàng loạt vẫn báo đồng bộ');
        $this->actingAs($account)->getJson('/api/me/notifications')->assertJsonPath('unread_count', 0);

        $this->actingAs($account)->deleteJson('/api/me/notifications')->assertOk()->assertJsonPath('data.deleted', 2);
        $this->actingAs($account)->getJson('/api/me/notifications')->assertJsonCount(0, 'data');
        $this->assertSame(1, Notification::query()->where('account_id', $other->id)->count(), 'Không xóa thông báo của tài khoản khác');
    }
}
