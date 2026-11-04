<?php

namespace App\Policies;

use App\Models\Account;
use App\Models\Quotation;

class QuotationPolicy
{
    public function view(Account $account, Quotation $quotation): bool
    {
        return $this->canManageAll($account)
            || (int) $quotation->repairOrder?->customer_id === (int) $account->customer?->id;
    }

    public function create(Account $account): bool
    {
        return $account->hasRole(Account::ROLE_ADVISOR)
            || $account->hasRole(Account::ROLE_ADMIN);
    }

    public function update(Account $account, Quotation $quotation): bool
    {
        return $this->canManageAll($account)
            && ! in_array($quotation->status, [
                Quotation::APPROVED,
                Quotation::PARTIALLY_APPROVED,
            ], true);
    }

    public function respond(Account $account, Quotation $quotation): bool
    {
        return $account->hasRole(Account::ROLE_CUSTOMER)
            && (int) $quotation->repairOrder?->customer_id === (int) $account->customer?->id;
    }

    private function canManageAll(Account $account): bool
    {
        return $account->hasRole(Account::ROLE_ADVISOR)
            || $account->hasRole(Account::ROLE_ADMIN);
    }
}
