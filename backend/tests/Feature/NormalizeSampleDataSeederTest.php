<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleTrim;
use Database\Seeders\NormalizeSampleDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NormalizeSampleDataSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_rewrites_only_factory_sample_rows_and_keeps_references(): void
    {
        $batch = now()->subMonth()->startOfMinute();
        $ford = VehicleBrand::factory()->create(['name' => 'Ford']);
        $ranger = VehicleModel::factory()->create(['brand_id' => $ford->id, 'name' => 'Ranger', 'source' => null]);
        $wildtrak = VehicleTrim::factory()->create(['model_id' => $ranger->id, 'name' => 'Wildtrak']);
        $garbage = VehicleModel::factory()->create(['brand_id' => $ford->id, 'name' => 'odit', 'source' => null]);

        // Dữ liệu mẫu kiểu cũ.
        $customerAccount = Account::factory()->customer()->create(['email' => 'myrtle82@example.com']);
        $sample = Customer::factory()->create(['account_id' => $customerAccount->id, 'full_name' => 'Lauren Stroman', 'email' => 'myrtle82@example.com', 'created_at' => $batch]);
        $walkIn = Customer::factory()->create(['full_name' => 'Mr. Tod Monahan', 'email' => null, 'created_at' => $batch]);
        $staff = Employee::factory()->create(['full_name' => 'Prof. Garnet Hansen PhD']);
        $staff->account->update(['email' => 'margarette.will@example.com']);
        $vehicle = Vehicle::factory()->create(['customer_id' => $sample->id, 'model_id' => $garbage->id, 'license_plate' => '41?-833.69']);
        $order = RepairOrder::query()->create(['repair_order_code' => 'RO-T-1', 'customer_id' => $sample->id, 'vehicle_id' => $vehicle->id, 'advisor_id' => $staff->id, 'status' => RepairOrder::RECEIVED]);

        // Dữ liệu thật phải giữ nguyên.
        $realAccount = Account::factory()->customer()->create(['email' => 'aphung179@gmail.com']);
        $real = Customer::factory()->create(['account_id' => $realAccount->id, 'full_name' => 'phung duc anh', 'email' => 'aphung179@gmail.com']);
        $realWalkIn = Customer::factory()->create(['full_name' => 'Khách lẻ', 'email' => null]);
        $realVehicle = Vehicle::factory()->create(['customer_id' => $real->id, 'model_id' => $ranger->id, 'license_plate' => '30A-120620']);

        $this->seed(NormalizeSampleDataSeeder::class);

        $sample->refresh();
        $this->assertNotSame('Lauren Stroman', $sample->full_name);
        $this->assertMatchesRegularExpression('/^\p{Lu}\p{L}+ \p{Lu}\p{L}+ \p{Lu}\p{L}+$/u', $sample->full_name);
        $this->assertStringEndsWith('@gmail.com', $sample->email);
        $this->assertSame($sample->email, $customerAccount->fresh()->email);
        $this->assertNotSame('Mr. Tod Monahan', $walkIn->fresh()->full_name);
        $this->assertNull($walkIn->fresh()->email);
        $this->assertStringEndsWith('@carservice.vn', $staff->account->fresh()->email);
        $this->assertNotSame('Prof. Garnet Hansen PhD', $staff->fresh()->full_name);

        $vehicle->refresh();
        $this->assertSame($ranger->id, $vehicle->model_id, 'Chuyển sang dòng xe thật cùng hãng');
        $this->assertSame($wildtrak->id, $vehicle->trim_id);
        $this->assertMatchesRegularExpression('/^\d{2}[A-Z]-\d{3}\.\d{2}$/', $vehicle->license_plate);
        $this->assertModelMissing($garbage);
        $this->assertSame($vehicle->id, $order->fresh()->vehicle_id);
        $this->assertSame($sample->id, $order->fresh()->customer_id);

        $this->assertSame('phung duc anh', $real->fresh()->full_name);
        $this->assertSame('aphung179@gmail.com', $realAccount->fresh()->email);
        $this->assertSame('Khách lẻ', $realWalkIn->fresh()->full_name);
        $this->assertSame('30A-120620', $realVehicle->fresh()->license_plate, 'Biển số khác định dạng nhưng không lỗi ký tự thì giữ');

        // Chạy lại không đổi gì.
        $snapshot = [$sample->fresh()->full_name, $vehicle->fresh()->license_plate];
        $this->seed(NormalizeSampleDataSeeder::class);
        $this->assertSame($snapshot, [$sample->fresh()->full_name, $vehicle->fresh()->license_plate]);
    }
}
