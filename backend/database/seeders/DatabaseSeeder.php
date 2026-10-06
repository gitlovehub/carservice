<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Service;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $defaultPassword = Hash::make('password123');

        // 1. TÀI KHOẢN ADMIN MẪU (Để dev/tester có acc cố định đăng nhập)
        $adminAccount = Account::factory()->admin()->create([
            'email' => 'admin@carservice.vn',
            'password_hash' => $defaultPassword,
        ]);

        Employee::factory()->create([
            'account_id' => $adminAccount->id,
            'full_name' => 'Trần Văn Quản Trị',
            'phone' => '0901000001',
        ]);

        // 2. NHÂN SỰ NỘI BỘ (Advisor & Technician)
        // Tạo 3 Cố vấn dịch vụ (ADVISOR)
        Employee::factory()->count(3)->create();

        // Tạo 5 Kỹ thuật viên (TECHNICIAN) kèm Profile chuyên môn
        TechnicianProfile::factory()->count(5)->create();

        // 3. MASTER DATA: XE (Hãng xe & Dòng xe)
        // Tạo 4 hãng xe, mỗi hãng tạo sẵn 3 dòng xe
        $allModels = collect();
        $brands = VehicleBrand::factory()->count(4)->create();

        foreach ($brands as $brand) {
            $models = VehicleModel::factory()->count(3)->create([
                'brand_id' => $brand->id,
            ]);
            $allModels = $allModels->merge($models);
        }

        // 4. MASTER DATA: DỊCH VỤ GARAGE
        Service::factory()->count(8)->create();

        // 5. KHÁCH HÀNG ONLINE & XE CỦA HỌ
        // Tạo 10 khách có tài khoản, mỗi khách sở hữu từ 1 đến 2 xe
        Customer::factory()->count(10)->create()->each(function ($customer) use ($allModels) {
            Vehicle::factory()->count(rand(1, 2))->create([
                'customer_id' => $customer->id,
                'model_id' => $allModels->random()->id,
            ]);
        });

        // 6. KHÁCH HÀNG WALK-IN (VÃNG LAI KHÔNG CÓ ACCOUNT)
        // Tạo 5 khách vãng lai, mỗi khách có 1 xe
        Customer::factory()->walkIn()->count(5)->create()->each(function ($customer) use ($allModels) {
            Vehicle::factory()->create([
                'customer_id' => $customer->id,
                'model_id' => $allModels->random()->id,
            ]);
        });
    }
}