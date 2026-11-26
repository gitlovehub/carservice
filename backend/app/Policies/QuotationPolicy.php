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

    /**
     * Chỉ CHỦ phiếu được duyệt báo giá — kể cả Admin/Cố vấn dùng tài khoản như khách cho xe của chính họ.
     * Nhân viên không bao giờ duyệt thay khách khác (không có hồ sơ khách trùng).
     */
    public function respond(Account $account, Quotation $quotation): bool
    {
        $customerId = $account->customer?->id;

        return $customerId !== null && (int) $quotation->repairOrder?->customer_id === (int) $customerId;
    }

    private function canManageAll(Account $account): bool
    {
        return $account->hasRole(Account::ROLE_ADVISOR)
            || $account->hasRole(Account::ROLE_ADMIN);
    }
}
