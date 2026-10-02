<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class VehicleModelSeeder extends Seeder
{
    public function run(): void
    {
        $models = [
            ['brand' => 'Toyota', 'name' => 'Camry', 'body_type' => 'Sedan'],
            ['brand' => 'Toyota', 'name' => 'Corolla Cross', 'body_type' => 'SUV'],
            ['brand' => 'Honda', 'name' => 'Civic', 'body_type' => 'Sedan'],
            ['brand' => 'Honda', 'name' => 'CR-V', 'body_type' => 'SUV'],
            ['brand' => 'BMW', 'name' => '3 Series', 'body_type' => 'Sedan'],
            ['brand' => 'Mercedes-Benz', 'name' => 'C-Class', 'body_type' => 'Sedan'],
            ['brand' => 'Hyundai', 'name' => 'Accent', 'body_type' => 'Sedan'],
            ['brand' => 'Kia', 'name' => 'Seltos', 'body_type' => 'SUV'],
            ['brand' => 'Mazda', 'name' => 'Mazda3', 'body_type' => 'Sedan'],
            ['brand' => 'Ford', 'name' => 'Ranger', 'body_type' => 'Pickup'],
        ];

        foreach ($models as $model) {
            $brandId = DB::table('vehicle_brands')
                ->where('name', $model['brand'])
                ->value('id');

            DB::table('vehicle_models')->updateOrInsert(
                [
                    'brand_id' => $brandId,
                    'name' => $model['name'],
                ],
                [
                    'body_type' => $model['body_type'],
                    'year_from' => 2020,
                    'year_to' => null,
                    'status' => 'ACTIVE',
                    'created_at' => now(),
                ]
            );
        }
    }
}