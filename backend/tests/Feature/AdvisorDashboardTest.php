<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Part;
use App\Models\PartRequest;
use App\Models\RepairOrder;
use App\Models\RepairOrderStatusHistory;
use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** ADV-10 — API Tổng quan cố vấn: số liệu thật, chuỗi 7 ngày, việc cần xử lý (gồm phụ tùng đã về đủ). */
class AdvisorDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_counts_are_real(): void
    {
        $advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $advisor->id]);
        $customer = Customer::factory()->create(['full_name' => 'Khách A']);
        $vehicle = Vehicle::factory()->create(['customer_id' => $customer->id, 'license_plate' => '51K-000.01']);
        $apt = fn (string $date, string $time, string $status) => Appointment::query()->create([
            'appointment_code' => 'APT-'.uniqid(), 'customer_id' => $customer->id, 'vehicle_id' => $vehicle->id,
            'appointment_date' => $date, 'appointment_time' => $time, 'request_type' => 'DIAGNOSIS', 'status' => $status,
        ]);
        $apt(now()->toDateString(), '09:00:00', 'CONFIRMED');
        $apt(now()->toDateString(), '08:00:00', 'PENDING');
        $apt(now()->toDateString(), '10:00:00', 'CANCELLED');
        $apt(now()->subDay()->toDateString(), '09:00:00', 'CHECKED_IN');
        $apt(now()->subDay()->toDateString(), '11:00:00', 'CANCELLED');
        $apt(now()->addDays(2)->toDateString(), '09:00:00', 'PENDING');

        $order = fn (string $status, string $code) => RepairOrder::query()->create([
            'repair_order_code' => $code, 'customer_id' => $customer->id, 'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'advisor_id' => $advisor->employee->id, 'status' => $status, 'received_at' => now(),
        ]);
        $order(RepairOrder::IN_PROGRESS, 'RO-1');
        $waiting = $order(RepairOrder::WAITING_FOR_PARTS, 'RO-2');
        $ready = $order(RepairOrder::WAITING_FOR_PARTS, 'RO-3');
        $order(RepairOrder::COMPLETED, 'RO-4');
        $handed = $order(RepairOrder::HANDED_OVER, 'RO-5');
        RepairOrderStatusHistory::query()->create(['repair_order_id' => $handed->id, 'status' => RepairOrder::HANDED_OVER]);
        $part = Part::query()->create(['sku' => 'P-1', 'name' => 'Lọc', 'unit' => 'Cái', 'sell_price' => 1, 'status' => 'ACTIVE']);
        PartRequest::query()->create(['repair_order_id' => $waiting->id, 'part_id' => $part->id, 'quantity' => 1, 'status' => PartRequest::ORDERED]);
        PartRequest::query()->create(['repair_order_id' => $ready->id, 'part_id' => $part->id, 'quantity' => 1, 'status' => PartRequest::RECEIVED]);

        $data = $this->actingAs($advisor)->getJson('/api/advisor/dashboard')->assertOk()->json('data');

        $this->assertSame(2, $data['kpis']['pending']['value']);
        $this->assertSame(2, $data['kpis']['today']['value']); // bỏ lịch đã huỷ
        $this->assertSame(1, $data['kpis']['today']['previous']);
        $this->assertCount(7, $data['kpis']['today']['series']);
        $this->assertSame(2, end($data['kpis']['today']['series']));
        $this->assertSame(3, $data['kpis']['repairing']['value']);
        $this->assertSame(1, $data['kpis']['delivery']['value']);
        $this->assertSame(1, $data['kpis']['delivery']['handed_today']);
        $this->assertSame(['08:00', '09:00'], array_column($data['appointments_today'], 'time'));
        $this->assertSame('51K-000.01', $data['appointments_today'][0]['plate']);
        $this->assertCount(1, $data['appointments_upcoming']);
        // Hôm qua: bỏ lịch đã huỷ, giữ lịch đã đến — khớp số "So với hôm qua".
        $this->assertSame(['CHECKED_IN'], array_column($data['appointments_yesterday'], 'status'));
        $this->assertSame(1, $data['todo']['waiting_parts']);
        $this->assertSame(1, $data['todo']['parts_ready']);
        $this->assertSame(1, $data['todo']['confirmed_today']);
        $this->assertSame(['intake' => 0, 'quote' => 0, 'repair' => 1, 'parts' => 2, 'deliver' => 1], array_column($data['stages'], 'value', 'key'));

        $this->actingAs(Account::factory()->create())->getJson('/api/advisor/dashboard')->assertForbidden();
    }
}
