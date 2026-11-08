<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\HandoverChecklistItem;
use App\Models\MediaAttachment;
use App\Models\PickupAuthorization;
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
                // CHECK_OUT đối chiếu với biên bản nhận xe đã xác nhận.
                'compared_handover_id' => $type === VehicleHandover::TYPE_CHECK_OUT ? $order->confirmedCheckIn()->value('id') : null,
                'pickup_authorization_id' => $type === VehicleHandover::TYPE_CHECK_OUT ? ($data['pickup_authorization_id'] ?? null) : null,
            ]);
            if ($type === VehicleHandover::TYPE_CHECK_OUT) {
                $this->assertRecipient($handover);
            }
            $this->replaceItems($handover, $data['items'] ?? []);

            return $handover->load('checklistItems');
        });
    }

    public function update(VehicleHandover $handover, array $data): VehicleHandover
    {
        $this->assertEditable($handover);

        return DB::transaction(function () use ($handover, $data): VehicleHandover {
            $handover->update([
                ...$this->headerFields($data),
                ...($handover->type === VehicleHandover::TYPE_CHECK_OUT && array_key_exists('pickup_authorization_id', $data)
                    ? ['pickup_authorization_id' => $data['pickup_authorization_id']] : []),
            ]);
            if ($handover->type === VehicleHandover::TYPE_CHECK_OUT) {
                $this->assertRecipient($handover->refresh());
            }
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
            if ($handover->type === VehicleHandover::TYPE_CHECK_OUT) {
                $this->assertRecipient($handover);
                $this->markDiscrepancies($handover);
                $handover->load('checklistItems');
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
                'pickup_authorization_id' => $handover->pickup_authorization_id,
            ],
            'compared_handover_id' => $handover->compared_handover_id,
            'items' => $handover->checklistItems->map(fn (HandoverChecklistItem $item) => [
                'category' => $item->category,
                'position_code' => $item->position_code,
                'label' => $item->label,
                'condition' => $item->condition,
                'quantity' => $item->quantity,
                'note' => $item->note,
                'is_discrepancy' => $item->is_discrepancy,
            ])->values()->all(),
            'photos' => $media->map(fn ($m) => ['id' => $m->id, 'sha256' => $m->sha256, 'position_code' => $m->position_code])->all(),
        ];
    }

    /**
     * Người nhận xe (N9): chủ xe, hoặc người chủ xe đã ủy quyền trong tài khoản (còn hiệu lực, cùng phiếu)
     * và 4 số cuối giấy tờ khớp. Không giao cho người không có ủy quyền.
     */
    private function assertRecipient(VehicleHandover $handover): void
    {
        if ($handover->person_relation === 'OWNER') {
            if ($handover->pickup_authorization_id) {
                throw ValidationException::withMessages(['pickup_authorization_id' => 'Chủ xe nhận xe thì không chọn ủy quyền.']);
            }

            return;
        }
        if ($handover->person_relation !== 'AUTHORIZED') {
            throw ValidationException::withMessages(['person_relation' => 'Chỉ giao xe cho chủ xe hoặc người được chủ xe ủy quyền.']);
        }
        $authorization = $handover->pickup_authorization_id ? PickupAuthorization::query()->find($handover->pickup_authorization_id) : null;
        if (! $authorization || (int) $authorization->repair_order_id !== (int) $handover->repair_order_id || ! $authorization->isUsable()) {
            throw ValidationException::withMessages(['pickup_authorization_id' => 'Không có ủy quyền nhận xe còn hiệu lực cho phiếu này.']);
        }
        if (! hash_equals($authorization->id_last4, (string) $handover->person_id_last4)) {
            throw ValidationException::withMessages(['person_id_last4' => '4 số cuối giấy tờ không khớp với ủy quyền chủ xe đã khai báo.']);
        }
        // Thông tin người nhận lấy theo ủy quyền, không theo nhập tay.
        $handover->forceFill(['person_name' => $authorization->full_name, 'person_phone' => $authorization->phone])->save();
    }

    /** Đánh dấu mục khác với biên bản nhận xe (cùng nhãn, khác tình trạng; hoặc mục mới không có lúc nhận). */
    private function markDiscrepancies(VehicleHandover $handover): void
    {
        $checkIn = $handover->compared_handover_id
            ? HandoverChecklistItem::query()->where('vehicle_handover_id', $handover->compared_handover_id)->get()
                ->keyBy(fn ($item) => mb_strtolower(trim($item->label)))
            : collect();
        foreach ($handover->checklistItems as $item) {
            $before = $checkIn->get(mb_strtolower(trim($item->label)));
            $item->update(['is_discrepancy' => $checkIn->isNotEmpty() && (! $before || $before->condition !== $item->condition || (int) $before->quantity !== (int) $item->quantity)]);
        }
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
