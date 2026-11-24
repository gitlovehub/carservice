<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Vehicle;
use App\Models\VehicleModel;
use Database\Factories\Support\VietnameseData;
use Illuminate\Database\Eloquent\Factories\Factory;

class VehicleFactory extends Factory
{
    protected $model = Vehicle::class;

    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            // Ưu tiên dòng xe có thật trong danh mục; DB trống (test) thì mới tạo dòng xe mẫu.
            'model_id' => fn () => VehicleModel::query()->where('status', 'ACTIVE')->inRandomOrder()->value('id') ?? VehicleModel::factory(),
            'variant' => fake()->randomElement(['1.5 AT', '2.0 Turbo', '2.5G CVT', 'Premium', 'Standard']),
            'year' => fake()->numberBetween(2016, 2025),
            'license_plate' => VietnameseData::plate(),
            'vin' => strtoupper(fake()->unique()->bothify('??#????#?##??????')),
            'mileage' => fake()->numberBetween(5000, 120000),
            'note' => null,
        ];
    }
}
