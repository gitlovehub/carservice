<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Services\AccountEmailService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

/**
 * Trang mở từ nút xác thực trong email. GET chỉ hiện trang rồi tự gửi POST bằng JS, nên trình quét link của hộp thư
 * không kích hoạt hộ. Thành công thì chuyển sang trang đăng nhập với email điền sẵn, không tạo phiên đăng nhập.
 */
class AccountEmailLinkController extends Controller
{
    public function __construct(private readonly AccountEmailService $emails) {}

    public function verify(Request $request, int $account): View|RedirectResponse
    {
        $record = Account::query()->find($account);
        if (! $record || ! $request->hasValidSignature(false) || ! $this->emails->matchesVerification($record, (string) $request->query('rev'))) {
            return $this->page('expired');
        }
        if ($record->status !== Account::STATUS_PENDING) {
            return $this->toLogin((string) $record->email, 'verified');
        }
        if (! $request->isMethod('post')) {
            return $this->page('ready', $request->fullUrl(), 'Đang xác thực tài khoản…');
        }
        $this->emails->activate($record);

        return $this->toLogin((string) $record->email, 'verified');
    }

    public function change(Request $request, int $account): View|RedirectResponse
    {
        $record = Account::query()->find($account);
        $email = (string) $request->query('email');
        if (! $record || ! $request->hasValidSignature(false) || ! $this->emails->matchesChange($record, $email, (string) $request->query('rev'))) {
            return $this->page('expired');
        }
        if (! $request->isMethod('post')) {
            return $this->page('ready', $request->fullUrl(), 'Đang xác thực email mới…');
        }

        try {
            $this->emails->applyChange($record, $email);
        } catch (ValidationException) {
            return $this->page('taken');
        }

        return $this->toLogin($email, 'email_changed');
    }

    private function toLogin(string $email, string $flag): RedirectResponse
    {
        return redirect()->away(rtrim((string) config('services.frontend.url'), '/').'/login?'.http_build_query(['email' => $email, $flag => 1]));
    }

    private function page(string $state, ?string $action = null, ?string $title = null): View
    {
        return view('accounts.email-link', ['state' => $state, 'action' => $action, 'readyTitle' => $title]);
    }
}
