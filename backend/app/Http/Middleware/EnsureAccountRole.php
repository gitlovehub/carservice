<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $account = $request->user();

        abort_unless((bool) $account, 401, 'Chưa đăng nhập.');
        abort_unless($account->isActive(), 403, 'Tài khoản đang bị khóa hoặc ngừng hoạt động.');

        $normalizedRoles = array_map(static fn (string $role): string => strtoupper(trim($role)), $roles);
        $accountRole = strtoupper((string) $account->role);

        abort_unless(in_array($accountRole, $normalizedRoles, true), 403, 'Bạn không có quyền thực hiện thao tác này.');

        return $next($request);
    }
}
