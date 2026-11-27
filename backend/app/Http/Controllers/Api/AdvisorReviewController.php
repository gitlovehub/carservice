<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AppliesDateRange;
use App\Http\Controllers\Concerns\PresentsReviews;
use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Review;
use App\Services\ReviewReplyService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Phản hồi khách hàng của Cố vấn: chỉ các đánh giá đang hiển thị thuộc phiếu mình phụ trách.
 * Không có quyền ẩn/hiện đánh giá, xoá phản hồi hay xem lịch sử chỉnh sửa (chỉ Admin).
 */
class AdvisorReviewController extends Controller
{
    use AppliesDateRange, PresentsReviews;

    public function __construct(private ReviewReplyService $replies) {}

    /** GET /api/advisor/reviews?rating=&status=&search=&page= */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'rating' => ['nullable', Rule::in(['all', '5', '4', '3', '2', '1'])],
            'status' => ['nullable', Rule::in(['all', 'unreplied', 'replied'])],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            ...$this->dateRangeRules($request),
        ]);
        $account = $request->user();
        $inRange = fn (): Builder => $this->applyDateRange($this->assignedReviews($account), $filters, 'created_at');

        $page = $this->applyReviewFilters(
            $inRange()->with([...$this->reviewRelations(), 'firstReplyRevision']),
            $filters,
            $filters['rating'] ?? 'all',
            $filters['status'] ?? 'all',
        )->paginate($filters['per_page'] ?? 12);

        $total = $inRange()->count();
        $replied = $inRange()->whereNotNull('reply')->count();

        return response()->json([
            'data' => $page->getCollection()->map(fn (Review $review) => $this->advisorRow($review, $account))->values(),
            'meta' => $this->meta($page),
            'summary' => [
                'total' => $total,
                'average' => $total ? round((float) $inRange()->avg('overall_rating'), 2) : null,
                'unreplied' => $total - $replied,
                'replied' => $replied,
            ],
        ]);
    }

    /** POST /api/advisor/reviews/{review}/reply */
    public function reply(Request $request, Review $review): JsonResponse
    {
        $this->assertAssigned($review, $request->user());
        $data = $this->validatedReply($request, $this->replies);
        $this->replies->create($review, $data['reply'], $request->user());

        return $this->saved($review, $request->user(), 'Đã gửi phản hồi.');
    }

    /** PUT /api/advisor/reviews/{review}/reply — chỉ sửa phản hồi do chính mình tạo. */
    public function updateReply(Request $request, Review $review): JsonResponse
    {
        $this->assertAssigned($review, $request->user());
        $data = $this->validatedReply($request, $this->replies, editing: true);
        $this->replies->update($review, $data['reply'], $data['expected_reply'], $request->user(), onlyAuthor: true);

        return $this->saved($review, $request->user(), 'Đã cập nhật phản hồi.');
    }

    private function assignedReviews(Account $account): Builder
    {
        $employeeId = $account->employee?->id ?? 0;

        return Review::query()
            ->where('is_hidden', false)
            ->whereHas('repairOrder', fn (Builder $order) => $order->where('advisor_id', $employeeId));
    }

    private function assertAssigned(Review $review, Account $account): void
    {
        $employeeId = $account->employee?->id;
        abort_unless($employeeId !== null && (int) $review->repairOrder?->advisor_id === (int) $employeeId, 403, 'Đánh giá này không thuộc phiếu bạn phụ trách.');
        abort_if($review->is_hidden, 404, 'Đánh giá này hiện không còn hiển thị.');
    }

    /** @return array<string, mixed> */
    private function advisorRow(Review $review, Account $account): array
    {
        return [
            ...$this->reviewRow($review),
            'can_edit_reply' => $review->reply !== null && $this->replies->isAuthor($review, $account),
        ];
    }

    private function saved(Review $review, Account $account, string $message): JsonResponse
    {
        $fresh = $review->fresh([...$this->reviewRelations(), 'firstReplyRevision']);

        return response()->json(['message' => $message, 'data' => $this->advisorRow($fresh, $account)]);
    }
}
