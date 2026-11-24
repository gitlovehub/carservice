<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Review;
use App\Services\ReviewReplyService;
use App\Support\VehicleName;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

/** Lọc, tìm kiếm và định dạng đánh giá dùng chung cho API Admin và Cố vấn. */
trait PresentsReviews
{
    /** @param  array<string, mixed>  $filters */
    private function applyReviewFilters(Builder $query, array $filters, string $rating, string $status): Builder
    {
        return $query
            ->when($status === 'unreplied', fn (Builder $q) => $q->whereNull('reply'))
            ->when($status === 'replied', fn (Builder $q) => $q->whereNotNull('reply'))
            ->when($rating === 'low', fn (Builder $q) => $q->where('overall_rating', '<=', 3))
            ->when(in_array($rating, ['5', '4', '3', '2', '1'], true), fn (Builder $q) => $q->where('overall_rating', (int) $rating))
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q
                ->where('comment', 'like', $like)
                ->orWhereHas('customer', fn (Builder $c) => $c->where('full_name', 'like', $like))
                ->orWhereHas('repairOrder', fn (Builder $r) => $r->where('repair_order_code', 'like', $like))
                ->orWhereHas('repairOrder.vehicle', fn (Builder $v) => $this->whereVehicleMatches($v, (string) $filters['search']))))
            ->orderByDesc('created_at')->orderByDesc('id');
    }

    /** Mỗi từ khoá phải khớp biển số, dòng xe hoặc hãng xe (tìm được "Toyota Vios" dù hãng và dòng ở hai bảng). */
    private function whereVehicleMatches(Builder $vehicle, string $search): void
    {
        foreach (preg_split('/\s+/u', VehicleName::clean($search), flags: PREG_SPLIT_NO_EMPTY) as $word) {
            $like = VehicleName::like($word);
            $vehicle->where(fn (Builder $q) => $q->where('license_plate', 'like', $like)
                ->orWhereHas('model', fn (Builder $m) => $m->where('name', 'like', $like)
                    ->orWhereHas('brand', fn (Builder $b) => $b->where('name', 'like', $like))));
        }
    }

    /** @return array{reply: string, expected_reply?: string} */
    private function validatedReply(Request $request, ReviewReplyService $replies, bool $editing = false): array
    {
        $data = $request->validate([
            'reply' => ['required', 'string', 'max:2000'],
            ...($editing ? ['expected_reply' => ['required', 'string']] : []),
        ], ['reply.required' => 'Vui lòng nhập nội dung phản hồi.', 'reply.max' => 'Phản hồi tối đa 2.000 ký tự.']);
        abort_if($replies->normalize($data['reply']) === '', 422, 'Vui lòng nhập nội dung phản hồi.');

        return $data;
    }

    /** @return list<string> */
    private function reviewRelations(): array
    {
        return [
            'customer:id,full_name,phone',
            'repairOrder:id,repair_order_code,vehicle_id,advisor_id,received_at,handed_over_at,completed_at',
            'repairOrder.vehicle:id,model_id,license_plate',
            'repairOrder.vehicle.model:id,brand_id,name', 'repairOrder.vehicle.model.brand:id,name',
            'repairOrder.workItems:id,repair_order_id,service_id,description', 'repairOrder.workItems.service:id,name',
        ];
    }

    /**
     * Một lượt đánh giá ga-ra gắn với một lần khách mang xe đến (phiếu sửa chữa): xe, ngày làm, dịch vụ đã làm.
     *
     * @return array<string, mixed>
     */
    private function reviewRow(Review $r): array
    {
        $order = $r->repairOrder;
        $visit = $order?->handed_over_at ?? $order?->completed_at ?? $order?->received_at;

        return [
            'id' => $r->id,
            'customer' => $r->customer?->full_name,
            'phone' => $r->customer?->phone,
            'vehicle' => $this->vehicleName($order?->vehicle),
            'plate' => $order?->vehicle?->license_plate,
            'order_id' => $order?->id,
            'order_code' => $order?->repair_order_code,
            'visit_date' => $visit?->toIso8601String(),
            'services' => $order?->workItems->map(fn ($w) => $w->service?->name ?? $w->description)->filter()->unique()->values()->all() ?? [],
            'rating' => (int) $r->overall_rating,
            'comment' => (string) $r->comment,
            'date' => $r->created_at?->toIso8601String(),
            'reply' => $r->reply,
            'replied_at' => $r->replied_at?->toIso8601String(),
            'reply_edited_at' => $r->reply_edited_at?->toIso8601String(),
            'hidden' => (bool) $r->is_hidden,
        ];
    }

    /** @param  array<string, mixed>  $filters */
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
