<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Part;
use App\Models\RepairOrder;
use App\Models\Review;
use Illuminate\Http\JsonResponse;

/**
 * Con số tổng hợp công khai cho trang chủ — chỉ số đếm, không lộ dữ liệu cá nhân.
 */
class HomeStatsController extends Controller
{
    private const FINISHED = [RepairOrder::COMPLETED, RepairOrder::HANDED_OVER, RepairOrder::CLOSED];

    /**
     * GET /api/home-stats
     */
    public function index(): JsonResponse
    {
        $finished = RepairOrder::query()->whereIn('status', self::FINISHED);
        $reviews = Review::query()->where('is_hidden', false);

        return response()->json(['data' => [
            'completed_orders' => (clone $finished)->count(),
            'vehicles_served' => (clone $finished)->distinct()->count('vehicle_id'),
            'customers_served' => (clone $finished)->distinct()->count('customer_id'),
            'rating_average' => round((float) (clone $reviews)->avg('overall_rating'), 1),
            'rating_count' => (clone $reviews)->count(),
            // Số mã phụ tùng đang kinh doanh trong kho.
            'parts_count' => Part::query()->where('status', 'ACTIVE')->count(),
        ]]);
    }
}
