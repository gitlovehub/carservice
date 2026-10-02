<?php

namespace Database\Seeders;

use App\Models\Account;
use Illuminate\Database\Seeder;

class AccountSeeder extends Seeder
{
    public function run(): void
    {
        Account::updateOrCreate(
            ['email' => 'admin@carservice.test'],
            [
                'password_hash' => '12345678',
                'role' => Account::ROLE_ADMIN,
                'status' => Account::STATUS_ACTIVE,
            ]
        );

        Account::updateOrCreate(
            ['email' => 'advisor@carservice.test'],
            [
                'password_hash' => '12345678',
                'role' => Account::ROLE_ADVISOR,
                'status' => Account::STATUS_ACTIVE,
            ]
        );
    }
}