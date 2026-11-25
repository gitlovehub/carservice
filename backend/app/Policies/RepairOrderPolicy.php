<?php

namespace App\Policies;

use App\Models\Account;
use App\Models\RepairOrder;

class RepairOrderPolicy
{
    public function view(Account $account, RepairOrder $repairOrder): bool
    {
        return $this->canManageAll($account)
            || $this->isAssignedTechnician($account, $repairOrder)
            || (int) $repairOrder->customer_id === (int) $account->customer?->id;
    }

    /**
     * Phiếu thuộc hồ sơ khách của CHÍNH tài khoản này — dùng cho các API "của tôi" (/me/...).
     * Khác `view`: nhân viên xem được mọi phiếu ở khu làm việc, nhưng khi dùng tài khoản như khách
     * thì chỉ thao tác (xác nhận biên bản, ủy quyền nhận xe, thanh toán) trên phiếu của chính mình.
     */
    public function own(Account $account, RepairOrder $repairOrder): bool
    {
        $customerId = $account->customer?->id;

        return $customerId !== null && (int) $repairOrder->customer_id === (int) $customerId;
    }

    public function update(Account $account, RepairOrder $repairOrder): bool
    {
        return $this->canManageAll($account)
            || $this->isAssignedTechnician($account, $repairOrder);
    }

    public function create(Account $account): bool
    {
        return $account->hasRole(Account::ROLE_ADVISOR)
            || $account->hasRole(Account::ROLE_ADMIN);
    }

    public function inspect(Account $account, RepairOrder $repairOrder): bool
    {
        return $this->canManageAll($account)
            || (
                $account->hasRole(Account::ROLE_TECHNICIAN)
                && $account->employee?->technicianProfile !== null
            );
    }

    private function canManageAll(Account $account): bool
    {
        return $account->hasRole(Account::ROLE_ADVISOR)
            || $account->hasRole(Account::ROLE_ADMIN);
    }

    private function isAssignedTechnician(Account $account, RepairOrder $repairOrder): bool
    {
        $employeeId = $account->employee?->id;

        return $account->hasRole(Account::ROLE_TECHNICIAN)
            && $employeeId !== null
            && $repairOrder->assignments()
                ->whereHas('technician', fn ($query) => $query->where('employee_id', $employeeId))
                ->exists();
    }
}
