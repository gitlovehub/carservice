<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Advisor / Admin
    |--------------------------------------------------------------------------
    */

    /**
     * GET /api/customers
     * Danh sách khách hàng + tìm kiếm + phân trang.
     */
    public function index(Request $request)
    {
        $request->validate(['segment' => ['nullable', Rule::in(array_keys($this->segments()))]]);
        $query = Customer::query();

        if ($request->filled('search')) {
            $search = trim($request->input('search'));

            // Mockup 17/11: tìm theo tên, SĐT, email hoặc biển số xe.
            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereHas('vehicles', fn ($v) => $v->where('license_plate', 'like', "%{$search}%"));
            });
        }
        if ($request->filled('segment')) {
            $this->segments()[$request->input('segment')]($query);
        }

        // ADV-09 + mockup 17/11: số xe, số lần ghé, lần ghé gần nhất, tài khoản, tổng chi tiêu (hoá đơn đã thanh toán),
        // số lượt đã bàn giao (hạng thân thiết), đang có xe ở xưởng.
        $customers = $query
            ->withCount(['vehicles', 'repairOrders', 'repairOrders as completed_visits' => fn ($q) => $q->where('status', RepairOrder::HANDED_OVER)])
            ->withMax('repairOrders as last_visit_at', 'received_at')
            ->withSum(['invoices as total_spent' => fn ($q) => $q->where('invoices.status', Invoice::PAID)], 'total_amount')
            ->withExists(['repairOrders as in_shop' => fn ($q) => $q->whereNotIn('status', [RepairOrder::HANDED_OVER, RepairOrder::CLOSED])])
            ->orderByDesc('id')
            ->paginate(min(100, max(5, (int) $request->query('per_page', 10))));
        $customers->getCollection()->each(fn (Customer $c) => $this->decorate($c));

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách khách hàng thành công.',
            'data' => $customers,
            'summary' => [
                'total' => Customer::query()->count(),
                'with_account' => Customer::query()->whereNotNull('account_id')->count(),
                'new_this_month' => Customer::query()->where('created_at', '>=', now()->startOfMonth())->count(),
                'new_30_days' => $this->segments()['new'](Customer::query())->count(),
                'in_shop' => $this->segments()['in_shop'](Customer::query())->count(),
                'loyal' => $this->segments()['loyal'](Customer::query())->count(),
                'loyal_min_visits' => Customer::LOYAL_MIN_VISITS,
            ],
        ]);
    }

    /**
     * Nhóm khách cho thẻ số liệu / bộ lọc của cố vấn.
     *
     * @return array<string, callable(Builder): Builder>
     */
    private function segments(): array
    {
        return [
            'new' => fn (Builder $q) => $q->where('created_at', '>=', now()->subDays(30)),
            'in_shop' => fn (Builder $q) => $q->whereHas('repairOrders', fn ($o) => $o->whereNotIn('status', [RepairOrder::HANDED_OVER, RepairOrder::CLOSED])),
            'loyal' => fn (Builder $q) => $q->has('repairOrders', '>=', Customer::LOYAL_MIN_VISITS, 'and', fn ($o) => $o->where('status', RepairOrder::HANDED_OVER)),
        ];
    }

    /** Trường tính thêm cho danh sách / chi tiết: có tài khoản web, hạng khách, tổng chi tiêu dạng số. */
    private function decorate(Customer $customer): Customer
    {
        $customer->setAttribute('has_account', $customer->account_id !== null);
        $customer->setAttribute('total_spent', (float) ($customer->total_spent ?? 0));
        $visits = (int) ($customer->completed_visits ?? 0);
        $customer->setAttribute('tier', $visits >= Customer::LOYAL_MIN_VISITS ? 'LOYAL' : ($visits > 0 ? 'RETURNING' : 'NEW'));

        return $customer;
    }

    /**
     * POST /api/customers
     * Cố vấn/Admin tạo hồ sơ khách hàng.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:100'],

            'phone' => [
                'required',
                'string',
                'max:20',
                Rule::unique('customers', 'phone'),
            ],

            'email' => [
                'nullable',
                'email',
                'max:150',
                Rule::unique('customers', 'email'),
            ],

            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $customer = Customer::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Thêm khách hàng thành công.',
            'data' => $customer,
        ], 201);
    }

    /**
     * GET /api/customers/{id}
     * Xem chi tiết khách hàng.
     */
    public function show(int $id)
    {
        // ADV-09: khung chi tiết của cố vấn — xe (logo, phiếu đang mở), 5 phiếu gần nhất, lịch sắp tới.
        // Mockup 17/11: + tổng chi tiêu, hạng khách, lịch sử dịch vụ (10 phiếu kèm hạng mục hoá đơn + tổng), đánh giá, lịch đã qua.
        $customer = Customer::query()->with([
            'vehicles' => fn ($q) => $q->latest(), 'vehicles.model:id,brand_id,name', 'vehicles.model.brand:id,name', 'vehicles.trim:id,name',
            'repairOrders' => fn ($q) => $q->latest('received_at')->limit(10), 'repairOrders.vehicle:id,license_plate,model_id',
            'repairOrders.vehicle.model:id,brand_id,name', 'repairOrders.vehicle.model.brand:id,name',
            'repairOrders.invoice:id,repair_order_id,total_amount,status', 'repairOrders.invoice.items:id,invoice_id,description',
            'repairOrders.workItems:id,repair_order_id,description,service_id', 'repairOrders.workItems.service:id,name',
            'appointments' => fn ($q) => $q->whereIn('status', ['PENDING', 'CONFIRMED'])->whereDate('appointment_date', '>=', today())
                ->orderBy('appointment_date')->orderBy('appointment_time')->limit(5),
            'reviews' => fn ($q) => $q->latest()->limit(10), 'reviews.repairOrder:id,repair_order_code',
        ])->withCount(['vehicles', 'repairOrders', 'repairOrders as completed_visits' => fn ($q) => $q->where('status', RepairOrder::HANDED_OVER)])
            ->withSum(['invoices as total_spent' => fn ($q) => $q->where('invoices.status', Invoice::PAID)], 'total_amount')
            ->find($id);

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy khách hàng.',
            ], 404);
        }

        $openOrders = RepairOrder::query()->where('customer_id', $customer->id)
            ->whereNotIn('status', [RepairOrder::HANDED_OVER, RepairOrder::CLOSED])
            ->pluck('repair_order_code', 'vehicle_id');
        $customer->vehicles->each(fn (Vehicle $vehicle) => $vehicle->setAttribute('open_repair_order_code', $openOrders[$vehicle->id] ?? null));
        $this->decorate($customer);
        // Lịch hẹn đã qua / đã xử lý gần nhất (tab Lịch hẹn).
        $customer->setAttribute('past_appointments', $customer->appointments()
            ->where(fn ($q) => $q->whereDate('appointment_date', '<', today())->orWhereNotIn('status', ['PENDING', 'CONFIRMED']))
            ->orderByDesc('appointment_date')->orderByDesc('appointment_time')->limit(5)
            ->get(['id', 'appointment_code', 'appointment_date', 'appointment_time', 'status']));

        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin khách hàng thành công.',
            'data' => $customer,
        ]);
    }

    /**
     * PUT/PATCH /api/customers/{id}
     * Cập nhật thông tin khách hàng.
     */
    public function update(Request $request, int $id)
    {
        $customer = Customer::find($id);

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy khách hàng.',
            ], 404);
        }

        $validated = $request->validate([
            'full_name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
            ],

            'phone' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                Rule::unique('customers', 'phone')->ignore($customer->id),
            ],

            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:150',
                Rule::unique('customers', 'email')->ignore($customer->id),
            ],

            'address' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],
        ]);

        $customer->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật khách hàng thành công.',
            'data' => $customer->fresh(),
        ]);
    }

    /**
     * DELETE /api/customers/{customer}
     * Xóa khách hàng.
     * Quyền truy cập được kiểm soát ở routes/api.php.
     */
    public function destroy(int $id)
    {
        $customer = Customer::find($id);

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy khách hàng.',
            ], 404);
        }

        $customer->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa khách hàng thành công.',
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Customer - Hồ sơ cá nhân
    |--------------------------------------------------------------------------
    */

    /**
     * GET /api/me/customer
     * Khách hàng xem hồ sơ của chính mình.
     */
    public function me(Request $request)
    {
        $customer = $request->user()
            ->customer()
            ->first();

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ khách hàng.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin cá nhân thành công.',
            'data' => $customer,
        ]);
    }

    /**
     * PUT /api/me/customer
     * Khách hàng cập nhật hồ sơ của chính mình.
     */
    public function updateMe(Request $request)
    {
        $customer = $request->user()
            ->customer()
            ->first();

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản chưa có hồ sơ khách hàng.',
            ], 404);
        }

        $validated = $request->validate([
            'full_name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
            ],

            'phone' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                Rule::unique('customers', 'phone')->ignore($customer->id),
            ],

            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:150',
                Rule::unique('customers', 'email')->ignore($customer->id),
            ],

            'address' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],
        ]);

        $customer->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông tin cá nhân thành công.',
            'data' => $customer->fresh(),
        ]);
    }
}
