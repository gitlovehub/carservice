<?php

namespace Tests\Feature;

use App\Mail\AppointmentRescheduledMail;
use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\GarageSetting;
use App\Models\Notification;
use App\Models\Vehicle;
use App\Services\AppointmentActivityService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Cố vấn đổi lịch SAU KHI đã thống nhất với khách (điện thoại / tại quầy): khách không phải xác nhận lại trên web.
 * Phủ các tình huống: chờ xác nhận / đã xác nhận, khách chưa đồng ý, ngày quá khứ, ngoài giờ, ngày nghỉ, đầy chỗ,
 * đã tiếp nhận / huỷ / không đến, hai cố vấn cùng đổi, đồng bộ khách + bộ lọc ngày, lịch sử.
 */
class AppointmentRescheduleTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $customerAccount;

    private Appointment $appointment;

    private string $day;

    private string $nextDay;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        // Cố định "hiện tại" theo giờ gara để kiểm tra ngày quá khứ / ngày nghỉ ổn định.
        $this->travelTo(Carbon::parse('2026-11-18 08:00:00', 'Asia/Ho_Chi_Minh'));
        $this->day = '2026-11-20';
        $this->nextDay = '2026-11-21';
        foreach (range(0, 6) as $dow) {
            DB::table('working_hours')->updateOrInsert(['day_of_week' => $dow], ['open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 1, 'is_active' => true]);
        }
        GarageSetting::query()->create(['name' => 'Gara', 'booking_slots' => ['morning' => ['08:00', '09:00', '10:00'], 'afternoon' => ['14:00']]]);
        $this->advisor = Account::factory()->advisor()->create();
        $this->customerAccount = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $this->customerAccount->id, 'email' => 'khach@example.test']);
        $this->appointment = Appointment::query()->create([
            'appointment_code' => 'APT-RS', 'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'appointment_date' => $this->day, 'appointment_time' => '09:00:00', 'request_type' => 'MAINTENANCE', 'status' => 'PENDING',
        ]);
    }

    private function reschedule(array $overrides = [], ?Account $as = null)
    {
        return $this->actingAs($as ?? $this->advisor)->postJson("/api/advisor/appointments/{$this->appointment->id}/reschedule", [
            'appointment_date' => $this->nextDay, 'appointment_time' => '10:00',
            'reason_type' => 'CUSTOMER_REQUEST', 'reason' => 'Khách bận buổi sáng',
            'customer_agreed' => true, 'contact_method' => 'PHONE',
            'expected_date' => $this->day, 'expected_time' => '09:00',
            ...$overrides,
        ]);
    }

    private function assertUnchanged(): void
    {
        $fresh = $this->appointment->fresh();
        $this->assertSame($this->day, Carbon::parse($fresh->appointment_date)->toDateString());
        $this->assertSame('09:00:00', substr((string) $fresh->appointment_time, 0, 8));
    }

    public function test_pending_and_confirmed_keep_their_status_and_history_is_recorded(): void
    {
        $this->reschedule()->assertOk()->assertJsonPath('data.status', 'PENDING');

        $this->appointment->update(['status' => 'CONFIRMED']);
        $this->reschedule(['appointment_time' => '14:00', 'reason_type' => 'GARAGE_ADJUSTMENT', 'reason' => null, 'contact_method' => 'IN_PERSON',
            'expected_date' => $this->nextDay, 'expected_time' => '10:00'])->assertOk()->assertJsonPath('data.status', 'CONFIRMED');

        // Lịch sử: không ghi đè lần trước; đủ giờ cũ → mới, lý do, cách liên hệ, người đổi.
        $logs = $this->appointment->fresh()->activities()->where('action', AppointmentActivityService::RESCHEDULED)->get();
        $this->assertCount(2, $logs);
        $latest = $logs->first();
        $this->assertSame(['appointment_date' => $this->nextDay, 'appointment_time' => '10:00:00'], $latest->old_values);
        $this->assertSame('14:00:00', $latest->new_values['appointment_time']);
        $this->assertSame('GARAGE_ADJUSTMENT', $latest->new_values['reason_type']);
        $this->assertSame('IN_PERSON', $latest->new_values['contact_method']);
        $this->assertTrue($latest->new_values['customer_agreed']);
        $this->assertSame('Gara cần điều chỉnh khung giờ', $latest->reason);
        $this->assertSame($this->advisor->id, (int) $latest->account_id);
        $this->assertSame('Khách hàng yêu cầu: Khách bận buổi sáng', $logs->last()->reason);
    }

    public function test_requires_customer_agreement_and_valid_reason(): void
    {
        $this->reschedule(['customer_agreed' => false])->assertUnprocessable()->assertJsonValidationErrors('customer_agreed');
        $this->reschedule(['customer_agreed' => null])->assertUnprocessable()->assertJsonValidationErrors('customer_agreed');
        $this->reschedule(['reason_type' => 'OTHER', 'reason' => ''])->assertUnprocessable()->assertJsonValidationErrors('reason');
        $this->reschedule(['reason_type' => 'BAD'])->assertUnprocessable()->assertJsonValidationErrors('reason_type');
        $this->reschedule(['contact_method' => null])->assertUnprocessable()->assertJsonValidationErrors('contact_method');
        $this->assertUnchanged();
        Mail::assertNothingSent();
    }

    public function test_rejects_past_outside_hours_holiday_and_full_slot(): void
    {
        $this->reschedule(['appointment_date' => '2026-11-17'])->assertUnprocessable()->assertJsonValidationErrors('appointment_time');
        // Hôm nay 07:00 giờ gara đã qua (hiện là 08:00 VN).
        $this->reschedule(['appointment_date' => '2026-11-18', 'appointment_time' => '07:00'])->assertUnprocessable();
        $this->reschedule(['appointment_time' => '18:00'])->assertUnprocessable()->assertJsonValidationErrors('appointment_time');
        DB::table('holidays')->insert(['holiday_date' => $this->nextDay, 'reason' => 'Nghỉ lễ']);
        $this->reschedule()->assertUnprocessable()->assertJsonValidationErrors('appointment_date');

        // Khung 14:00 ngày 20 đã có 1 lịch (max_slots = 1) → đầy.
        $other = Vehicle::factory()->create();
        Appointment::query()->create(['appointment_code' => 'APT-FULL', 'customer_id' => $other->customer_id, 'vehicle_id' => $other->id,
            'appointment_date' => $this->day, 'appointment_time' => '14:00:00', 'request_type' => 'REPAIR', 'status' => 'CONFIRMED']);
        $this->reschedule(['appointment_date' => $this->day, 'appointment_time' => '14:00'])->assertUnprocessable()
            ->assertJsonPath('errors.appointment_time.0', 'Khung giờ đã đầy.');
        $this->assertUnchanged();
    }

    public function test_checked_in_cancelled_and_no_show_cannot_be_rescheduled(): void
    {
        foreach ([
            'CHECKED_IN' => 'Lịch đã tiếp nhận xe, không thể đổi ngày giờ hẹn.',
            'CANCELLED' => 'Lịch hẹn đã huỷ, không thể đổi.',
            'NO_SHOW' => 'Khách đã không đến lịch này. Vui lòng tạo lịch hẹn mới nếu khách muốn đặt lại.',
        ] as $status => $message) {
            $this->appointment->update(['status' => $status]);
            $this->reschedule()->assertUnprocessable()->assertJsonPath('errors.status.0', $message);
        }
        $this->assertUnchanged();
    }

    public function test_second_advisor_with_stale_view_is_rejected(): void
    {
        $other = Account::factory()->advisor()->create();
        $this->reschedule()->assertOk();
        // Cố vấn thứ hai vẫn thấy 09:00 ngày 20 → bị từ chối, không ghi đè.
        $this->reschedule(['appointment_time' => '14:00'], $other)->assertUnprocessable()->assertJsonValidationErrors('appointment_date');
        $fresh = $this->appointment->fresh();
        $this->assertSame('10:00:00', substr((string) $fresh->appointment_time, 0, 8));
        $this->assertSame(1, $fresh->activities()->where('action', AppointmentActivityService::RESCHEDULED)->count());
    }

    public function test_customer_and_advisor_lists_see_the_new_time(): void
    {
        $this->reschedule()->assertOk();

        // Cố vấn: lọc ngày cũ không còn lịch, ngày mới có; số đếm theo ngày cập nhật.
        $old = $this->actingAs($this->advisor)->getJson("/api/advisor/appointments?date_from={$this->day}&date_to={$this->day}")->assertOk();
        $this->assertSame(0, $old->json('counts.ALL'));
        $new = $this->actingAs($this->advisor)->getJson("/api/advisor/appointments?date_from={$this->nextDay}&date_to={$this->nextDay}")->assertOk();
        $this->assertSame(1, $new->json('counts.ALL'));
        $this->assertSame('10:00:00', substr((string) $new->json('data.0.appointment_time'), 0, 8));

        // Khách: không phải xác nhận lại; thấy giờ mới + thông báo đổi lịch + email (kênh sẵn có).
        $this->assertSame('PENDING', $this->appointment->fresh()->status);
        $this->assertSame(1, Notification::query()->where('account_id', $this->customerAccount->id)->where('type', Notification::TYPE_APPOINTMENT_RESCHEDULED)->count());
        Mail::assertSent(AppointmentRescheduledMail::class, fn ($mail) => $mail->hasTo('khach@example.test'));
    }
}
