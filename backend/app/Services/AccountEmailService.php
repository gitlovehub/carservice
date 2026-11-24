<?php

namespace App\Services;

use App\Mail\AccountEmailChangedMail;
use App\Mail\AccountEmailChangeMail;
use App\Mail\AccountVerificationMail;
use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Customer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Email đăng nhập là email duy nhất của tài khoản. Kích hoạt và đổi email đều đi qua nút xác thực gửi tới chính email đó.
 * Link có chữ ký, hết hạn sau 24 giờ và mất hiệu lực khi email hoặc mật khẩu đổi. Link không bao giờ tạo phiên đăng nhập.
 */
class AccountEmailService
{
    public const TTL_HOURS = 24;

    public function sendVerification(Account $account): bool
    {
        $account->loadMissing('customer');

        try {
            Mail::to($account->email)->send(new AccountVerificationMail($this->displayName($account), $this->verificationUrl($account), self::TTL_HOURS));

            return true;
        } catch (Throwable $e) {
            Log::error('Không gửi được email xác thực tài khoản', ['account_id' => $account->id, 'error' => $e->getMessage()]);

            return false;
        }
    }

    public function verificationUrl(Account $account): string
    {
        return $this->signedUrl('accounts.email-verify', ['account' => $account->id, 'rev' => $this->revision($account, 'verify')]);
    }

    public function matchesVerification(Account $account, string $revision): bool
    {
        return hash_equals($this->revision($account, 'verify'), $revision);
    }

    /** Kích hoạt tài khoản đang chờ; chỉ liên kết hồ sơ khách vãng lai sau khi email đã được chứng minh. */
    public function activate(Account $account): void
    {
        DB::transaction(function () use ($account): void {
            $locked = Account::query()->lockForUpdate()->findOrFail($account->id);
            if ($locked->status !== Account::STATUS_PENDING) {
                return;
            }
            $locked->update(['email_verified_at' => now(), 'status' => Account::STATUS_ACTIVE]);
            $this->linkWalkInCustomer($locked);
        });
    }

    /**
     * Gửi nút xác thực tới email mới. Nhân viên gửi hộ thì email hiện tại được báo ngay để chủ tài khoản kịp phản hồi.
     *
     * @throws ValidationException
     */
    public function requestChange(Account $account, string $email, Account $actor): string
    {
        $email = mb_strtolower(trim($email));
        if ($email === mb_strtolower((string) $account->email)) {
            throw ValidationException::withMessages(['email' => 'Email mới phải khác email hiện tại.']);
        }
        $this->assertAvailable($account, $email);
        $account->loadMissing('customer');
        $name = $this->displayName($account);
        $url = $this->signedUrl('accounts.email-change', ['account' => $account->id, 'email' => $email, 'rev' => $this->changeRevision($account, $email)]);

        try {
            Mail::to($email)->send(new AccountEmailChangeMail($name, $url, self::TTL_HOURS));
        } catch (Throwable $e) {
            Log::error('Không gửi được email xác thực đổi email', ['account_id' => $account->id, 'error' => $e->getMessage()]);

            throw ValidationException::withMessages(['email' => 'Không gửi được email tới địa chỉ này. Vui lòng kiểm tra lại.']);
        }

        AuditLog::query()->create([
            'account_id' => $actor->id,
            'action' => 'account.email_change_requested',
            'auditable_type' => Account::class,
            'auditable_id' => $account->id,
            'old_values' => ['email' => $account->email],
            'new_values' => ['email' => $email],
        ]);
        if (! $actor->is($account)) {
            $this->notify((string) $account->email, new AccountEmailChangedMail($name, $email, AccountEmailChangedMail::REQUESTED));
        }

        return $email;
    }

    public function matchesChange(Account $account, string $email, string $revision): bool
    {
        return hash_equals($this->changeRevision($account, $email), $revision);
    }

