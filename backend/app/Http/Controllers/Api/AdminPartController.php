<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Part;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Danh mục phụ tùng (đọc). Chỉ phục vụ picker khi tạo/sửa gói bảo dưỡng.
 */
class AdminPartController extends Controller
{
    /**
     * GET /api/admin/parts
     */
    public function index(Request $request): JsonResponse
    {
        $query = Part::query();

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $query->where(
                fn ($builder) => $builder
                    ->where('name', 'like', '%' . $request->input('search') . '%')
                    ->orWhere('sku', 'like', '%' . $request->input('search') . '%')
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách phụ tùng thành công.',
            'data' => $query->orderBy('id')->get(),
        ]);
    }
}