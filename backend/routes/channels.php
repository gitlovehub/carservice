<?php

use App\Models\Account;
use Illuminate\Support\Facades\Broadcast;

/*
| Kênh realtime (Reverb). Chỉ báo "dữ liệu đã đổi" — không gửi nội dung; trình duyệt tự tải lại qua API (vẫn kiểm quyền như cũ).
|   staff         : Admin / Cố vấn / Kỹ thuật viên — mọi thay đổi nghiệp vụ.
|   account.{id}  : đúng một tài khoản (khách) — chỉ thay đổi liên quan tới lịch, xe, phiếu, thông báo của chính họ.
*/

Broadcast::channel('staff', fn (Account $account) => in_array($account->role, [Account::ROLE_ADMIN, Account::ROLE_ADVISOR, Account::ROLE_TECHNICIAN], true));

Broadcast::channel('account.{id}', fn (Account $account, int $id) => (int) $account->id === $id);
