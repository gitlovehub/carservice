<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;

/**
 * Đánh giá công khai cho trang chủ: chỉ đánh giá không bị ẩn, từ 4 sao, có nội dung.
 * Không lộ SĐT, biển số, mã phiếu; tên khách được rút gọn.
 */
class PublicReviewController extends Controller
{
    private const MIN_RATING = 4;

    // 6 = 2 trang × 3 thẻ trên carousel trang chủ (desktop).
    private const LIMIT = 6;

    private const MIN_COMMENT_LENGTH = 15;

    /**
     * GET /api/reviews/featured
     */
    public function featured(): JsonResponse
    {
        $visible = Review::query()->where('is_hidden', false);

        $reviews = (clone $visible)
            ->where('overall_rating', '>=', self::MIN_RATING)
            ->whereNotNull('comment')->where('comment', '<>', '')
            ->with([
                'customer:id,full_name',
                'repairOrder:id,vehicle_id', 'repairOrder.vehicle:id,model_id',
                'repairOrder.vehicle.model:id,brand_id,name', 'repairOrder.vehicle.model.brand:id,name',
                'repairOrder.workItems:id,repair_order_id,service_id', 'repairOrder.workItems.service:id,name',
            ])
            ->orderByDesc('overall_rating')->orderByDesc('created_at')->orderByDesc('id')
            ->limit(self::LIMIT * 5)
            ->get()
            // Bỏ nhận xét quá ngắn ("tot", "ok") — lọc ở PHP để đếm đúng ký tự Unicode trên mọi DB.
            ->filter(fn (Review $r) => mb_strlen(trim((string) $r->comment)) >= self::MIN_COMMENT_LENGTH)
            ->take(self::LIMIT);

        return response()->json([
            'data' => $reviews->map(fn (Review $r) => [
                'id' => $r->id,
                'customer' => self::maskName($r->customer?->full_name),
                'vehicle' => self::vehicleName($r->repairOrder?->vehicle),
                'services' => $r->repairOrder?->workItems->map(fn ($w) => $w->service?->name)->filter()->unique()->take(2)->values()->all() ?? [],
                'rating' => (int) $r->overall_rating,
                'comment' => (string) $r->comment,
                'reply' => $r->reply,
                'date' => $r->created_at?->toIso8601String(),
            ])->values(),
            'summary' => [
                'average' => round((float) (clone $visible)->avg('overall_rating'), 1),
                'count' => (clone $visible)->count(),
            ],
        ]);
    }

    /** "Nguyễn Văn An" → "Nguyễn V. An"; một chữ giữ nguyên; rỗng → "Khách hàng". */
    private static function maskName(?string $name): string
    {
        $parts = preg_split('/\s+/u', trim((string) $name), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        if ($parts === []) {
            return 'Khách hàng';
        }
        if (count($parts) <= 2) {
            return implode(' ', $parts);
        }
        $middle = array_map(fn (string $p) => mb_strtoupper(mb_substr($p, 0, 1)).'.', array_slice($parts, 1, -1));

        return implode(' ', [$parts[0], ...$middle, end($parts)]);
    }

    private static function vehicleName(?Vehicle $vehicle): ?string
    {
        $name = trim(implode(' ', array_filter([$vehicle?->model?->brand?->name, $vehicle?->model?->name])));

        return $name === '' ? null : $name;
    }
}
