<?php

namespace App\Services;

use App\Exceptions\InvalidStatusTransitionException;
use App\Models\Account;
use App\Models\Assignment;
use App\Models\Employee;
use App\Models\Inspection;
use App\Models\InspectionItem;
use App\Models\InspectionRecommendation;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\RepairOrder;
use App\Models\RepairOrderStatusHistory;
use App\Models\TechnicianProfile;
use App\Models\UsedPart;
use App\Models\WorkItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RepairOrderService
{
    /*
    |--------------------------------------------------------------------------
    | 1. Tiếp nhận xe
    |--------------------------------------------------------------------------
    */
    public function receive(array $data, Employee $advisor): RepairOrder
    {
        $this->assertAdvisor($advisor);

        return DB::transaction(function () use ($data, $advisor) {
            $ro = RepairOrder::create([
                'repair_order_code' => $this->generateCode('RO'),
                'appointment_id' => $data['appointment_id'] ?? null,
                'customer_id' => $data['customer_id'],
                'vehicle_id' => $data['vehicle_id'],
                'advisor_id' => $advisor->id,
                'mileage_received' => $data['mileage_received'] ?? null,
                'initial_condition' => $data['initial_condition'] ?? null,
                'status' => RepairOrder::RECEIVED,
                'received_at' => now(),
                'note' => $data['note'] ?? null,
            ]);

            $this->logHistory($ro, RepairOrder::RECEIVED, null, 'Tiếp nhận xe.');

            return $ro;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 2. Giao KTV kiểm tra / chẩn đoán
    |--------------------------------------------------------------------------
    */
    public function assignTechnician(RepairOrder $ro, TechnicianProfile $technician, ?Account $actor, ?string $note = null): Assignment
    {
        $this->assertTechnician($technician);

        return DB::transaction(function () use ($ro, $technician, $actor, $note) {
            $assignment = Assignment::create([
                'repair_order_id' => $ro->id,
                'technician_id' => $technician->id,
                'status' => Assignment::ASSIGNED,
                'note' => $note,
                'assigned_at' => now(),
            ]);

            if ($ro->status === RepairOrder::RECEIVED) {
                $this->transition($ro, RepairOrder::INSPECTING, $actor, 'Giao KTV kiểm tra/chẩn đoán.');
            }

            return $assignment;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 3. KTV ghi nhận kết quả kiểm tra / chẩn đoán
    |--------------------------------------------------------------------------
    | $data = [
    |   'condition_description' => ..., 'diagnosis' => ...,
    |   'items' => [['item_name','condition_status','condition_description','note'], ...],
    |   'recommendations' => [['item_type','service_id'|'part_id','quantity','note'], ...],
    | ]
    */
    public function recordInspection(RepairOrder $ro, TechnicianProfile $technician, array $data): Inspection
    {
        $this->assertTechnician($technician);

        if (! in_array($ro->status, [RepairOrder::RECEIVED, RepairOrder::INSPECTING], true)) {
            throw InvalidStatusTransitionException::because(
                'Chỉ ghi nhận kiểm tra khi Phiếu sửa chữa đang RECEIVED hoặc INSPECTING.'
            );
        }

        return DB::transaction(function () use ($ro, $technician, $data) {
            $inspection = Inspection::create([
                'repair_order_id' => $ro->id,
                'technician_id' => $technician->id,
                'condition_description' => $data['condition_description'] ?? null,
                'diagnosis' => $data['diagnosis'] ?? null,
                'inspected_at' => now(),
            ]);

            foreach ($data['items'] ?? [] as $item) {
                InspectionItem::create([
                    'inspection_id' => $inspection->id,
                    'item_name' => $item['item_name'],
                    'condition_status' => $item['condition_status'] ?? null,
                    'condition_description' => $item['condition_description'] ?? null,
                    'note' => $item['note'] ?? null,
                ]);
            }

            foreach ($data['recommendations'] ?? [] as $rec) {
                $this->assertRecommendationIsWellFormed($rec);

                InspectionRecommendation::create([
                    'inspection_id' => $inspection->id,
                    'item_type' => $rec['item_type'],
                    'service_id' => $rec['item_type'] === InspectionRecommendation::TYPE_SERVICE ? $rec['service_id'] : null,
                    'part_id' => $rec['item_type'] === InspectionRecommendation::TYPE_PART ? $rec['part_id'] : null,
                    'quantity' => $rec['quantity'] ?? 1,
                    'note' => $rec['note'] ?? null,
                ]);
            }

            if ($ro->status === RepairOrder::RECEIVED) {
                $ro->status = RepairOrder::INSPECTING;
                $ro->save();
                $this->logHistory($ro, RepairOrder::INSPECTING, null, 'KTV bắt đầu kiểm tra.');
            }

            return $inspection->load('items', 'recommendations');
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 4. Cố vấn lập báo giá
    |--------------------------------------------------------------------------
    | RULE: một dòng PART chỉ được thêm nếu part_id đó đã từng xuất hiện
    | trong inspection_recommendations của chính Phiếu sửa chữa này.
    | $itemsInput = [['item_type','service_id'|'part_id','description','quantity','unit_price'], ...]
    */
    public function createQuotation(
        RepairOrder $ro,
        Employee $advisor,
        array $itemsInput,
        float $discountAmount = 0,
        ?string $validUntil = null
    ): Quotation {
        $this->assertAdvisor($advisor);

        if (! in_array($ro->status, [RepairOrder::INSPECTING, RepairOrder::WAITING_APPROVAL], true)) {
            throw InvalidStatusTransitionException::because(
                'Chỉ lập báo giá khi Phiếu sửa chữa đang INSPECTING (báo giá đầu) hoặc WAITING_APPROVAL (báo giá lại).'
            );
        }

        $recommendedPartIds = InspectionRecommendation::query()
            ->whereHas('inspection', fn ($q) => $q->where('repair_order_id', $ro->id))
            ->where('item_type', InspectionRecommendation::TYPE_PART)
            ->pluck('part_id')
            ->all();

        return DB::transaction(function () use ($ro, $advisor, $itemsInput, $discountAmount, $validUntil, $recommendedPartIds) {
            $nextVersion = (int) $ro->quotations()->max('version') + 1;

            $quotation = Quotation::create([
                'quotation_code' => $this->generateCode('QT'),
                'repair_order_id' => $ro->id,
                'advisor_id' => $advisor->id,
                'version' => $nextVersion,
                'discount_amount' => $discountAmount,
                'status' => Quotation::DRAFT,
                'valid_until' => $validUntil,
            ]);

            foreach ($itemsInput as $item) {
                if ($item['item_type'] === QuotationItem::TYPE_PART
                    && ! in_array($item['part_id'], $recommendedPartIds, true)) {
                    throw InvalidStatusTransitionException::because(
                        'Phụ tùng chỉ được thêm vào báo giá sau khi đã có trong đề xuất kiểm tra/chẩn đoán.'
                    );
                }

                $unitPrice = (float) $item['unit_price'];
                $quantity = (int) ($item['quantity'] ?? 1);

                QuotationItem::create([
                    'quotation_id' => $quotation->id,
                    'item_type' => $item['item_type'],
                    'service_id' => $item['item_type'] === QuotationItem::TYPE_SERVICE ? $item['service_id'] : null,
                    'part_id' => $item['item_type'] === QuotationItem::TYPE_PART ? $item['part_id'] : null,
                    'description' => $item['description'],
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'amount' => $unitPrice * $quantity,
                ]);
            }

            $quotation->recalculateTotals();

            return $quotation->load('items');
        });
    }

    public function sendQuotation(Quotation $quotation, ?Account $actor): Quotation
    {
        if ($quotation->status !== Quotation::DRAFT) {
            throw InvalidStatusTransitionException::because('Chỉ gửi được báo giá đang ở trạng thái DRAFT.');
        }

        return DB::transaction(function () use ($quotation, $actor) {
            $quotation->status = Quotation::SENT;
            $quotation->save();

            $ro = $quotation->repairOrder;
            if ($ro->status === RepairOrder::INSPECTING) {
                $this->transition($ro, RepairOrder::WAITING_APPROVAL, $actor,
                    "Đã gửi báo giá {$quotation->quotation_code} cho khách.");
            }

            return $quotation;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 5. Khách duyệt / từ chối từng dòng báo giá
    |--------------------------------------------------------------------------
    | $responses = [['item_id' => .., 'is_approved' => bool], ...]
    */
    public function recordCustomerResponse(Quotation $quotation, array $responses): Quotation
    {
        if ($quotation->status !== Quotation::SENT) {
            throw InvalidStatusTransitionException::because('Chỉ ghi nhận phản hồi cho báo giá đang ở trạng thái SENT.');
        }

        return DB::transaction(function () use ($quotation, $responses) {
            foreach ($responses as $r) {
                QuotationItem::where('quotation_id', $quotation->id)
                    ->where('id', $r['item_id'])
                    ->update(['is_approved' => (bool) $r['is_approved']]);
            }

            $quotation->refresh();
            $items = $quotation->items;

            $answeredCount = $items->whereNotNull('is_approved')->count();
            $approvedCount = $items->where('is_approved', true)->count();

            $quotation->status = match (true) {
                $answeredCount < $items->count() => Quotation::SENT, // khách chưa trả lời hết
                $approvedCount === $items->count() => Quotation::APPROVED,
                $approvedCount === 0 => Quotation::REJECTED,
                default => Quotation::PARTIALLY_APPROVED,
            };
            $quotation->customer_response_at = now();
            $quotation->save();

            return $quotation->fresh('items');
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 6. Bắt đầu sửa chữa (sau khi có báo giá được duyệt)
    |--------------------------------------------------------------------------
    */
    public function startRepair(RepairOrder $ro, ?Account $actor): RepairOrder
    {
        $quotation = $ro->latestQuotation;

        if (! $quotation || ! in_array($quotation->status, [Quotation::APPROVED, Quotation::PARTIALLY_APPROVED], true)) {
            throw InvalidStatusTransitionException::because(
                'Cần có báo giá đã được khách duyệt (toàn bộ hoặc một phần) trước khi bắt đầu sửa chữa.'
            );
        }

        return DB::transaction(function () use ($ro, $quotation, $actor) {
            $approvedServices = $quotation->items()
                ->where('item_type', QuotationItem::TYPE_SERVICE)
                ->where('is_approved', true)
                ->get();

            foreach ($approvedServices as $item) {
                WorkItem::create([
                    'repair_order_id' => $ro->id,
                    'service_id' => $item->service_id,
                    'description' => $item->description,
                    'status' => WorkItem::PENDING,
                ]);
            }

            $this->transition($ro, RepairOrder::IN_PROGRESS, $actor,
                "Bắt đầu sửa chữa theo báo giá {$quotation->quotation_code}.");

            return $ro;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 7. WAITING_FOR_PARTS
    |--------------------------------------------------------------------------
    */
    public function markWaitingForParts(RepairOrder $ro, ?Account $actor, ?string $note = null): RepairOrder
    {
        $this->transition($ro, RepairOrder::WAITING_FOR_PARTS, $actor, $note ?? 'Đang chờ phụ tùng.');

        return $ro;
    }

    public function resumeFromWaitingForParts(RepairOrder $ro, ?Account $actor, ?string $note = null): RepairOrder
    {
        $this->transition($ro, RepairOrder::IN_PROGRESS, $actor, $note ?? 'Đã có đủ phụ tùng, tiếp tục sửa chữa.');

        return $ro;
    }

    /*
    |--------------------------------------------------------------------------
    | 8. Theo dõi sửa chữa: work items & phụ tùng thực dùng
    |--------------------------------------------------------------------------
    */
    public function updateWorkItemStatus(WorkItem $item, string $status): WorkItem
    {
        if (! in_array($status, [WorkItem::PENDING, WorkItem::IN_PROGRESS, WorkItem::COMPLETED, WorkItem::CANCELLED], true)) {
            throw InvalidStatusTransitionException::because('Trạng thái hạng mục công việc không hợp lệ.');
        }

        $item->status = $status;

        if ($status === WorkItem::IN_PROGRESS) {
            $item->started_at ??= now();
        }

        if ($status === WorkItem::COMPLETED) {
            $item->completed_at = now();
        }

        $item->save();

        return $item;
    }

    /**
     * RULE: chỉ ghi nhận phụ tùng thực dùng nếu part_id nằm trong
     * các dòng PART đã được khách duyệt của báo giá mới nhất.
     */
    public function recordUsedPart(RepairOrder $ro, array $data): UsedPart
    {
        $approvedPartIds = $ro->latestQuotation
            ? $ro->latestQuotation->items()
                ->where('item_type', QuotationItem::TYPE_PART)
                ->where('is_approved', true)
                ->pluck('part_id')
                ->all()
            : [];

        if (! in_array($data['part_id'], $approvedPartIds, true)) {
            throw InvalidStatusTransitionException::because(
                'Phụ tùng phải nằm trong báo giá đã được khách duyệt mới được ghi nhận sử dụng.'
            );
        }

        return UsedPart::create([
            'repair_order_id' => $ro->id,
            'work_item_id' => $data['work_item_id'] ?? null,
            'part_id' => $data['part_id'],
            'quantity' => $data['quantity'],
            'unit_price' => $data['unit_price'],
            'used_at' => now(),
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | 9. Review & Test (sub-state UI, không đổi cột status) + Hoàn thành
    |--------------------------------------------------------------------------
    */
    public function logReviewAndTest(RepairOrder $ro, ?Account $actor, ?string $note = null): void
    {
        if ($ro->status !== RepairOrder::IN_PROGRESS) {
            throw InvalidStatusTransitionException::because('Chỉ ghi nhận Review & Test khi phiếu đang IN_PROGRESS.');
        }

        if ($this->hasUnfinishedWorkItems($ro)) {
            throw InvalidStatusTransitionException::because('Còn hạng mục công việc chưa hoàn thành, chưa thể Review & Test.');
        }

        $this->logHistory($ro, RepairOrder::REVIEW_TEST, $actor, $note ?? 'Kiểm tra lại / chạy thử trước khi bàn giao.');
    }

    public function completeRepairOrder(RepairOrder $ro, ?Account $actor, ?string $note = null): RepairOrder
    {
        if ($this->hasUnfinishedWorkItems($ro)) {
            throw InvalidStatusTransitionException::because('Còn hạng mục công việc chưa hoàn thành (PENDING/IN_PROGRESS).');
        }

        $this->transition($ro, RepairOrder::COMPLETED, $actor, $note ?? 'Hoàn tất toàn bộ công việc sửa chữa.');

        return $ro;
    }

    private function hasUnfinishedWorkItems(RepairOrder $ro): bool
    {
        return $ro->workItems()->whereIn('status', [WorkItem::PENDING, WorkItem::IN_PROGRESS])->exists();
    }

    /*
    |--------------------------------------------------------------------------
    | 10. Đóng phiếu (khách không tiếp tục)
    |--------------------------------------------------------------------------
    */
    public function closeRepairOrder(RepairOrder $ro, string $reason, string $note, ?Account $actor): RepairOrder
    {
        if (! in_array($reason, RepairOrder::CLOSE_REASONS, true)) {
            throw InvalidStatusTransitionException::because('close_reason không hợp lệ.');
        }

        $ro->close_reason = $reason;
        $this->transition($ro, RepairOrder::CLOSED, $actor, $note);

        return $ro;
    }

    /*
    |--------------------------------------------------------------------------
    | 11. Thanh toán
    |--------------------------------------------------------------------------
    */
    public function generateInvoice(RepairOrder $ro): Invoice
    {
        if ($ro->status !== RepairOrder::COMPLETED) {
            throw InvalidStatusTransitionException::because('Chỉ xuất hóa đơn khi Phiếu sửa chữa đã COMPLETED.');
        }

        if ($ro->invoice) {
            throw InvalidStatusTransitionException::because('Phiếu sửa chữa này đã có hóa đơn.');
        }

        return DB::transaction(function () use ($ro) {
            $invoice = Invoice::create([
                'repair_order_id' => $ro->id,
                'invoice_code' => $this->generateCode('INV'),
                'status' => Invoice::UNPAID,
            ]);

            $quotation = $ro->latestQuotation;
            $approvedItems = $quotation ? $quotation->items()->where('is_approved', true)->get() : collect();

            foreach ($approvedItems as $item) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'item_type' => $item->item_type,
                    'service_id' => $item->service_id,
                    'part_id' => $item->part_id,
                    'description' => $item->description,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'amount' => $item->amount,
                ]);
            }

            $subtotal = $invoice->items()->sum('amount');
            $invoice->subtotal = $subtotal;
            $invoice->total_amount = $subtotal - $invoice->discount_amount;
            $invoice->save();

            return $invoice->load('items');
        });
    }

    /**
     * DIRECT => coi như thu tiền ngay tại quầy, đánh SUCCESS luôn.
     * QR     => chờ cổng thanh toán xác nhận, tạo ở trạng thái PENDING.
     */
    public function recordPayment(Invoice $invoice, string $method, float $amount): Payment
    {
        if (! in_array($method, [Payment::DIRECT, Payment::QR], true)) {
            throw InvalidStatusTransitionException::because('Phương thức thanh toán phải là DIRECT hoặc QR.');
        }

        return DB::transaction(function () use ($invoice, $method, $amount) {
            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'amount' => $amount,
                'payment_method' => $method,
                'qr_reference' => $method === Payment::QR ? Str::upper(Str::random(12)) : null,
                'status' => $method === Payment::DIRECT ? Payment::SUCCESS : Payment::PENDING,
                'paid_at' => $method === Payment::DIRECT ? now() : null,
            ]);

            $this->refreshInvoiceStatus($invoice);

            return $payment;
        });
    }

    /**
     * Webhook / xác nhận thủ công khi cổng thanh toán QR báo kết quả.
     */
    public function confirmQrPayment(Payment $payment, bool $success, ?string $transactionCode = null): Payment
    {
        if ($payment->payment_method !== Payment::QR) {
            throw InvalidStatusTransitionException::because('Chỉ xác nhận cho giao dịch QR.');
        }

        if ($payment->status !== Payment::PENDING) {
            throw InvalidStatusTransitionException::because('Giao dịch này không còn ở trạng thái PENDING.');
        }

        return DB::transaction(function () use ($payment, $success, $transactionCode) {
            $payment->status = $success ? Payment::SUCCESS : Payment::FAILED;
            $payment->transaction_code = $transactionCode;
            $payment->paid_at = $success ? now() : null;
            $payment->save();

            $this->refreshInvoiceStatus($payment->invoice);

            return $payment;
        });
    }

    private function refreshInvoiceStatus(Invoice $invoice): void
    {
        $invoice->refresh();
        $paid = (float) $invoice->totalPaid();

        $invoice->status = match (true) {
            $paid <= 0 => Invoice::UNPAID,
            $paid < (float) $invoice->total_amount => Invoice::PARTIALLY_PAID,
            default => Invoice::PAID,
        };
        $invoice->save();
    }

    /*
    |--------------------------------------------------------------------------
    | 12. Bàn giao xe
    |--------------------------------------------------------------------------
    */
    public function handOver(RepairOrder $ro, ?Account $actor): RepairOrder
    {
        $invoice = $ro->invoice;

        if (! $invoice || $invoice->status !== Invoice::PAID) {
            throw InvalidStatusTransitionException::because('Chỉ bàn giao xe khi hóa đơn đã thanh toán đủ (PAID).');
        }

        $this->transition($ro, RepairOrder::HANDED_OVER, $actor, 'Đã bàn giao xe cho khách.');

        return $ro;
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers dùng chung
    |--------------------------------------------------------------------------
    */
    private function transition(RepairOrder $ro, string $to, ?Account $actor, ?string $note = null): void
    {
        if (! $ro->canTransitionTo($to)) {
            throw InvalidStatusTransitionException::forRepairOrder($ro->status, $to);
        }

        $ro->status = $to;

        match ($to) {
            RepairOrder::COMPLETED => $ro->completed_at = now(),
            RepairOrder::HANDED_OVER => $ro->handed_over_at = now(),
            RepairOrder::CLOSED => $ro->closed_at = now(),
            default => null,
        };

        $ro->save();

        $this->logHistory($ro, $to, $actor, $note);
    }

    private function logHistory(RepairOrder $ro, string $status, ?Account $actor, ?string $note = null): void
    {
        RepairOrderStatusHistory::create([
            'repair_order_id' => $ro->id,
            'status' => $status,
            'changed_by_account_id' => $actor?->id,
            'note' => $note,
        ]);
    }

    private function assertAdvisor(Employee $employee): void
    {
        if (! $employee->isAdvisor()) {
            throw InvalidStatusTransitionException::because('Thao tác này chỉ dành cho Cố vấn (ADVISOR).');
        }
    }

    private function assertTechnician(TechnicianProfile $technician): void
    {
        if (! $technician->isTechnician()) {
            throw InvalidStatusTransitionException::because('Nhân viên được chọn không có tài khoản vai trò TECHNICIAN.');
        }
    }

    private function assertRecommendationIsWellFormed(array $rec): void
    {
        if (! in_array($rec['item_type'] ?? null, [InspectionRecommendation::TYPE_SERVICE, InspectionRecommendation::TYPE_PART], true)) {
            throw InvalidStatusTransitionException::because('item_type của đề xuất phải là SERVICE hoặc PART.');
        }

        if ($rec['item_type'] === InspectionRecommendation::TYPE_SERVICE && empty($rec['service_id'])) {
            throw InvalidStatusTransitionException::because('Đề xuất SERVICE phải có service_id.');
        }

        if ($rec['item_type'] === InspectionRecommendation::TYPE_PART && empty($rec['part_id'])) {
            throw InvalidStatusTransitionException::because('Đề xuất PART phải có part_id.');
        }
    }

    private function generateCode(string $prefix): string
    {
        return sprintf('%s-%s-%s', $prefix, now()->format('Y'), Str::upper(Str::random(6)));
    }
}
