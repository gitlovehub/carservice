<?php

namespace App\Services;

use App\Exceptions\InvalidStatusTransitionException;
use App\Models\Account;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Part;
use App\Models\PartRequest;
use App\Models\RepairOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Yêu cầu phụ tùng (P6 + ADV-01 / D-020).
 * Cố vấn chỉ BÁO THIẾU (tự tạo khi khách duyệt mà thiếu hàng, hoặc báo tay kèm lý do).
 * Admin / kho ĐẶT HÀNG (ngày dự kiến về) và NHẬN HÀNG — nhập kho đúng một lần qua yêu cầu.
 */
class PartRequestService
{
    /** Trạng thái phiếu được báo thiếu phụ tùng (đang sửa hoặc đã tạm dừng chờ phụ tùng). */
    public const REPORTABLE_STATUSES = [RepairOrder::IN_PROGRESS, RepairOrder::WAITING_FOR_PARTS];

    public function __construct(private readonly CustomerNotifier $notifier) {}

    /** Cố vấn báo thiếu một phụ tùng cho phiếu (mỗi phụ tùng chỉ một yêu cầu đang mở / phiếu). */
    public function report(RepairOrder $order, int $partId, int $quantity, ?string $note, ?Account $actor): PartRequest
    {
        if (! in_array($order->status, self::REPORTABLE_STATUSES, true)) {
            throw InvalidStatusTransitionException::because('Chỉ báo thiếu phụ tùng khi phiếu đang sửa chữa hoặc đang chờ phụ tùng.');
        }
        $part = Part::query()->findOrFail($partId);
        if ($order->partRequests()->where('part_id', $part->id)->whereIn('status', PartRequest::OPEN)->exists()) {
            throw ValidationException::withMessages(['part_id' => "Đã báo thiếu \"{$part->name}\" cho phiếu này, đang chờ kho xử lý."]);
        }

        return PartRequest::query()->create([
            'repair_order_id' => $order->id,
            'part_id' => $part->id,
            'quantity' => $quantity,
            'request_note' => $note !== null && trim($note) !== '' ? trim($note) : null,
            'status' => PartRequest::REQUESTED,
            'created_by_account_id' => $actor?->id,
        ])->load('part');
    }

    public function order(PartRequest $request, ?string $etaDate, ?string $supplierNote): PartRequest
    {
        $this->assertOpen($request);
        $request->update([
            'status' => PartRequest::ORDERED,
            'ordered_at' => $request->ordered_at ?? now(),
            'eta_date' => $etaDate,
            'supplier_note' => $supplierNote ?? $request->supplier_note,
        ]);

        return $request->load('part');
    }

    /**
     * Hàng về. Mặc định nhập kho số lượng của yêu cầu (một giao dịch IN gắn phiếu).
     * $alreadyInStock: hàng đã được nhập kho bằng phiếu nhập thường → chỉ đóng yêu cầu, KHÔNG cộng kho lần nữa
     * (chặn khi tồn kho hiện tại không đủ số lượng yêu cầu).
     */
    public function receive(PartRequest $request, bool $alreadyInStock = false): PartRequest
    {
        return DB::transaction(function () use ($request, $alreadyInStock): PartRequest {
            $locked = PartRequest::query()->lockForUpdate()->findOrFail($request->id);
            $this->assertOpen($locked);

            $inventory = Inventory::query()->lockForUpdate()->firstOrCreate(['part_id' => $locked->part_id], ['quantity' => 0, 'min_quantity' => 0]);
            $order = $locked->repairOrder()->with('customer')->first();

            if ($alreadyInStock) {
                if ($inventory->quantity < $locked->quantity) {
                    throw ValidationException::withMessages(['status' => "Tồn kho chỉ còn {$inventory->quantity}, chưa đủ {$locked->quantity} cho yêu cầu này. Hãy nhập kho qua yêu cầu."]);
                }
            } else {
                $inventory->increment('quantity', $locked->quantity);
                InventoryTransaction::query()->create([
                    'inventory_id' => $inventory->id,
                    'repair_order_id' => $locked->repair_order_id,
                    'transaction_type' => InventoryTransaction::TYPE_IN,
                    'quantity' => $locked->quantity,
                    'note' => "Nhập kho phụ tùng đặt cho phiếu {$order->repair_order_code} (yêu cầu #{$locked->id}).",
                    'created_by_account_id' => auth()->id(),
                ]);
            }
            $locked->update(['status' => PartRequest::RECEIVED, 'received_at' => now()]);

            $this->notifier->partArrived($order, (string) $locked->part()->value('name'));

            return $locked->load('part');
        });
    }

    public function cancel(PartRequest $request, string $reason): PartRequest
    {
        $this->assertOpen($request);
        $request->update(['status' => PartRequest::CANCELLED, 'cancel_reason' => $reason]);

        return $request->load('part');
    }

    private function assertOpen(PartRequest $request): void
    {
        if (! in_array($request->status, PartRequest::OPEN, true)) {
            throw ValidationException::withMessages(['status' => 'Yêu cầu đã nhận hàng hoặc đã hủy.']);
        }
    }
}
