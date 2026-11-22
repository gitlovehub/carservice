<?php

namespace App\Http\Controllers;

use App\Exceptions\InvalidStatusTransitionException;
use App\Mail\QuotationReviewRequestMail;
use App\Models\Quotation;
use App\Services\ConfirmationService;
use App\Services\QuotationEmailReviewService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

/**
 * Trang khách mở từ email báo giá (không cần đăng nhập — link có chữ ký là quyền truy cập).
 * GET: xem báo giá + chọn Đồng ý / Từ chối từng dòng. POST (bấm "Gửi lựa chọn"): ghi phản hồi + bằng chứng EMAIL_LINK.
 * Trình quét link của hộp thư chỉ GET nên không duyệt hộ khách.
 */
class QuotationEmailReviewController extends Controller
{
    public function __construct(
        private readonly QuotationEmailReviewService $links,
        private readonly ConfirmationService $confirmations,
    ) {}

    public function show(Request $request, int $quotation): View
    {
        return $this->page($request, $quotation, false);
    }

    public function submit(Request $request, int $quotation): View
    {
        return $this->page($request, $quotation, true);
    }

    private function page(Request $request, int $id, bool $submit): View
    {
        $quotation = Quotation::query()->with('items')->find($id);
        if (! $quotation || ! $request->hasValidSignature(false)) {
            return $this->view('expired');
        }
        if (! $this->links->matchesRevision($quotation, (string) $request->query('rev'))) {
            return $this->view('changed', $quotation);
        }
        if ($quotation->status !== Quotation::SENT) {
            return $this->view(in_array($quotation->status, [Quotation::APPROVED, Quotation::PARTIALLY_APPROVED, Quotation::REJECTED], true) ? 'already' : 'closed', $quotation);
        }
        if (! $submit) {
            return $this->view('ready', $quotation, $request->fullUrl());
        }

        $data = $request->validate(['decision' => ['required', 'array'], 'decision.*' => ['required', 'in:approve,reject']]);
        $responses = $quotation->items->map(fn ($item) => [
            'item_id' => $item->id,
            'is_approved' => ($data['decision'][$item->id] ?? null) === 'approve',
        ])->all();
        if (count(array_intersect_key($data['decision'], array_flip($quotation->items->pluck('id')->all()))) !== $quotation->items->count()) {
            throw ValidationException::withMessages(['decision' => 'Vui lòng chọn Đồng ý hoặc Từ chối cho mọi hạng mục.']);
        }

        try {
            $this->confirmations->respondViaEmailLink($quotation, $responses, $request);
        } catch (InvalidStatusTransitionException) {
            // Vừa được duyệt ở nơi khác (tài khoản / tại quầy) trong lúc khách đang chọn.
            return $this->view('already', $quotation->fresh('items'));
        }

        return $this->view('done', $quotation->fresh('items'));
    }

    private function view(string $state, ?Quotation $quotation = null, ?string $action = null): View
    {
        return view('quotations.email-review', [
            'state' => $state,
            'action' => $action,
            'summary' => $quotation ? QuotationReviewRequestMail::summary($quotation) : null,
            'decisions' => $quotation ? $quotation->items->mapWithKeys(fn ($item) => [$item->id => $item->is_approved])->all() : [],
        ]);
    }
}
