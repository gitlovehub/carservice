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

    /** Hóa đơn của chính tài khoản này (API "của tôi", ví dụ thanh toán VNPay). */
    public function own(Account $account, Invoice $invoice): bool
    {
        $customerId = $account->customer?->id;

        return $customerId !== null && (int) $invoice->repairOrder?->customer_id === (int) $customerId;
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
