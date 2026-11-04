<?php

namespace App\Policies;

use App\Models\Account;
use App\Models\Invoice;

class InvoicePolicy
{
    public function view(Account $account, Invoice $invoice): bool
    {
        return $this->canManageAll($account)
            || (int) $invoice->repairOrder?->customer_id === (int) $account->customer?->id;
    }

    public function update(Account $account, Invoice $invoice): bool
    {
        return $this->canManageAll($account);
    }

    private function canManageAll(Account $account): bool
    {
        return $account->hasRole(Account::ROLE_ADVISOR)
            || $account->hasRole(Account::ROLE_ADMIN);
    }
}
