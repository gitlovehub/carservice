<?php

namespace Database\Factories;

use App\Models\Customer;
use Database\Factories\Support\VietnameseData;
use Illuminate\Database\Eloquent\Factories\Factory;

class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    public function definition(): array
    {
        $name = VietnameseData::fullName();

        return [
            'account_id' => null,
            'full_name' => $name,
            'phone' => VietnameseData::phone(),
            'email' => VietnameseData::email($name),
            'address' => VietnameseData::address(),
        ];
    }

    public function walkIn(): static
    {
        return $this->state(fn () => [
            'account_id' => null,
            'email' => null,
        ]);
    }
}
