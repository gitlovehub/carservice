<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Vehicle;
use App\Models\WorkingHour;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** "Cập nhật từ khách" trên Tổng quan cố vấn: khách đặt / tự đổi / tự hủy lịch hiện mới nhất trước; lịch nhân viên tạo hộ không hiện. */
class AdvisorCustomerUpdatesTest extends TestCase
{
    use RefreshDatabase;

    public function test_feed_lists_customer_actions_newest_first(): void
    {
        for ($day = 0; $day <= 6; $day++) {
            WorkingHour::query()->create(['day_of_week' => $day, 'open_time' => '08:00:00', 'close_time' => '17:00:00', 'max_slots' => 5, 'is_active' => true]);
        }
        $advisor = Account::factory()->advisor()->create();
        $account = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $account->id, 'full_name' => 'Khách Feed']);
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id]);
        $date = CarbonImmutable::today()->addDays(3)->toDateString();

        // Khách tự đặt, rồi tự đổi giờ, rồi tự hủy một lịch khác.
        $this->travel(-10)->minutes();
        $booked = $this->actingAs($account)->postJson('/api/appointments', [
            'vehicle_id' => $vehicle->id, 'appointment_date' => $date, 'appointment_time' => '09:00',
            'request_type' => 'MAINTENANCE', 'symptom_description' => 'Kiểm tra',
        ])->assertCreated()->json('data.id');
        $this->travelBack();
        $this->actingAs($account)->patchJson("/api/appointments/{$booked}", ['appointment_date' => $date, 'appointment_time' => '10:00'])->assertOk();

        $other = Appointment::query()->create([
            'appointment_code' => 'APT-CANCEL', 'customer_id' => $customer->id, 'vehicle_id' => $vehicle->id,
            'appointment_date' => $date, 'appointment_time' => '14:00:00', 'request_type' => 'MAINTENANCE', 'status' => 'PENDING',
        ]);
        $this->actingAs($account)->postJson("/api/appointments/{$other->id}/cancel")->assertOk();

        // Lịch nhân viên tạo hộ → không phải cập nhật từ khách.
        $this->actingAs($advisor)->postJson('/api/advisor/appointments', [
            'customer_id' => $customer->id, 'vehicle_id' => $vehicle->id, 'appointment_date' => $date, 'appointment_time' => '15:00',
            'request_type' => 'MAINTENANCE', 'symptom_description' => 'Đặt hộ',
        ])->assertCreated();

        $data = $this->actingAs($advisor)->getJson('/api/advisor/customer-updates')->assertOk()->json('data');
        $types = array_column($data, 'type');
        $this->assertSame('CANCELLED', $types[0]);
        $this->assertContains('RESCHEDULED', $types);
        $this->assertSame(2, count(array_filter($types, fn ($t) => $t === 'BOOKED'))); // lịch khách đặt + lịch APT-CANCEL (không có dấu tạo hộ)
        $this->assertSame('Khách Feed', $data[0]['customer_name']);
        $resched = collect($data)->firstWhere('type', 'RESCHEDULED');
        $this->assertSame('09:00', $resched['old_time']);
        $this->assertSame('10:00', $resched['appointment']['appointment_time']);

        $this->actingAs($account)->getJson('/api/advisor/customer-updates')->assertForbidden();
    }
}
