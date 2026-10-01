<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        Customer::updateOrCreate(
            ['phone' => '0912345678'],
            [
                'full_name' => 'Nguyễn Văn An',
                'email' => 'an@example.com',
                'address' => 'Hà Nội',
            ]
        );

        Customer::updateOrCreate(
            ['phone' => '0987654321'],
            [
                'full_name' => 'Trần Minh Tuấn',
                'email' => 'tuan@example.com',
                'address' => 'Hà Nội',
            ]
        );

        Customer::updateOrCreate(
            ['phone' => '0901234567'],
            [
                'full_name' => 'Lê Hoàng Nam',
                'email' => null,
                'address' => 'Hà Nội',
            ]
        );
    }
}