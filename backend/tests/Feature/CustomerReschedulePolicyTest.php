<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\GarageSetting;
use App\Models\Vehicle;
use App\Services\CustomerReschedulePolicy;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Khách tự đổi lịch trên web: tối đa 2 lần, trước giờ hẹn ≥ 12 tiếng, có ghi lịch sử; Admin chỉnh được giới hạn. */
class CustomerReschedulePolicyTest extends TestCase
{
    use RefreshDatabase;

    private Account $account;

    private Appointment $appointment;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-11-18 08:00:00', 'Asia/Ho_Chi_Minh'));
        foreach (range(0, 6) as $dow) {
            DB::table('working_hours')->updateOrInsert(['day_of_week' => $dow], ['open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 5, 'is_active' => true]);
        }
        $this->account = Account::factory()->customer()->create();
        $customer = Customer::factory()->create(['account_id' => $this->account->id]);
        $this->appointment = Appointment::query()->create([
            'appointment_code' => 'APT-SELF', 'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'appointment_date' => '2026-11-20', 'appointment_time' => '09:00:00', 'request_type' => 'MAINTENANCE', 'status' => 'PENDING',
        ]);
    }

    private function move(string $time, string $date = '2026-11-20')
    {
        return $this->actingAs($this->account)->patchJson("/api/appointments/{$this->appointment->id}", ['appointment_date' => $date, 'appointment_time' => $time]);
    }

    public function test_customer_can_reschedule_twice_then_must_contact_the_garage(): void
    {
        $this->actingAs($this->account)->getJson("/api/appointments/{$this->appointment->id}")->assertOk()
            ->assertJsonPath('data.reschedule.left', 2)->assertJsonPath('data.reschedule.allowed', true);

        $this->move('10:00')->assertOk();
        $this->move('11:00')->assertOk();
        $this->move('14:00')->assertUnprocessable()->assertJsonPath('errors.appointment_date.0', 'Bạn đã tự đổi lịch 2 lần. Vui lòng liên hệ gara để được hỗ trợ đổi tiếp.');
        $this->assertSame('11:00:00', substr((string) $this->appointment->fresh()->appointment_time, 0, 8));

        // Lịch sử: 2 lần khách tự đổi, giờ cũ → mới, đứng tên tài khoản khách.
        $logs = $this->appointment->activities()->where('action', CustomerReschedulePolicy::ACTION)->get();
        $this->assertCount(2, $logs);
        $this->assertSame('10:00:00', $logs->first()->old_values['appointment_time']);
        $this->assertSame('11:00:00', $logs->first()->new_values['appointment_time']);
        $this->assertSame($this->account->id, (int) $logs->first()->account_id);

        $this->actingAs($this->account)->getJson("/api/appointments/{$this->appointment->id}")->assertOk()
            ->assertJsonPath('data.reschedule.left', 0)->assertJsonPath('data.reschedule.allowed', false);

        // Cố vấn thấy số lần khách tự đổi trên bảng lịch hẹn.
        $advisor = Account::factory()->advisor()->create();
        $this->actingAs($advisor)->getJson('/api/advisor/appointments?date=2026-11-20')->assertOk()->assertJsonPath('data.0.customer_reschedules', 2);
    }

    public function test_cutoff_12_hours_before_the_current_appointment_time(): void
    {
        $this->appointment->update(['appointment_date' => '2026-11-18', 'appointment_time' => '19:00:00']);
        // 08:00 → giờ hẹn 19:00 còn 11 tiếng (< 12) → không tự đổi được.
        $this->move('16:00', '2026-11-19')->assertUnprocessable()
            ->assertJsonPath('errors.appointment_date.0', 'Chỉ tự đổi lịch trước giờ hẹn ít nhất 12 tiếng. Vui lòng liên hệ gara để đổi lịch.');
    }

    public function test_changing_only_services_does_not_count_and_admin_can_change_policy(): void
    {
        $this->actingAs($this->account)->patchJson("/api/appointments/{$this->appointment->id}", ['note' => 'Thêm ghi chú'])->assertOk();
        $this->assertSame(0, $this->appointment->activities()->where('action', CustomerReschedulePolicy::ACTION)->count());

        $admin = Account::factory()->create(['role' => Account::ROLE_ADMIN]);
        $this->actingAs($admin)->putJson('/api/admin/reschedule-policy', ['limit' => 1, 'cutoff_hours' => 24])->assertOk()
            ->assertJsonPath('data.limit', 1)->assertJsonPath('data.cutoff_hours', 24);
        $this->assertSame(['limit' => 1, 'cutoff_hours' => 24], GarageSetting::reschedulePolicy());
        $this->actingAs($this->account)->putJson('/api/admin/reschedule-policy', ['limit' => 5, 'cutoff_hours' => 1])->assertForbidden();

        $this->move('10:00')->assertOk();
        $this->move('11:00')->assertUnprocessable()->assertJsonValidationErrors('appointment_date');
    }
}
