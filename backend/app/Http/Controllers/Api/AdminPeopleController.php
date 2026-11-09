<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AppliesSort;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Payment;
use App\Models\RepairOrder;
use App\Models\Review;
use App\Models\TechnicianProfile;
use App\Services\PasswordResetService;
use App\Support\VehicleName;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Admin quản lý con người: khách hàng (xem, khoá), nhân sự (thêm/sửa/nghỉ việc), tài khoản
 * (tạo tài khoản nhân viên, khoá/mở, gửi email đặt lại mật khẩu). Thêm/sửa khách và xe dùng /api/customers, /api/vehicles.
 */
class AdminPeopleController extends Controller
{
    use AppliesSort;

    /** Khách chi tiêu từ mức này được đánh dấu khách thân thiết. */
    public const VIP_SPENT = 20_000_000;

    private const STAFF_ROLES = [Account::ROLE_ADVISOR, Account::ROLE_TECHNICIAN];

    private const LEVELS = ['JUNIOR', 'SENIOR', 'EXPERT'];

    public function __construct(private readonly PasswordResetService $passwordReset) {}

    /* ----------------------------------------------------------- Khách hàng */

    /** GET /api/admin/customers?search=&cars=all|has|none&sort=recent|spent|name&page= */
    public function customers(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'cars' => ['nullable', Rule::in(['all', 'has', 'none'])],
            'sort' => ['nullable', Rule::in(['created', 'name', 'cars', 'last', 'spent', 'recent'])],
            'dir' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $query = $this->customerQuery()
            ->when(($filters['cars'] ?? 'all') === 'has', fn (Builder $q) => $q->has('vehicles'))
            ->when(($filters['cars'] ?? 'all') === 'none', fn (Builder $q) => $q->doesntHave('vehicles'))
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q
                ->where('full_name', 'like', $like)->orWhere('phone', 'like', $like)->orWhere('email', 'like', $like)
                ->orWhereHas('vehicles', fn (Builder $v) => $v->where('license_plate', 'like', $like))));

        // Mặc định: khách mới tạo lên đầu. "recent" (tham số cũ) = lần sửa gần nhất.
        if (($filters['sort'] ?? null) === 'recent') {
            $request->merge(['sort' => 'last', 'dir' => 'desc']);
        }
        $this->applySort($query, $request, [
            'created' => 'customers.created_at',
            'name' => 'full_name',
            'cars' => 'vehicles_count',
            // Khách chưa từng sửa luôn nằm cuối, dù sắp tăng hay giảm.
            'last' => fn (Builder $q, string $dir) => $q->orderByRaw('last_visit IS NULL')->orderBy('last_visit', $dir),
            'spent' => 'total_spent',
        ], tieBreaker: 'customers.id');

        $page = $query->paginate($filters['per_page'] ?? 10);

        return response()->json([
            'data' => $page->getCollection()->map(fn (Customer $c) => $this->customerRow($c))->values(),
            'meta' => $this->meta($page),
            'summary' => [
                'total' => Customer::query()->count(),
                'with_account' => Customer::query()->whereNotNull('account_id')->count(),
                'new_this_month' => Customer::query()->where('created_at', '>=', now()->startOfMonth())->count(),
            ],
        ]);
    }

    /** GET /api/admin/customers/{customer} */
    public function customer(int $customer): JsonResponse
    {
        $model = $this->customerQuery()->with(['vehicles' => fn ($q) => $q->with(['model.brand:id,name', 'trim:id,name'])->latest()])->findOrFail($customer);

        $history = RepairOrder::query()->where('customer_id', $model->id)
            ->with(['vehicle:id,model_id,license_plate', 'vehicle.model:id,brand_id,name', 'vehicle.model.brand:id,name', 'invoice:id,repair_order_id,total_amount', 'workItems:id,repair_order_id,description'])
            ->latest('received_at')->limit(10)->get()
            ->map(fn (RepairOrder $o) => [
                'id' => $o->id,
                'code' => $o->repair_order_code,
                'date' => $o->received_at?->toIso8601String(),
                'title' => $o->workItems->pluck('description')->filter()->take(2)->implode(', ') ?: ($o->note ?: 'Kiểm tra, sửa chữa'),
                'vehicle' => trim($this->vehicleName($o->vehicle).' – '.($o->vehicle?->license_plate ?? ''), ' –'),
                'amount' => (float) ($o->invoice?->total_amount ?? 0),
                'status' => $o->status,
            ]);

        $review = Review::query()->where('customer_id', $model->id)->latest()->first();

        return response()->json(['data' => $this->customerRow($model) + [
            'address' => $model->address,
            'created_at' => $model->created_at?->toIso8601String(),
            'vehicles' => $model->vehicles->map(fn ($v) => [
                'id' => $v->id, 'brand' => $v->model?->brand?->name, 'model' => $v->model?->name, 'trim' => $v->trim?->name ?? $v->variant,
                'plate' => $v->license_plate, 'year' => $v->year, 'mileage' => $v->mileage,
            ])->values(),
            'history' => $history,
            'last_review' => $review ? ['rating' => (int) $review->overall_rating, 'date' => $review->created_at?->toIso8601String(), 'comment' => (string) $review->comment] : null,
        ]]);
    }

    /** PATCH /api/admin/customers/{customer}/lock {locked: bool} — khoá tài khoản đăng nhập của khách. */
    public function lockCustomer(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate(['locked' => ['required', 'boolean']]);
        $account = $customer->account;
        if (! $account) {
            throw ValidationException::withMessages(['locked' => 'Khách vãng lai không có tài khoản đăng nhập để khoá.']);
        }

        $this->setAccountStatus($account, $data['locked'] ? Account::STATUS_LOCKED : Account::STATUS_ACTIVE);

        return response()->json([
            'message' => $data['locked'] ? 'Đã khoá tài khoản khách hàng.' : 'Đã mở khoá tài khoản khách hàng.',
            'data' => $this->customerRow($this->customerQuery()->findOrFail($customer->id)),
        ]);
    }

    private function customerQuery(): Builder
    {
        $spent = Payment::query()->selectRaw('COALESCE(SUM(payments.amount), 0)')
            ->join('invoices', 'invoices.id', '=', 'payments.invoice_id')
            ->join('repair_orders', 'repair_orders.id', '=', 'invoices.repair_order_id')
            ->whereColumn('repair_orders.customer_id', 'customers.id')
            ->where('payments.status', Payment::SUCCESS);

        $lastVisit = RepairOrder::query()->selectRaw('MAX(received_at)')->whereColumn('repair_orders.customer_id', 'customers.id');

        return Customer::query()
            ->select('customers.*')
            ->selectSub($spent, 'total_spent')
            ->selectSub($lastVisit, 'last_visit')
            ->withCount(['vehicles', 'repairOrders'])
            ->with('account:id,status');
    }

    /** @return array<string, mixed> */
    private function customerRow(Customer $c): array
    {
        $spent = round((float) $c->total_spent, 2);
        $address = (string) $c->address;

        return [
            'id' => $c->id,
            'name' => $c->full_name,
            'phone' => $c->phone,
            'email' => $c->email,
            'city' => $address === '' ? null : trim((string) Str::of($address)->afterLast(',')),
            'vehicles_count' => (int) $c->vehicles_count,
            'visits' => (int) $c->repair_orders_count,
            'last_visit' => $c->last_visit ? Carbon::parse($c->last_visit)->toIso8601String() : null,
            'total_spent' => $spent,
            'vip' => $spent >= self::VIP_SPENT,
            'has_account' => $c->account_id !== null,
            'locked' => $c->account?->status === Account::STATUS_LOCKED,
        ];
    }

    /* ------------------------------------------------------------- Nhân sự */

    /** GET /api/admin/staff?search=&role=&status= */
    public function staff(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', Rule::in(self::STAFF_ROLES)],
            'status' => ['nullable', Rule::in(['ACTIVE', 'INACTIVE'])],
        ]);

        $rows = Employee::query()
            ->with(['account:id,email,role,status', 'technicianProfile'])
            ->whereHas('account', fn (Builder $a) => $a->whereIn('role', $filters['role'] ?? null ? [$filters['role']] : self::STAFF_ROLES))
            ->when($filters['status'] ?? null, fn (Builder $q, string $s) => $q->where('status', $s))
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q
                ->where('full_name', 'like', $like)->orWhere('phone', 'like', $like)
                ->orWhereHas('account', fn (Builder $a) => $a->where('email', 'like', $like))))
            ->tap(fn (Builder $q) => $this->applySort($q, $request, [
                'created' => 'created_at', 'name' => 'full_name', 'phone' => 'phone', 'status' => 'status',
                'joined' => 'created_at',
                'role' => fn (Builder $q, string $dir) => $q->orderBy(Account::query()->select('role')->whereColumn('accounts.id', 'employees.account_id'), $dir),
            ], tieBreaker: 'employees.id'))
            ->get();

        $all = Employee::query()->whereHas('account', fn (Builder $a) => $a->whereIn('role', self::STAFF_ROLES))->with('account:id,role')->get(['id', 'account_id', 'status']);

        return response()->json([
            'data' => $rows->map(fn (Employee $e) => $this->staffRow($e))->values(),
            'summary' => [
                'total' => $all->count(),
                'active' => $all->where('status', 'ACTIVE')->count(),
                'advisors' => $all->filter(fn ($e) => $e->account?->role === Account::ROLE_ADVISOR)->count(),
                'technicians' => $all->filter(fn ($e) => $e->account?->role === Account::ROLE_TECHNICIAN)->count(),
            ],
        ]);
    }

    /** POST /api/admin/staff */
    public function storeStaff(Request $request): JsonResponse
    {
        $data = $this->validateStaff($request);
        $employee = $this->createStaffAccount($data, $data['role']);

        return response()->json(['message' => 'Đã thêm nhân viên.', 'data' => $this->staffRow($employee)], 201);
    }

    /** PATCH /api/admin/staff/{employee} */
    public function updateStaff(Request $request, Employee $employee): JsonResponse
    {
        $employee->loadMissing('account', 'technicianProfile');
        abort_unless(in_array($employee->account?->role, self::STAFF_ROLES, true), 404);
        $data = $this->validateStaff($request, $employee);

        DB::transaction(function () use ($employee, $data): void {
            $employee->update(['full_name' => $data['name'], 'phone' => $data['phone'], 'status' => $data['status'] ?? $employee->status]);
            $employee->account->update(['email' => Str::lower($data['email']), 'role' => $data['role']]);
            if (isset($data['status'])) {
                $this->setAccountStatus($employee->account, $data['status'] === 'ACTIVE' ? Account::STATUS_ACTIVE : Account::STATUS_INACTIVE);
            }
            if ($data['role'] === Account::ROLE_TECHNICIAN) {
                TechnicianProfile::query()->updateOrCreate(['employee_id' => $employee->id], [
                    'specialty' => $data['specialty'] ?? null, 'level' => $data['level'] ?? 'JUNIOR',
                    'is_available' => ($data['status'] ?? $employee->status) === 'ACTIVE',
                ]);
            }
        });

        return response()->json(['message' => 'Đã cập nhật nhân viên.', 'data' => $this->staffRow($employee->fresh(['account', 'technicianProfile']))]);
    }

    /** @return array<string, mixed> */
    private function validateStaff(Request $request, ?Employee $employee = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150', Rule::unique('accounts', 'email')->ignore($employee?->account_id)],
            'phone' => ['required', 'string', 'max:20', 'regex:/^0\d{9,10}$/'],
            'role' => ['required', Rule::in(self::STAFF_ROLES)],
            'specialty' => ['nullable', 'string', 'max:100'],
            'level' => ['nullable', Rule::in(self::LEVELS)],
            'status' => ['sometimes', Rule::in(['ACTIVE', 'INACTIVE'])],
            'send_invite' => ['sometimes', 'boolean'],
        ], [
            'email.unique' => 'Email đã được dùng cho tài khoản khác.',
            'phone.regex' => 'Số điện thoại không hợp lệ.',
        ]);
    }

    /**
     * Tạo tài khoản đăng nhập + hồ sơ nhân viên (+ hồ sơ KTV). Mật khẩu ngẫu nhiên; nhân viên tự đặt qua email OTP.
     *
     * @param  array<string, mixed>  $data
     */
    private function createStaffAccount(array $data, string $role): Employee
    {
        $employee = DB::transaction(function () use ($data, $role) {
            $account = Account::query()->create([
                'email' => Str::lower($data['email']),
                'email_verified_at' => now(),
                'password_hash' => Hash::make(Str::random(40)),
                'role' => $role,
                'status' => ($data['status'] ?? 'ACTIVE') === 'ACTIVE' ? Account::STATUS_ACTIVE : Account::STATUS_INACTIVE,
            ]);
            $employee = Employee::query()->create([
                'account_id' => $account->id, 'full_name' => $data['name'], 'phone' => $data['phone'] ?? null, 'status' => $data['status'] ?? 'ACTIVE',
            ]);
            if ($role === Account::ROLE_TECHNICIAN) {
                TechnicianProfile::query()->create(['employee_id' => $employee->id, 'specialty' => $data['specialty'] ?? null, 'level' => $data['level'] ?? 'JUNIOR', 'is_available' => true]);
            }

            return $employee;
        });

        if ($data['send_invite'] ?? true) {
            $this->passwordReset->sendOtp($employee->account);
        }

        return $employee->fresh(['account', 'technicianProfile']);
    }

    /** @return array<string, mixed> */
    private function staffRow(Employee $e): array
    {
        return [
            'id' => $e->id,
            'account_id' => $e->account_id,
            'name' => $e->full_name,
            'email' => $e->account?->email,
            'phone' => $e->phone,
            'role' => $e->account?->role,
            'specialty' => $e->technicianProfile?->specialty,
            'level' => $e->technicianProfile?->level,
            'status' => $e->status,
            'joined_at' => $e->created_at?->toIso8601String(),
        ];
    }

    /* ------------------------------------------------------------ Tài khoản */

    /** GET /api/admin/accounts?role=&status=&search=&page= */
    public function accounts(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'role' => ['nullable', Rule::in([Account::ROLE_ADMIN, Account::ROLE_ADVISOR, Account::ROLE_TECHNICIAN, Account::ROLE_CUSTOMER])],
            'status' => ['nullable', Rule::in([Account::STATUS_ACTIVE, Account::STATUS_PENDING, Account::STATUS_LOCKED, Account::STATUS_INACTIVE])],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $lastLogin = DB::table('personal_access_tokens')->selectRaw('MAX(COALESCE(last_used_at, created_at))')
            ->where('tokenable_type', Account::class)->whereColumn('tokenable_id', 'accounts.id');

        $page = Account::query()
            ->select('accounts.*')->selectSub($lastLogin, 'last_login_at')
            ->with(['employee:id,account_id,full_name', 'customer:id,account_id,full_name'])
            ->when($filters['role'] ?? null, fn (Builder $q, string $r) => $q->where('role', $r))
            ->when($filters['status'] ?? null, fn (Builder $q, string $s) => $q->where('status', $s))
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q
                ->where('email', 'like', $like)
                ->orWhereHas('employee', fn (Builder $e) => $e->where('full_name', 'like', $like))
                ->orWhereHas('customer', fn (Builder $c) => $c->where('full_name', 'like', $like))))
            ->tap(fn (Builder $q) => $this->applySort($q, $request, [
                'created' => 'accounts.created_at', 'email' => 'accounts.email', 'role' => 'accounts.role',
                'status' => 'accounts.status', 'login' => 'last_login_at',
            ], tieBreaker: 'accounts.id'))
            ->paginate($filters['per_page'] ?? 10);

        return response()->json([
            'data' => $page->getCollection()->map(fn (Account $a) => $this->accountRow($a))->values(),
            'meta' => $this->meta($page),
            'summary' => Account::query()->selectRaw('role, count(*) as total')->groupBy('role')->pluck('total', 'role'),
        ]);
    }

    /** POST /api/admin/accounts — tạo tài khoản nội bộ (Admin, Cố vấn, Kỹ thuật viên). */
    public function storeAccount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:150', Rule::unique('accounts', 'email')],
            'name' => ['required', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^0\d{9,10}$/'],
            'role' => ['required', Rule::in([Account::ROLE_ADMIN, ...self::STAFF_ROLES])],
            'send_invite' => ['sometimes', 'boolean'],
        ], ['email.unique' => 'Email đã được dùng cho tài khoản khác.', 'phone.regex' => 'Số điện thoại không hợp lệ.']);

        $employee = $this->createStaffAccount($data, $data['role']);
        $account = Account::query()->with(['employee', 'customer'])->findOrFail($employee->account_id);

        return response()->json([
            'message' => ($data['send_invite'] ?? true) ? 'Đã tạo tài khoản và gửi email kích hoạt.' : 'Đã tạo tài khoản.',
            'data' => $this->accountRow($account),
        ], 201);
    }

    /** PATCH /api/admin/accounts/{account}/status {status: ACTIVE|LOCKED} */
    public function accountStatus(Request $request, Account $account): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in([Account::STATUS_ACTIVE, Account::STATUS_LOCKED])]]);
        if ($account->is($request->user())) {
            throw ValidationException::withMessages(['status' => 'Không thể tự khoá tài khoản đang đăng nhập.']);
        }

        $this->setAccountStatus($account, $data['status']);

        return response()->json([
            'message' => $data['status'] === Account::STATUS_LOCKED ? 'Đã khoá tài khoản.' : 'Đã kích hoạt tài khoản.',
            'data' => $this->accountRow($account->fresh(['employee', 'customer'])),
        ]);
    }

    /** POST /api/admin/accounts/{account}/reset-password — gửi email OTP đặt lại mật khẩu. */
    public function resetPassword(Account $account): JsonResponse
    {
        $sent = $this->passwordReset->sendOtp($account);

        return response()->json([
            'message' => $sent ? "Đã gửi email đặt lại mật khẩu tới {$account->email}." : 'Đã tạo mã đặt lại nhưng gửi email thất bại, vui lòng kiểm tra cấu hình mail.',
        ], $sent ? 200 : 502);
    }

    /** @return array<string, mixed> */
    private function accountRow(Account $a): array
    {
        return [
            'id' => $a->id,
            'email' => $a->email,
            'name' => $a->employee?->full_name ?? $a->customer?->full_name ?? $a->email,
            'role' => $a->role,
            'status' => $a->status,
            'verified' => $a->email_verified_at !== null,
            'last_login_at' => $a->last_login_at ? Carbon::parse($a->last_login_at)->toIso8601String() : null,
            'created_at' => $a->created_at?->toIso8601String(),
        ];
    }

    /** Đổi trạng thái tài khoản; khoá / ngừng thì thu hồi mọi phiên đăng nhập. */
    private function setAccountStatus(Account $account, string $status): void
    {
        $account->update(['status' => $status]);
        if ($status !== Account::STATUS_ACTIVE) {
            $account->tokens()->delete();
        }
    }

    /* ------------------------------------------------------------- Helpers */

    /** @param array<string, mixed> $filters */
    private function term(array $filters): ?string
    {
        $search = VehicleName::clean((string) ($filters['search'] ?? ''));

        return $search === '' ? null : VehicleName::like($search);
    }

    private function vehicleName(mixed $vehicle): string
    {
        return trim(($vehicle?->model?->brand?->name ?? '').' '.($vehicle?->model?->name ?? ''));
    }

    /** @return array{current_page: int, last_page: int, per_page: int, total: int} */
    private function meta(LengthAwarePaginator $page): array
    {
        return ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()];
    }
}
