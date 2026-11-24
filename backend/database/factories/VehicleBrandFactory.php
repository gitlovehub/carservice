<?php

namespace Database\Factories;

use App\Models\VehicleBrand;
use Illuminate\Database\Eloquent\Factories\Factory;

class VehicleBrandFactory extends Factory
{
    protected $model = VehicleBrand::class;

    public function definition(): array
    {
        return [
            // Tên ngẫu nhiên không trùng tên hãng thật mà test tự tạo (Toyota, Honda...).
            'name' => 'Hãng '.fake()->unique()->bothify('??##'),
            'status' => 'ACTIVE',
        ];
    }
}
