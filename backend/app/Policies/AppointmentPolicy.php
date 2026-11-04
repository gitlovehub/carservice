<?php

namespace App\Policies;

use App\Models\Account;
use App\Models\Appointment;

class AppointmentPolicy
{
    public function view(Account $account, Appointment $appointment): bool
    {
        return $this->canManageAll($account)
            || (int) $appointment->customer_id === (int) $account->customer?->id;
    }

    public function update(Account $account, Appointment $appointment): bool
    {
        return $this->view($account, $appointment);
    }

    public function delete(Account $account, Appointment $appointment): bool
    {
        return $this->view($account, $appointment);
    }

    private function canManageAll(Account $account): bool
    {
        return $account->hasRole(Account::ROLE_ADVISOR)
            || $account->hasRole(Account::ROLE_ADMIN);
    }
}
