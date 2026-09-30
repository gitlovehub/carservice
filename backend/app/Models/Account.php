<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['email', 'password_hash', 'role', 'status'])]
#[Hidden(['password_hash'])]
class Account extends Authenticatable
{
    use HasApiTokens, Notifiable;

    public const ROLE_CUSTOMER = 'CUSTOMER';

    public const ROLE_ADVISOR = 'ADVISOR';

    public const ROLE_TECHNICIAN = 'TECHNICIAN';

    public const ROLE_ADMIN = 'ADMIN';

    public const STATUS_ACTIVE = 'ACTIVE';

    public const STATUS_LOCKED = 'LOCKED';

    public const STATUS_INACTIVE = 'INACTIVE';

    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    protected function casts(): array
    {
        return [
            'password_hash' => 'hashed',
        ];
    }

    public function employee(): HasOne
    {
        return $this->hasOne(Employee::class);
    }

    public function customer(): HasOne
    {
        return $this->hasOne(Customer::class);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function hasRole(string $role): bool
    {
        return strtoupper($this->role) === strtoupper(trim($role));
    }
}