    /**
     * Khách bấm nút trong email mới: đổi email đăng nhập + hồ sơ, đăng xuất mọi phiên, báo về email cũ.
     *
     * @throws ValidationException
     */
    public function applyChange(Account $account, string $email): void
    {
        $email = mb_strtolower(trim($email));
        $previous = (string) $account->email;

        DB::transaction(function () use ($account, $email, $previous): void {
            Account::query()->lockForUpdate()->findOrFail($account->id);
            $this->assertAvailable($account, $email);
            $account->forceFill(['email' => $email, 'email_verified_at' => now()])->save();
            Customer::query()->where('account_id', $account->id)->first()?->forceFill(['email' => $email, 'email_verified_at' => now()])->save();
            $account->tokens()->delete();
            $this->auditChanged($account, $previous, $email, $account->id);
        });

        $this->notify($previous, new AccountEmailChangedMail($this->displayName($account->fresh('customer')), $email, AccountEmailChangedMail::OLD_ADDRESS));
    }

    /** Admin đã đổi email đăng nhập của nhân viên: đăng xuất mọi phiên và báo cả email cũ lẫn mới. */
    public function staffEmailChanged(Account $account, string $previous, Account $actor): void
    {
        $account->tokens()->delete();
        $this->auditChanged($account, $previous, (string) $account->email, $actor->id);
        $name = $this->displayName($account->loadMissing('employee'));
        $this->notify($previous, new AccountEmailChangedMail($name, (string) $account->email, AccountEmailChangedMail::OLD_ADDRESS));
        $this->notify((string) $account->email, new AccountEmailChangedMail($name, (string) $account->email, AccountEmailChangedMail::NEW_ADDRESS));
    }

    /** @throws ValidationException */
    private function assertAvailable(Account $account, string $email): void
    {
        $taken = Account::query()->whereKeyNot($account->id)->whereRaw('LOWER(email) = ?', [$email])->exists()
            || Customer::withTrashed()->where(fn ($q) => $q->whereNull('account_id')->orWhere('account_id', '!=', $account->id))->whereRaw('LOWER(email) = ?', [$email])->exists();
        if ($taken) {
            throw ValidationException::withMessages(['email' => 'Email này đã được dùng cho hồ sơ khác.']);
        }
    }

    private function linkWalkInCustomer(Account $account): void
    {
        $email = strtolower(trim((string) $account->email));
        $walkIn = Customer::query()->whereNull('account_id')->whereRaw('LOWER(email) = ?', [$email])->lockForUpdate()->first();
        if (! $walkIn) {
            return;
        }

        $existing = Customer::withTrashed()->where('account_id', $account->id)->first();
        if ($existing) {
            $hasData = $existing->vehicles()->withTrashed()->exists() || $existing->appointments()->exists() || $existing->repairOrders()->exists();
            if ($hasData) {
                return;
            }
            $existing->forceDelete();
        }

        $walkIn->update(['account_id' => $account->id, 'email' => $email]);
    }

    private function auditChanged(Account $account, string $previous, string $email, int $actorId): void
    {
        AuditLog::query()->create([
            'account_id' => $actorId,
            'action' => 'account.email_changed',
            'auditable_type' => Account::class,
            'auditable_id' => $account->id,
            'old_values' => ['email' => $previous],
            'new_values' => ['email' => $email],
        ]);
    }

    private function notify(string $email, AccountEmailChangedMail $mail): void
    {
        try {
            Mail::to($email)->send($mail);
        } catch (Throwable $e) {
            Log::warning('Không gửi được thông báo đổi email', ['error' => $e->getMessage()]);
        }
    }

    /** @param array<string, mixed> $parameters */
    private function signedUrl(string $route, array $parameters): string
    {
        $path = URL::temporarySignedRoute($route, now()->addHours(self::TTL_HOURS), $parameters, false);

        return rtrim((string) config('app.url'), '/').$path;
    }

    private function changeRevision(Account $account, string $email): string
    {
        return $this->revision($account, 'change', mb_strtolower(trim($email)));
    }

    private function revision(Account $account, string $purpose, string $target = ''): string
    {
        $data = implode('|', [$purpose, $account->id, mb_strtolower((string) $account->email), $target, $account->getAuthPassword()]);

        return substr(hash_hmac('sha256', $data, (string) config('app.key')), 0, 24);
    }

    private function displayName(Account $account): string
    {
        return $account->customer?->full_name ?: ($account->employee?->full_name ?: 'Quý khách');
    }
}
