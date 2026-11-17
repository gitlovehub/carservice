<?php

namespace Tests\Feature;

use App\Mail\AppointmentConfirmationRequestMail;
use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Notification;
use App\Models\Service;
use App\Models\Vehicle;
use App\Models\WorkingHour;
use App\Services\AppointmentEmailConfirmationService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** Cố vấn gửi mail kèm dịch vụ đã đặt → khách bấm "Xác nhận lịch hẹn" trong mail → lịch PENDING → CONFIRMED. */
class AppointmentEmailConfirmationTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $customerAccount;

    private Appointment $appointment;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->advisor = Account::factory()->advisor()->create();
        $this->customerAccount = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $this->customerAccount->id, 'email' => 'khach@example.test']);
        for ($day = 0; $day <= 6; $day++) {
            WorkingHour::query()->create(['day_of_week' => $day, 'open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 5, 'is_active' => true]);
        }
        $this->appointment = Appointment::query()->create([
            'appointment_code' => 'APT-MAIL', 'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'appointment_date' => CarbonImmutable::today()->addDays(3)->toDateString(), 'appointment_time' => '09:00:00',
            'request_type' => 'MAINTENANCE', 'note' => 'Rửa xe giúp tôi', 'status' => 'PENDING',
        ]);
        $service = Service::factory()->create(['name' => 'Thay dầu động cơ', 'base_price' => 350000]);
        $this->appointment->services()->attach($service->id, ['estimated_price' => 350000]);
    }

    private function sentUrl(): string
    {
        $url = null;
        Mail::assertSent(AppointmentConfirmationRequestMail::class, function (AppointmentConfirmationRequestMail $mail) use (&$url) {
            $url = $mail->confirmUrl;

            return $mail->hasTo('khach@example.test');
        });

        return (string) $url;
    }

    public function test_advisor_sends_mail_with_booked_services_and_customer_confirms_by_button(): void
    {
        $this->actingAs($this->advisor)->postJson("/api/advisor/appointments/{$this->appointment->id}/send-confirmation-email")
            ->assertOk()->assertJsonPath('success', true);

        Mail::assertSent(AppointmentConfirmationRequestMail::class, function (AppointmentConfirmationRequestMail $mail) {
            $html = $mail->render();

            return str_contains($html, 'Thay dầu động cơ') && str_contains($html, '350.000') && str_contains($html, 'Rửa xe giúp tôi') && str_contains($html, 'APT-MAIL');
        });
        $url = $this->sentUrl();
        $this->assertSame('appointment.confirmation_email_sent', $this->appointment->activities()->first()->action);

        // Mở link (GET) chỉ hiển thị — trình quét link của hộp thư không xác nhận hộ khách.
        $this->get($url)->assertOk()->assertSee('Xác nhận lịch hẹn')->assertSee('Thay dầu động cơ');
        $this->assertSame('PENDING', $this->appointment->fresh()->status);

        $this->post($url)->assertOk()->assertSee('Đã xác nhận lịch hẹn');
        $fresh = $this->appointment->fresh();
        $this->assertSame('CONFIRMED', $fresh->status);
        $this->assertSame($this->advisor->id, (int) $fresh->handled_by_account_id);
        $log = $fresh->activities()->first();
        $this->assertSame(AppointmentEmailConfirmationService::CONFIRMED_BY_CUSTOMER, $log->action);
        $this->assertSame($this->customerAccount->id, (int) $log->account_id);
        $this->assertSame(1, Notification::query()->where('type', Notification::TYPE_APPOINTMENT_CONFIRMED)->count());

        // Bấm lại: báo đã xác nhận, không ghi thêm.
        $this->post($url)->assertOk()->assertSee('Lịch hẹn đã được xác nhận');
        $this->assertSame(1, Notification::query()->where('type', Notification::TYPE_APPOINTMENT_CONFIRMED)->count());
    }

    public function test_tampered_or_rescheduled_links_do_not_confirm(): void
    {
        $this->actingAs($this->advisor)->postJson("/api/advisor/appointments/{$this->appointment->id}/send-confirmation-email")->assertOk();
        $url = $this->sentUrl();

        $this->post(str_replace('slot=', 'slot=x', $url))->assertOk()->assertSee('Link đã hết hạn');
        $this->appointment->update(['appointment_time' => '10:00:00']);
        $this->post($url)->assertOk()->assertSee('Lịch hẹn đã thay đổi');
        $this->assertSame('PENDING', $this->appointment->fresh()->status);
    }

    public function test_cannot_send_without_email_or_when_not_pending(): void
    {
        $this->appointment->customer->update(['email' => null]);
        $this->customerAccount->update(['email' => 'acc@example.test']);
        // Không có email hồ sơ → dùng email tài khoản.
        $this->actingAs($this->advisor)->postJson("/api/advisor/appointments/{$this->appointment->id}/send-confirmation-email")->assertOk();
        Mail::assertSent(AppointmentConfirmationRequestMail::class, fn ($mail) => $mail->hasTo('acc@example.test'));

        $this->appointment->update(['status' => 'CONFIRMED']);
        $this->actingAs($this->advisor)->postJson("/api/advisor/appointments/{$this->appointment->id}/send-confirmation-email")->assertUnprocessable();
        $this->actingAs($this->customerAccount)->postJson("/api/advisor/appointments/{$this->appointment->id}/send-confirmation-email")->assertForbidden();
    }
}
