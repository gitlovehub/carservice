<?php

namespace App\Policies;

use App\Models\Account;
use App\Models\WorkItem;

class WorkItemPolicy
{
    public function view(Account $account, WorkItem $workItem): bool
    {
        return $this->canManageAll($account)
            || $this->isAssignedTechnician($account, $workItem)
            || (int) $workItem->repairOrder?->customer_id === (int) $account->customer?->id;
    }

    public function update(Account $account, WorkItem $workItem): bool
    {
        return $this->canManageAll($account)
            || $this->isAssignedTechnician($account, $workItem);
    }

    private function canManageAll(Account $account): bool
    {
        return $account->hasRole(Account::ROLE_ADVISOR)
            || $account->hasRole(Account::ROLE_ADMIN);
    }

    private function isAssignedTechnician(Account $account, WorkItem $workItem): bool
    {
        $employeeId = $account->employee?->id;

        return $account->hasRole(Account::ROLE_TECHNICIAN)
            && $employeeId !== null
            && (
                (int) $workItem->technician?->employee_id === (int) $employeeId
                || $workItem->repairOrder?->assignments()
                    ->whereHas('technician', fn ($query) => $query->where('employee_id', $employeeId))
                    ->exists()
            );
    }
}
