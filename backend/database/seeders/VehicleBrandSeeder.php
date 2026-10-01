<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class VehicleBrandSeeder extends Seeder
{
    public function run(): void
    {
        $brands = [
            'Toyota',
            'Honda',
            'BMW',
            'Mercedes-Benz',
            'Hyundai',
            'Kia',
            'Mazda',
            'Ford',
        ];

        foreach ($brands as $brand) {
            DB::table('vehicle_brands')->updateOrInsert(
                ['name' => $brand],
                [
                    'status' => 'ACTIVE',
                    'created_at' => now(),
                ]
            );
        }
    }
}