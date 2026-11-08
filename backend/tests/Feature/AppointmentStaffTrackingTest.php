<?php

namespace Tests\Feature;

use App\Mail\AppointmentRescheduledMail;
use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Notification;
use App\Models\Vehicle;
use App\Models\WorkingHour;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/** Nhiều cố vấn: biết ai tạo / xác nhận / tiếp nhận / đổi / hủy lịch; cố vấn đổi lịch giúp khách (lý do + email). */
class AppointmentStaffTrackingTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisorA;

    private Account $advisorB;

    private Account $customerAccount;

    private Appointment $appointment;

    private CarbonImmutable $date;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->advisorA = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisorA->id, 'full_name' => 'Cố vấn An']);
        $this->advisorB = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisorB->id, 'full_name' => 'Cố vấn Bình']);
        $this->customerAccount = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $this->customerAccount->id, 'email' => 'khach@example.test']);
        for ($day = 0; $day <= 6; $day++) {
            WorkingHour::query()->create(['day_of_week' => $day, 'open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 5, 'is_active' => true]);
        }
        $this->date = CarbonImmutable::today()->addDays(5);
        $this->appointment = Appointment::query()->create([
            'appointment_code' => 'APT-TRACK', 'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'appointment_date' => $this->date->toDateString(), 'appointment_time' => '09:00:00',
            'request_type' => 'MAINTENANCE', 'status' => 'PENDING',
        ]);
    }

    public function test_each_action_records_which_advisor_handled_it(): void
    {
        $this->actingAs($this->advisorA)->postJson("/api/advisor/appointments/{$this->appointment->id}/confirm")->assertOk();
        $this->assertSame($this->advisorA->id, (int) $this->appointment->fresh()->handled_by_account_id);
        $this->actingAs($this->advisorB)->postJson("/api/advisor/appointments/{$this->appointment->id}/check-in")->assertOk();

        $show = $this->actingAs($this->advisorA)->getJson("/api/advisor/appointments/{$this->appointment->id}")->assertOk()
            ->assertJsonPath('data.handled_by.employee.full_name', 'Cố vấn Bình');
        $activities = collect($show->json('data.activities'));
        $this->assertSame(['appointment.checked_in', 'appointment.confirmed'], $activities->pluck('action')->all());
        $this->assertSame('Cố vấn An', $activities[1]['account']['employee']['full_name']);

        $this->actingAs($this->advisorA)->getJson("/api/advisor/appointments?handled_by={$this->advisorB->id}")->assertOk()->assertJsonCount(1, 'data');
        $this->actingAs($this->advisorA)->getJson("/api/advisor/appointments?handled_by={$this->advisorA->id}")->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_advisor_reschedules_with_reason_and_customer_is_notified(): void
    {
        $this->actingAs($this->advisorA)->postJson("/api/advisor/appointments/{$this->appointment->id}/reschedule", [
            'appointment_date' => $this->date->toDateString(), 'appointment_time' => '14:00',
        ])->assertUnprocessable()->assertJsonValidationErrors('reason');
        $this->actingAs($this->advisorA)->postJson("/api/advisor/appointments/{$this->appointment->id}/reschedule", [
            'appointment_date' => $this->date->toDateString(), 'appointment_time' => '20:00', 'reason' => 'Khách xin đổi giờ',
        ])->assertUnprocessable();

        $this->actingAs($this->advisorA)->postJson("/api/advisor/appointments/{$this->appointment->id}/reschedule", [
            'appointment_date' => $this->date->addDay()->toDateString(), 'appointment_time' => '14:00', 'reason' => 'Khách bận buổi sáng',
        ])->assertOk();

        $fresh = $this->appointment->fresh();
        $this->assertSame('14:00:00', substr((string) $fresh->appointment_time, 0, 8));
        $this->assertSame($this->advisorA->id, (int) $fresh->handled_by_account_id);
        $log = $fresh->activities()->first();
        $this->assertSame('appointment.rescheduled', $log->action);
        $this->assertSame('09:00:00', $log->old_values['appointment_time']);
        $this->assertSame('Khách bận buổi sáng', $log->reason);
        Mail::assertSent(AppointmentRescheduledMail::class, fn ($mail) => $mail->hasTo('khach@example.test') && str_contains($mail->render(), 'Khách bận buổi sáng'));
        $this->assertSame($this->customerAccount->id, Notification::query()->where('type', 'APPOINTMENT_RESCHEDULED')->sole()->account_id);
    }

    public function test_cannot_reschedule_checked_in_and_customers_cannot_use_staff_endpoints(): void
    {
        $this->actingAs($this->customerAccount)->postJson("/api/advisor/appointments/{$this->appointment->id}/reschedule", [
            'appointment_date' => $this->date->toDateString(), 'appointment_time' => '14:00', 'reason' => 'Tự đổi qua API nhân viên',
        ])->assertForbidden();

        $this->appointment->update(['status' => 'CHECKED_IN']);
        $this->actingAs($this->advisorA)->postJson("/api/advisor/appointments/{$this->appointment->id}/reschedule", [
            'appointment_date' => $this->date->toDateString(), 'appointment_time' => '14:00', 'reason' => 'Đổi sau khi xe đã tới',
        ])->assertUnprocessable();
        Mail::assertNothingSent();
    }

    public function test_admin_sees_activity_per_advisor(): void
    {
        $this->actingAs($this->advisorA)->postJson("/api/advisor/appointments/{$this->appointment->id}/confirm")->assertOk();
        $this->actingAs($this->advisorB)->postJson("/api/advisor/appointments/{$this->appointment->id}/cancel", ['cancel_reason' => 'Khách hủy'])->assertOk();

        $admin = Account::factory()->create(['role' => Account::ROLE_ADMIN]);
        $rows = collect($this->actingAs($admin)->getJson('/api/admin/advisor-activity')->assertOk()->json('data'))->keyBy('account_id');
        $this->assertSame(1, $rows[$this->advisorA->id]['confirmed']);
        $this->assertSame(1, $rows[$this->advisorB->id]['cancelled']);
        $this->assertSame('Cố vấn Bình', $rows[$this->advisorB->id]['name']);
        $this->actingAs($this->advisorA)->getJson('/api/admin/advisor-activity')->assertForbidden();
    }
}
