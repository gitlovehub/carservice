<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    /**
     * GET /api/customers
     * Danh sách khách hàng + tìm kiếm + phân trang.
     */
    public function index(Request $request)
    {
        $query = Customer::query();

        if ($request->filled('search')) {
            $search = trim($request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $customers = $query
            ->orderByDesc('id')
            ->paginate(10);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách khách hàng thành công.',
            'data' => $customers,
        ]);
    }

    /**
     * POST /api/customers
     * Thêm khách hàng.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
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
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy khách hàng.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin khách hàng thành công.',
            'data' => $customer,
        ]);
    }

    /**
     * PUT /api/customers/{id}
     * Cập nhật khách hàng.
     */
    public function update(Request $request, int $id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy khách hàng.',
            ], 404);
        }

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);

        $customer->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật khách hàng thành công.',
            'data' => $customer->fresh(),
        ]);
    }

    public function destroy($id)
    {
        $customer = Customer::findOrFail($id);

        $customer->delete();

        return response()->json([
            'success' => true,
            'message' => 'Xóa khách hàng thành công.'
        ], 200);
    }
}