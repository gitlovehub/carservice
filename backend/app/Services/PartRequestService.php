<?php

namespace App\Services;

use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Notification;
use App\Models\PartRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** P6 — xử lý yêu cầu phụ tùng: đặt hàng (ETA), nhận hàng (nhập kho + báo khách), hủy. */
class PartRequestService
{
    public function order(PartRequest $request, ?string $etaDate, ?string $supplierNote): PartRequest
    {
        if (! in_array($request->status, PartRequest::OPEN, true)) {
            throw ValidationException::withMessages(['status' => 'Yêu cầu đã nhận hàng hoặc đã hủy.']);
        }
        $request->update([
            'status' => PartRequest::ORDERED,
            'ordered_at' => $request->ordered_at ?? now(),
            'eta_date' => $etaDate,
            'supplier_note' => $supplierNote ?? $request->supplier_note,
        ]);

        return $request->load('part');
    }

    public function receive(PartRequest $request): PartRequest
    {
        return DB::transaction(function () use ($request): PartRequest {
            $locked = PartRequest::query()->lockForUpdate()->findOrFail($request->id);
            if (! in_array($locked->status, PartRequest::OPEN, true)) {
                throw ValidationException::withMessages(['status' => 'Yêu cầu đã nhận hàng hoặc đã hủy.']);
            }

            $inventory = Inventory::query()->lockForUpdate()->firstOrCreate(['part_id' => $locked->part_id], ['quantity' => 0, 'min_quantity' => 0]);
            $inventory->increment('quantity', $locked->quantity);
            $order = $locked->repairOrder()->with('customer')->first();
            InventoryTransaction::query()->create([
                'inventory_id' => $inventory->id,
                'repair_order_id' => $locked->repair_order_id,
                'transaction_type' => InventoryTransaction::TYPE_IN,
                'quantity' => $locked->quantity,
                'note' => "Nhập kho phụ tùng đặt cho phiếu {$order->repair_order_code} (yêu cầu #{$locked->id}).",
            ]);
            $locked->update(['status' => PartRequest::RECEIVED, 'received_at' => now()]);

            if ($order->customer?->account_id) {
                $partName = $locked->part()->value('name');
                Notification::query()->create([
                    'account_id' => $order->customer->account_id,
                    'repair_order_id' => $order->id,
                    'title' => 'Phụ tùng đã về',
                    'content' => "Phụ tùng {$partName} cho phiếu {$order->repair_order_code} đã về gara. Gara sẽ tiếp tục sửa chữa.",
                    'type' => 'PART_ARRIVED',
                    'channel' => 'WEB',
                    'status' => 'PENDING',
                ]);
            }

            return $locked->load('part');
        });
    }

    public function cancel(PartRequest $request, string $reason): PartRequest
    {
        if (! in_array($request->status, PartRequest::OPEN, true)) {
            throw ValidationException::withMessages(['status' => 'Yêu cầu đã nhận hàng hoặc đã hủy.']);
        }
        $request->update(['status' => PartRequest::CANCELLED, 'cancel_reason' => $reason]);

        return $request->load('part');
    }
}
