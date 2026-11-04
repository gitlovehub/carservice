<?php

namespace App\Policies;

use App\Models\Account;
use App\Models\Payment;

class PaymentPolicy
{
    public function update(Account $account, Payment $payment): bool
    {
        return $account->hasRole(Account::ROLE_ADVISOR)
            || $account->hasRole(Account::ROLE_ADMIN);
    }
}
