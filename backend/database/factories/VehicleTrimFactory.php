<?php

namespace Database\Factories;

use App\Models\VehicleModel;
use App\Models\VehicleTrim;
use Illuminate\Database\Eloquent\Factories\Factory;

class VehicleTrimFactory extends Factory
{
    protected $model = VehicleTrim::class;

    public function definition(): array
    {
        return [
            'model_id' => VehicleModel::factory(),
            'name' => fake()->unique()->bothify('#.#?? ##'),
            'status' => 'ACTIVE',
        ];
    }
}
