<?php

namespace Database\Seeders;

use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Database\Seeder;

class RealDataSeeder extends Seeder
{
    public function run(): void
    {
        // Hãng xe và Dòng xe phổ biến
        $brands = [
            'Toyota' => ['Vios', 'Camry', 'Corolla Altis', 'Raize', 'Corolla Cross', 'Fortuner', 'Innova Cross', 'Hilux'],
            'Honda' => ['City', 'Civic', 'CR-V', 'HR-V'],
            'Mazda' => ['Mazda 3', 'Mazda 6', 'CX-5', 'CX-8'],
            'Hyundai' => ['Accent', 'Elantra', 'Tucson', 'Santa Fe'],
            'Ford' => ['Ranger', 'Everest', 'Territory'],
            'VinFast' => ['Fadil', 'VF e34', 'VF 8', 'VF 9'],
        ];

        foreach ($brands as $brandName => $models) {
            $brand = VehicleBrand::firstOrCreate(['name' => $brandName], ['status' => 'ACTIVE']);
            foreach ($models as $modelName) {
                VehicleModel::firstOrCreate([
                    'brand_id' => $brand->id,
                    'name' => $modelName,
                ], [
                    'year_from' => 2020,
                    'year_to' => null,
                    'status' => 'ACTIVE',
                ]);
            }
        }

        // Dịch vụ và gói bảo dưỡng nằm ở ServiceCatalogSeeder (chạy sau khi có phụ tùng).
    }
}
