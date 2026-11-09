<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Employee;
use Database\Factories\Support\VietnameseData;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory()->advisor(),
            'full_name' => VietnameseData::fullName(),
            'phone' => VietnameseData::phone(),
            'status' => 'ACTIVE',
        ];
    }

    public function technicianRole(): static
    {
        return $this->state(fn () => [
            'account_id' => Account::factory()->technician(),
        ]);
    }

    public function adminRole(): static
    {
        return $this->state(fn () => [
            'account_id' => Account::factory()->admin(),
        ]);
    }
}
