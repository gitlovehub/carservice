<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\MaintenancePackage;
use App\Models\Service;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Trang Lịch hẹn (cố vấn): tìm theo tên xe, lọc nhiều gói / dịch vụ, danh sách lựa chọn cho thanh lọc. */
class AdvisorAppointmentFilterTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private function appointment(string $code, Vehicle $vehicle): Appointment
    {
        return Appointment::query()->create([
            'appointment_code' => $code, 'customer_id' => $vehicle->customer_id, 'vehicle_id' => $vehicle->id,
            'appointment_date' => now()->addDays(2)->toDateString(), 'appointment_time' => '09:00:00',
            'request_type' => 'MAINTENANCE', 'status' => 'PENDING',
        ]);
    }

    public function test_sort_by_appointment_time_or_booking_time_is_stable_across_pages(): void
    {
        $this->advisor = Account::factory()->advisor()->create();
        $vehicle = Vehicle::factory()->create();
        $make = fn (string $code, string $date, string $time, string $status, string $created) => tap(Appointment::query()->create([
            'appointment_code' => $code, 'customer_id' => $vehicle->customer_id, 'vehicle_id' => $vehicle->id,
            'appointment_date' => $date, 'appointment_time' => $time, 'request_type' => 'MAINTENANCE', 'status' => $status,
        ]), fn (Appointment $a) => $a->forceFill(['created_at' => $created])->saveQuietly());
        $make('NOV19-1000', '2026-11-19', '10:00:00', 'CONFIRMED', '2026-11-10 08:00:00');
        $make('NOV18-0900-A', '2026-11-18', '09:00:00', 'PENDING', '2026-11-12 08:00:00');
        $make('NOV18-0900-B', '2026-11-18', '09:00:00', 'PENDING', '2026-11-11 08:00:00');
        $make('NOV18-1400', '2026-11-18', '14:00:00', 'PENDING', '2026-11-14 08:00:00');
        $make('NOV15-0900', '2026-11-15', '09:00:00', 'CHECKED_IN', '2026-11-01 08:00:00');
        $codes = fn (string $q) => collect($this->actingAs($this->advisor)->getJson("/api/advisor/appointments?{$q}")->assertOk()->json('data'))->pluck('appointment_code')->all();

        // Giờ hẹn sớm nhất / muộn nhất: theo ngày rồi giờ; trùng 09:00 thì theo id (A tạo trước B) cùng chiều.
        $this->assertSame(['NOV15-0900', 'NOV18-0900-A', 'NOV18-0900-B', 'NOV18-1400', 'NOV19-1000'], $codes('sort=time&dir=asc'));
        $this->assertSame(['NOV19-1000', 'NOV18-1400', 'NOV18-0900-B', 'NOV18-0900-A', 'NOV15-0900'], $codes('sort=time&dir=desc'));
        // Mới đặt gần đây / Đặt lâu nhất: theo created_at.
        $this->assertSame(['NOV18-1400', 'NOV18-0900-A', 'NOV18-0900-B', 'NOV19-1000', 'NOV15-0900'], $codes('sort=created&dir=desc'));
        $this->assertSame(['NOV15-0900', 'NOV19-1000', 'NOV18-0900-B', 'NOV18-0900-A', 'NOV18-1400'], $codes('sort=created&dir=asc'));
        // Sắp ở Laravel trước khi phân trang: ghép các trang 2 dòng = đúng thứ tự toàn bộ, không trùng / sót.
        $paged = [...$codes('sort=time&dir=asc&per_page=2&page=1'), ...$codes('sort=time&dir=asc&per_page=2&page=2'), ...$codes('sort=time&dir=asc&per_page=2&page=3')];
        $this->assertSame($codes('sort=time&dir=asc'), $paged);

        // Khoảng ngày (Ngày / 7 ngày / Tháng / Tùy chỉnh): counts theo đúng khoảng, phân trang phía server.
        $res = $this->actingAs($this->advisor)->getJson('/api/advisor/appointments?date_from=2026-11-18&date_to=2026-11-19&per_page=2&sort=time&dir=asc')->assertOk();
        $this->assertSame(['NOV18-0900-A', 'NOV18-0900-B'], collect($res->json('data'))->pluck('appointment_code')->all());
        $this->assertSame(4, $res->json('pagination.total'));
        $this->assertSame(2, $res->json('pagination.last_page'));
        $this->assertSame(4, $res->json('counts.ALL'));
        $this->assertSame(3, $res->json('counts.PENDING'));
        $this->actingAs($this->advisor)->getJson('/api/advisor/appointments?date_from=18-11-2026')->assertUnprocessable();
    }

    private function codes(string $query): array
    {
        return collect($this->actingAs($this->advisor)->getJson("/api/advisor/appointments?{$query}")->assertOk()->json('data'))
            ->pluck('appointment_code')->sort()->values()->all();
    }

    public function test_search_by_vehicle_name_and_filter_by_packages_or_services(): void
    {
        $this->advisor = Account::factory()->advisor()->create();
        $customer = Customer::factory()->create(['full_name' => 'Nguyễn Tèo']);
        $lexus = VehicleModel::factory()->create(['name' => 'LX', 'brand_id' => VehicleBrand::factory()->create(['name' => 'Lexus'])->id]);
        $bentley = VehicleModel::factory()->create(['name' => 'Bentayga', 'brand_id' => VehicleBrand::factory()->create(['name' => 'Bentley'])->id]);
        $a = $this->appointment('APT-A', Vehicle::factory()->create(['customer_id' => $customer->id, 'model_id' => $lexus->id]));
        $b = $this->appointment('APT-B', Vehicle::factory()->create(['customer_id' => $customer->id, 'model_id' => $bentley->id]));
        $c = $this->appointment('APT-C', Vehicle::factory()->create(['customer_id' => $customer->id, 'model_id' => $bentley->id]));

        $oil = Service::factory()->create(['name' => 'Thay dầu']);
        $brake = Service::factory()->create(['name' => 'Kiểm tra phanh']);
        $package = MaintenancePackage::factory()->create(['name' => 'Bảo dưỡng 10.000km']);
        $package->services()->attach($brake->id);
        $a->services()->attach($oil->id, ['estimated_price' => 1]);
        $b->packages()->attach($package->id, ['estimated_price' => 1]);

        $this->assertSame(['APT-A'], $this->codes('search=Lexus%20LX'));
        $this->assertSame(['APT-B', 'APT-C'], $this->codes('search=bentayga'));
        $this->assertSame(['APT-A', 'APT-B', 'APT-C'], $this->codes('search=T%C3%A8o'));

        $this->assertSame(['APT-B'], $this->codes("package_ids={$package->id}"));
        // Dịch vụ nằm trong gói khách chọn cũng khớp.
        $this->assertSame(['APT-B'], $this->codes("service_ids={$brake->id}"));
        $this->assertSame(['APT-A', 'APT-B'], $this->codes("service_ids={$oil->id}&package_ids={$package->id}"));
        $this->assertSame(['APT-A', 'APT-B', 'APT-C'], $this->codes('service_ids=abc'));
        $this->assertSame([], $this->codes("service_ids={$oil->id}&search=Bentley"));
        unset($c);

        $options = $this->actingAs($this->advisor)->getJson('/api/advisor/appointments/filter-options')->assertOk()->json('data');
        $this->assertContains('Bảo dưỡng 10.000km', array_column($options['packages'], 'name'));
        $this->assertContains('Thay dầu', array_column($options['services'], 'name'));
    }
}
