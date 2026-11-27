<?php

namespace App\Policies;

use App\Models\Account;
use App\Models\Vehicle;

class VehiclePolicy
{
    public function view(Account $account, Vehicle $vehicle): bool
    {
        return $this->canManageAll($account)
            || (int) $vehicle->customer_id === (int) $account->customer?->id;
    }

    /** Xe của chính tài khoản này — dùng cho "Xe của tôi" (/me/vehicles), kể cả nhân viên dùng như khách. */
    public function own(Account $account, Vehicle $vehicle): bool
    {
        $customerId = $account->customer?->id;

        return $customerId !== null && (int) $vehicle->customer_id === (int) $customerId;
    }

    public function update(Account $account, Vehicle $vehicle): bool
    {
        return $this->view($account, $vehicle);
    }

    public function delete(Account $account, Vehicle $vehicle): bool
    {
        return $this->view($account, $vehicle);
    }

    private function canManageAll(Account $account): bool
    {
        return $account->hasRole(Account::ROLE_ADVISOR)
            || $account->hasRole(Account::ROLE_ADMIN);
    }
}
