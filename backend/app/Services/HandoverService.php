<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\HandoverChecklistItem;
use App\Models\MediaAttachment;
use App\Models\RepairOrder;
use App\Models\VehicleHandover;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Biên bản giao nhận xe (P2: CHECK_IN). DRAFT sửa được → submit: chụp snapshot + SHA-256, khóa nội dung
 * → khách xác nhận (ConfirmationService) → CONFIRMED. Hủy (VOID) chỉ khi chưa xác nhận, bắt buộc lý do.
 */
class HandoverService
{
    public function __construct(private readonly ConfirmationService $confirmations) {}

    public function create(RepairOrder $order, string $type, array $data, Employee $staff): VehicleHandover
    {
        if (in_array($order->status, [RepairOrder::HANDED_OVER, RepairOrder::CLOSED], true)) {
            throw ValidationException::withMessages(['repair_order' => 'Phiếu đã kết thúc, không lập biên bản.']);
        }

        return DB::transaction(function () use ($order, $type, $data, $staff): VehicleHandover {
            $active = VehicleHandover::query()->where('repair_order_id', $order->id)->where('type', $type)
                ->whereIn('status', [VehicleHandover::STATUS_DRAFT, VehicleHandover::STATUS_SUBMITTED, VehicleHandover::STATUS_CONFIRMED])
                ->lockForUpdate()->first();
            if ($active) {
                throw ValidationException::withMessages(['type' => "Phiếu đã có biên bản {$type} (trạng thái {$active->status}). Hủy bản đó trước khi lập bản mới."]);
            }

            $handover = VehicleHandover::query()->create([
                ...$this->headerFields($data),
                'repair_order_id' => $order->id,
                'type' => $type,
                'status' => VehicleHandover::STATUS_DRAFT,
                'vehicle_id' => $order->vehicle_id,
                'staff_employee_id' => $staff->id,
            ]);
            $this->replaceItems($handover, $data['items'] ?? []);

            return $handover->load('checklistItems');
        });
    }

    public function update(VehicleHandover $handover, array $data): VehicleHandover
    {
        $this->assertEditable($handover);

        return DB::transaction(function () use ($handover, $data): VehicleHandover {
            $handover->update($this->headerFields($data));
            if (array_key_exists('items', $data)) {
                $this->replaceItems($handover, $data['items'] ?? []);
            }

            return $handover->load('checklistItems');
        });
    }

    /** Khóa nội dung: snapshot gồm thông tin xe, người giao, checklist và hash từng ảnh. */
    public function submit(VehicleHandover $handover): VehicleHandover
    {
        $this->assertEditable($handover);

        return DB::transaction(function () use ($handover): VehicleHandover {
            $handover->load('checklistItems', 'vehicle', 'repairOrder');
            if ($handover->checklistItems->isEmpty()) {
                throw ValidationException::withMessages(['items' => 'Biên bản cần ít nhất một mục kiểm tra.']);
            }
            $snapshot = $this->snapshot($handover);
            $handover->forceFill([
                'status' => VehicleHandover::STATUS_SUBMITTED,
                'snapshot' => $snapshot,
                'snapshot_sha256' => $this->confirmations->hash($snapshot),
                'submitted_at' => now(),
            ])->save();

            return $handover->fresh('checklistItems');
        });
    }

    public function void(VehicleHandover $handover, string $reason): VehicleHandover
    {
        if (! in_array($handover->status, [VehicleHandover::STATUS_DRAFT, VehicleHandover::STATUS_SUBMITTED], true)) {
            throw ValidationException::withMessages(['handover' => 'Biên bản đã được khách xác nhận hoặc đã hủy, không thể hủy.']);
        }
        $handover->forceFill(['status' => VehicleHandover::STATUS_VOID, 'void_reason' => $reason])->save();

        return $handover;
    }

    /** @return array<string, mixed> */
    public function snapshot(VehicleHandover $handover): array
    {
        $media = MediaAttachment::query()
            ->where('attachable_type', VehicleHandover::class)->where('attachable_id', $handover->id)
            ->orderBy('id')->get(['id', 'sha256', 'position_code']);

        return [
            'handover_id' => $handover->id,
            'type' => $handover->type,
            'repair_order_code' => $handover->repairOrder->repair_order_code,
            'vehicle' => ['id' => $handover->vehicle_id, 'license_plate' => $handover->vehicle?->license_plate],
            'mileage' => $handover->mileage,
            'fuel_level' => $handover->fuel_level,
            'general_condition' => $handover->general_condition,
            'valuables_note' => $handover->valuables_note,
            'person' => [
                'name' => $handover->person_name,
                'phone' => $handover->person_phone,
                'id_last4' => $handover->person_id_last4,
                'relation' => $handover->person_relation,
            ],
            'items' => $handover->checklistItems->map(fn (HandoverChecklistItem $item) => [
                'category' => $item->category,
                'position_code' => $item->position_code,
                'label' => $item->label,
                'condition' => $item->condition,
                'quantity' => $item->quantity,
                'note' => $item->note,
            ])->values()->all(),
            'photos' => $media->map(fn ($m) => ['id' => $m->id, 'sha256' => $m->sha256, 'position_code' => $m->position_code])->all(),
        ];
    }

    private function assertEditable(VehicleHandover $handover): void
    {
        if (! $handover->isEditable()) {
            throw ValidationException::withMessages(['handover' => 'Biên bản đã khóa (đã gửi khách hoặc đã xác nhận), không sửa được.']);
        }
    }

    /** @return array<string, mixed> */
    private function headerFields(array $data): array
    {
        return array_intersect_key($data, array_flip([
            'mileage', 'fuel_level', 'general_condition', 'valuables_note',
            'person_name', 'person_phone', 'person_id_last4', 'person_relation',
        ]));
    }

    private function replaceItems(VehicleHandover $handover, array $items): void
    {
        $handover->checklistItems()->delete();
        foreach ($items as $item) {
            $handover->checklistItems()->create([
                'category' => $item['category'],
                'position_code' => $item['position_code'] ?? null,
                'label' => $item['label'],
                'condition' => $item['condition'],
                'quantity' => $item['quantity'] ?? null,
                'note' => $item['note'] ?? null,
                'is_discrepancy' => false,
            ]);
        }
    }
}
