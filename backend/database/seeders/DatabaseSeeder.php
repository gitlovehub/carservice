<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Holiday;
use App\Models\MaintenancePackage;
use App\Models\Service;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use App\Models\VehicleModel;
use App\Models\WorkingHour;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RealDataSeeder::class);

        $defaultPassword = Hash::make('password123');

        // 1. TÀI KHOẢN ADMIN MẪU
        $adminAccount = Account::factory()->admin()->create([
            'email' => 'admin@carservice.vn',
            'password_hash' => $defaultPassword,
        ]);

        Employee::factory()->create([
            'account_id' => $adminAccount->id,
            'full_name' => 'Trần Văn Quản Trị',
            'phone' => '0901000001',
        ]);

        // 2. NHÂN SỰ NỘI BỘ (Advisor & Technician) - tài khoản cố định
        $advisorAccount = Account::factory()->advisor()->create([
            'email' => 'advisor1@carservice.vn',
            'password_hash' => $defaultPassword,
        ]);

        Employee::factory()->create([
            'account_id' => $advisorAccount->id,
        ]);

        $technicianAccount = Account::factory()->technician()->create([
            'email' => 'tech1@carservice.vn',
            'password_hash' => $defaultPassword,
        ]);

        $technicianEmployee = Employee::factory()->technicianRole()->create([
            'account_id' => $technicianAccount->id,
        ]);

        TechnicianProfile::factory()->create([
            'employee_id' => $technicianEmployee->id,
        ]);

        // 3. DÙNG LẠI HÃNG XE VÀ DÒNG XE TỪ RealDataSeeder
        $allModels = VehicleModel::all();

        // 4. MASTER DATA: DỊCH VỤ GARAGE
        $allServices = Service::factory()->count(8)->create();

        // 5. KHÁCH HÀNG ONLINE & XE CỦA HỌ
        // Tài khoản khách hàng cố định để đăng nhập thử.
        $customerAccount = Account::factory()->customer()->create([
            'email' => 'customer@carservice.vn',
            'password_hash' => $defaultPassword,
        ]);

        $demoCustomer = Customer::factory()->create([
            'account_id' => $customerAccount->id,
            'full_name' => 'Khách hàng mẫu',
            'phone' => '0900000001',
            'email' => 'customer@carservice.vn',
        ]);

        Vehicle::factory()->count(2)->create([
            'customer_id' => $demoCustomer->id,
            'model_id' => $allModels->random()->id,
        ]);

        Customer::factory()->count(9)->create()->each(function ($customer) use ($allModels) {
            Vehicle::factory()->count(rand(1, 2))->create([
                'customer_id' => $customer->id,
                'model_id' => $allModels->random()->id,
            ]);
        });

        // 6. KHÁCH HÀNG WALK-IN (VÃNG LAI KHÔNG CÓ ACCOUNT)
        Customer::factory()->walkIn()->count(5)->create()->each(function ($customer) use ($allModels) {
            Vehicle::factory()->create([
                'customer_id' => $customer->id,
                'model_id' => $allModels->random()->id,
            ]);
        });

        // 7. GÓI BẢO DƯỠNG ĐỊNH KỲ & DỊCH VỤ ĐI KÈM
        $packages = MaintenancePackage::factory()->count(4)->create();
        foreach ($packages as $package) {
            // Gắn ngẫu nhiên từ 2 đến 4 dịch vụ vào từng gói
            $attachServices = $allServices->random(rand(2, 4));
            foreach ($attachServices as $service) {
                DB::table('maintenance_package_services')->insertOrIgnore([
                    'package_id' => $package->id,
                    'service_id' => $service->id,
                    'quantity' => 1,
                ]);
            }
        }

        // 8. CẤU HÌNH LỊCH LÀM VIỆC CỦA GARAGE Thứ 2 -> Thứ 7 (2,3,4,5,6,7), Chủ nhật (8)
        foreach (range(2, 8) as $day) {
            WorkingHour::firstOrCreate(
                ['day_of_week' => $day],
                [
                    'open_time' => '08:00:00',
                    'close_time' => $day === 8 ? '12:00:00' : '17:30:00', // Chủ nhật (8) làm nửa ngày
                    'max_slots' => $day === 8 ? 3 : 5,
                    'is_active' => true,
                ]
            );
        }

        // 9. CẤU HÌNH NGÀY NGHỈ LỄ CỦA GARAGE
        Holiday::firstOrCreate(
            ['holiday_date' => '2026-01-01'],
            ['reason' => 'Tết Dương Lịch 2026']
        );
        Holiday::firstOrCreate(
            ['holiday_date' => '2026-04-30'],
            ['reason' => 'Ngày Giải phóng miền Nam']
        );
        Holiday::firstOrCreate(
            ['holiday_date' => '2026-05-01'],
            ['reason' => 'Ngày Quốc tế Lao động']
        );
        Holiday::firstOrCreate(
            ['holiday_date' => '2026-09-02'],
            ['reason' => 'Lễ Quốc khánh 2/9']
        );
    }
}
