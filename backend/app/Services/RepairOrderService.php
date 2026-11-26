<?php

namespace App\Services;

use App\Exceptions\InvalidStatusTransitionException;
use App\Models\Account;
use App\Models\Appointment;
use App\Models\Assignment;
use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\Inspection;
use App\Models\InspectionItem;
use App\Models\InspectionRecommendation;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\MediaAttachment;
use App\Models\Part;
use App\Models\PartRequest;
use App\Models\Payment;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\RepairOrder;
use App\Models\RepairOrderStatusHistory;
use App\Models\Service;
use App\Models\TechnicianProfile;
use App\Models\UsedPart;
use App\Models\Vehicle;
use App\Models\VehicleHandover;
use App\Models\WorkItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RepairOrderService
{
    /** Mỗi bước khách cần biết (báo giá, sửa, hóa đơn, thanh toán, bàn giao) → thông báo chuông qua CustomerNotifier. */
    public function __construct(
        private readonly CustomerNotifier $notifier,
        private readonly PartRequestService $partRequests,
    ) {}

    /*
    |--------------------------------------------------------------------------
    | 1. Tiếp nhận xe
    |--------------------------------------------------------------------------
    */
    public function receive(array $data, Employee $advisor): RepairOrder
    {
        $this->assertAdvisor($advisor);

        return DB::transaction(function () use ($data, $advisor) {
            $vehicle = Vehicle::query()->lockForUpdate()->find($data['vehicle_id']);

            if (! $vehicle || (int) $vehicle->customer_id !== (int) $data['customer_id']) {
                throw InvalidStatusTransitionException::because('Xe không thuộc khách hàng đã chọn.');
            }

            $bookedVehicleId = null;
            if (! empty($data['appointment_id'])) {
                $bookedVehicleId = $this->assertAppointmentReadyForReceiving((int) $data['appointment_id'], $data);
            }
            $vehicleChanged = $bookedVehicleId !== null && $bookedVehicleId !== (int) $vehicle->id;
            $changeReason = trim((string) ($data['vehicle_change_reason'] ?? ''));
            if ($vehicleChanged && mb_strlen($changeReason) < 5) {
                throw InvalidStatusTransitionException::because('Xe mang tới khác xe trong lịch hẹn: nhập lý do đổi xe (ít nhất 5 ký tự).');
            }

            $openOrder = RepairOrder::query()
                ->where('vehicle_id', $vehicle->id)
                ->whereNotIn('status', [RepairOrder::HANDED_OVER, RepairOrder::CLOSED])
                ->first();

            if ($openOrder) {
                throw InvalidStatusTransitionException::because(
                    "Xe đang có phiếu sửa chữa {$openOrder->repair_order_code} chưa kết thúc, không tạo phiếu mới."
                );
            }

            $ro = RepairOrder::create([
                'repair_order_code' => $this->generateCode('RO'),
                'appointment_id' => $data['appointment_id'] ?? null,
                'customer_id' => $data['customer_id'],
                'vehicle_id' => $data['vehicle_id'],
                'advisor_id' => $advisor->id,
                'mileage_received' => $data['mileage_received'] ?? null,
                'initial_condition' => $data['initial_condition'] ?? null,
                'customer_request' => $data['customer_request'] ?? null,
                'status' => RepairOrder::RECEIVED,
                'received_at' => now(),
                'source' => empty($data['appointment_id']) ? RepairOrder::SOURCE_WALK_IN : RepairOrder::SOURCE_APPOINTMENT,
                'booked_vehicle_id' => $vehicleChanged ? $bookedVehicleId : null,
                'vehicle_change_reason' => $vehicleChanged ? $changeReason : null,
                // Phiếu mới phải có biên bản CHECK_IN được khách xác nhận trước khi kiểm tra (P2).
                'requires_check_in' => true,
            ]);

            $this->logHistory($ro, RepairOrder::RECEIVED, null, $vehicleChanged
                ? "Tiếp nhận xe (đổi xe so với lịch hẹn: {$changeReason})."
                : 'Tiếp nhận xe.');

            if ($vehicleChanged) {
                AuditLog::query()->create([
                    'account_id' => $advisor->account_id,
                    'action' => 'repair_order.vehicle_changed',
                    'auditable_type' => RepairOrder::class,
                    'auditable_id' => $ro->id,
                    'old_values' => ['vehicle_id' => $bookedVehicleId],
                    'new_values' => ['vehicle_id' => (int) $vehicle->id],
                    'reason' => $changeReason,
                    'ip_address' => request()->ip(),
                    'user_agent' => substr((string) request()->userAgent(), 0, 1000),
                ]);
            }

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

        if (in_array($ro->status, [RepairOrder::COMPLETED, RepairOrder::HANDED_OVER, RepairOrder::CLOSED], true)) {
            throw InvalidStatusTransitionException::because("Không thể giao KTV khi phiếu đang {$ro->status}.");
        }

        if ($ro->assignments()->where('technician_id', $technician->id)->exists()) {
            throw InvalidStatusTransitionException::because('KTV này đã được giao cho phiếu sửa chữa.');
        }

        return DB::transaction(function () use ($ro, $technician, $actor, $note) {
            $assignment = Assignment::create([
                'repair_order_id' => $ro->id,
                'technician_id' => $technician->id,
                'status' => Assignment::ASSIGNED,
                'note' => $note,
                'assigned_at' => now(),
            ]);

            if ($ro->status === RepairOrder::RECEIVED) {
                $this->assertCheckInConfirmed($ro);
                $this->transition($ro, RepairOrder::INSPECTING, $actor, 'Giao KTV kiểm tra/chẩn đoán.');
            }

            return $assignment;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 3. Ghi nhận kết quả kiểm tra / chẩn đoán (KTV hoặc Cố vấn nhập)
    |--------------------------------------------------------------------------
    | $data = [
    |   'condition_description' => ..., 'diagnosis' => ...,
    |   'items' => [['item_name','condition_status','condition_description','note'], ...],
    |   'recommendations' => [['item_type','service_id'|'part_id','quantity','note'], ...],
    | ]
    */
    public function recordInspection(RepairOrder $ro, ?TechnicianProfile $technician, array $data, ?Employee $recordedBy = null): Inspection
    {
        if ($technician) {
            $this->assertTechnician($technician);
        }

        if (! in_array($ro->status, [RepairOrder::RECEIVED, RepairOrder::INSPECTING], true)) {
            throw InvalidStatusTransitionException::because(
                'Chỉ ghi nhận kiểm tra khi Phiếu sửa chữa đang RECEIVED hoặc INSPECTING.'
            );
        }

        if ($ro->inspections()->exists()) {
            throw InvalidStatusTransitionException::because(
                'Mỗi lệnh sửa chữa chỉ thuộc về 1 phiếu kiểm tra tổng thể.'
            );
        }

        if ($ro->status === RepairOrder::RECEIVED) {
            $this->assertCheckInConfirmed($ro);
        }

        return DB::transaction(function () use ($ro, $technician, $data, $recordedBy) {
            $inspection = Inspection::create([
                'repair_order_id' => $ro->id,
                'technician_id' => $technician?->id,
                'recorded_by_employee_id' => $recordedBy?->id,
                'condition_description' => $data['condition_description'] ?? null,
                'diagnosis' => $data['diagnosis'] ?? null,
                'inspected_at' => null,
            ]);

            $items = $data['inspection_items'] ?? $data['items'] ?? [];
            foreach ($items as $item) {
                InspectionItem::create([
                    'inspection_id' => $inspection->id,
                    'item_name' => $item['item_name'],
                    'condition_status' => $item['status'] ?? $item['condition_status'] ?? null,
                    'condition_description' => $item['condition_description'] ?? null,
                    'note' => $item['note'] ?? null,
                ]);
            }

            $this->assertNoDuplicateRecommendations($data['recommendations'] ?? []);
            foreach ($data['recommendations'] ?? [] as $rec) {
                $this->assertRecommendationIsWellFormed($rec);
                $this->assertRecommendedServiceIsActive($rec);

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
                $this->logHistory($ro, RepairOrder::INSPECTING, $recordedBy?->account, 'Bắt đầu kiểm tra xe.');
            }

            return $inspection->load(['items', 'recommendations.service', 'recommendations.part', 'technician.employee']);
        });
    }

    /**
     * Thêm đề xuất. Chẩn đoán đã hoàn tất → "bổ sung" (PO 19/11/2026): chỉ khi chưa bắt đầu sửa (đang lập báo giá /
     * chờ khách duyệt — đã sửa thì dùng báo giá phát sinh), bắt buộc lý do, ghi vết người bổ sung.
     */
    public function addInspectionRecommendation(Inspection $inspection, array $rec, ?Account $actor = null): InspectionRecommendation
    {
        $this->assertRecommendationIsWellFormed($rec);
        $this->assertRecommendedServiceIsActive($rec);
        // Đã có đề xuất cùng dịch vụ / phụ tùng → không thêm dòng trùng (lô nhiều dòng: dòng sau gặp dòng trước vừa lưu).
        $existing = $inspection->recommendations()->get(['item_type', 'service_id', 'part_id'])->map(fn ($r) => $r->only(['item_type', 'service_id', 'part_id']))->all();
        $this->assertNoDuplicateRecommendations([...$existing, $rec]);

        $afterCompletion = $inspection->inspected_at !== null;
        if ($afterCompletion) {
            $status = $inspection->repairOrder()->value('status');
            if (! in_array($status, [RepairOrder::QUOTING, RepairOrder::WAITING_APPROVAL], true)) {
                throw InvalidStatusTransitionException::because('Chỉ bổ sung đề xuất khi phiếu đang lập báo giá hoặc chờ khách duyệt. Đã bắt đầu sửa thì lập báo giá phát sinh.');
            }
            if (mb_strlen(trim((string) ($rec['note'] ?? ''))) < 5) {
                throw InvalidStatusTransitionException::because('Đề xuất bổ sung cần ghi lý do (ít nhất 5 ký tự).');
            }
        }

        return InspectionRecommendation::create([
            'inspection_id' => $inspection->id,
            'item_type' => $rec['item_type'],
            'service_id' => $rec['item_type'] === InspectionRecommendation::TYPE_SERVICE ? $rec['service_id'] : null,
            'part_id' => $rec['item_type'] === InspectionRecommendation::TYPE_PART ? $rec['part_id'] : null,
            'quantity' => $rec['quantity'] ?? 1,
            'note' => isset($rec['note']) ? trim((string) $rec['note']) : null,
            'added_after_completion' => $afterCompletion,
            'added_by_account_id' => $afterCompletion ? $actor?->id : null,
        ])->load(['service', 'part']);
    }

    public function completeInspection(RepairOrder $ro, ?Account $actor): Inspection
    {
        $inspection = $ro->inspections()->latest()->first();

        if (! $inspection) {
            throw InvalidStatusTransitionException::because(
                'Lệnh sửa chữa này chưa có phiếu kiểm tra để hoàn tất.'
            );
        }

        return DB::transaction(function () use ($ro, $inspection, $actor) {
            $inspection->inspected_at = now();
            $inspection->save();

            if ($ro->status === RepairOrder::INSPECTING) {
                $this->transition($ro, RepairOrder::QUOTING, $actor, 'Hoàn tất chẩn đoán, chuyển sang lập báo giá.');
            }

            return $inspection->load(['items', 'recommendations.service', 'recommendations.part', 'technician.employee']);
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
        ?string $validUntil = null,
        string $type = Quotation::TYPE_INITIAL,
        ?string $reason = null,
        bool $staysOvernight = false,
    ): Quotation {
        $this->assertAdvisor($advisor);

        $parentId = null;
        if ($type === Quotation::TYPE_SUPPLEMENT) {
            // P3: phát sinh khi đang sửa — cộng thêm vào báo giá gốc, khách duyệt riêng từng dòng.
            if (! in_array($ro->status, [RepairOrder::IN_PROGRESS, RepairOrder::WAITING_FOR_PARTS], true)) {
                throw InvalidStatusTransitionException::because('Chỉ lập báo giá phát sinh khi phiếu đang sửa chữa hoặc chờ phụ tùng.');
            }
            if (mb_strlen(trim((string) $reason)) < 5) {
                throw InvalidStatusTransitionException::because('Báo giá phát sinh cần lý do (ít nhất 5 ký tự).');
            }
            if ($discountAmount > 0) {
                // Chưa có quy tắc giảm giá cho phát sinh được duyệt: không cho phép để không đổi cách tính tiền.
                throw InvalidStatusTransitionException::because('Báo giá phát sinh không áp dụng giảm giá.');
            }
            if ($ro->supplementQuotations()->whereIn('status', [Quotation::DRAFT, Quotation::SENT])->exists()) {
                throw InvalidStatusTransitionException::because('Đang có báo giá phát sinh chưa được khách trả lời. Xử lý xong trước khi lập bản mới.');
            }
            $parentId = $ro->latestQuotation()->value('id');
            if (! $parentId) {
                throw InvalidStatusTransitionException::because('Chưa có báo giá gốc để lập phát sinh.');
            }
        } elseif (! in_array($ro->status, [RepairOrder::INSPECTING, RepairOrder::QUOTING, RepairOrder::WAITING_APPROVAL], true)) {
            throw InvalidStatusTransitionException::because(
                'Chỉ lập báo giá khi Phiếu sửa chữa đang INSPECTING, QUOTING (báo giá đầu) hoặc WAITING_APPROVAL (báo giá lại).'
            );
        }

        // Phát sinh: phụ tùng mới phát hiện khi đang sửa không cần có trong đề xuất chẩn đoán (PO 22/11/2026).
        $recommendedPartIds = $type === Quotation::TYPE_SUPPLEMENT ? null : $this->recommendedPartIds($ro);
        $serviceIdsOnOrder = $this->serviceIdsOnOrder($ro);

        return DB::transaction(function () use ($ro, $advisor, $itemsInput, $discountAmount, $validUntil, $recommendedPartIds, $serviceIdsOnOrder, $type, $reason, $parentId, $staysOvernight) {
            $nextVersion = (int) $ro->quotations()->max('version') + 1;

            $quotation = Quotation::create([
                'quotation_code' => $this->generateCode('QT'),
                'repair_order_id' => $ro->id,
                'advisor_id' => $advisor->id,
                'version' => $nextVersion,
                'type' => $type,
                'parent_quotation_id' => $parentId,
                'reason' => $type === Quotation::TYPE_SUPPLEMENT ? trim((string) $reason) : null,
                'stays_overnight' => $staysOvernight,
                'discount_amount' => $discountAmount,
                'status' => Quotation::DRAFT,
                'valid_until' => $validUntil,
            ]);

            $this->addQuotationItems($quotation, $itemsInput, $recommendedPartIds, $serviceIdsOnOrder);
            $quotation->recalculateTotals();
            $this->assertDiscountWithinSubtotal($quotation);

            return $quotation->load('items');
        });
    }

    /**
     * Sửa báo giá NHÁP (chưa gửi khách): thay toàn bộ dòng + giảm giá. Cùng quy tắc với lập mới
     * (báo giá gốc: phụ tùng phải có trong đề xuất chẩn đoán; phát sinh không giảm giá). Đã gửi khách thì không sửa — lập báo giá mới.
     *
     * @param  list<array<string, mixed>>  $itemsInput
     */
    public function updateDraftQuotation(Quotation $quotation, Employee $advisor, array $itemsInput, float $discountAmount = 0, ?bool $staysOvernight = null): Quotation
    {
        $this->assertAdvisor($advisor);
        if ($quotation->status !== Quotation::DRAFT) {
            throw InvalidStatusTransitionException::because('Chỉ sửa được báo giá nháp (chưa gửi khách). Báo giá đã gửi cần lập báo giá mới.');
        }
        if ($quotation->type === Quotation::TYPE_SUPPLEMENT && $discountAmount > 0) {
            throw InvalidStatusTransitionException::because('Báo giá phát sinh không áp dụng giảm giá.');
        }
        $repairOrder = $quotation->repairOrder()->firstOrFail();
        $recommendedPartIds = $quotation->type === Quotation::TYPE_SUPPLEMENT ? null : $this->recommendedPartIds($repairOrder);
        $serviceIdsOnOrder = $this->serviceIdsOnOrder($repairOrder);

        return DB::transaction(function () use ($quotation, $itemsInput, $discountAmount, $recommendedPartIds, $serviceIdsOnOrder, $staysOvernight): Quotation {
            $locked = Quotation::query()->lockForUpdate()->findOrFail($quotation->id);
            if ($locked->status !== Quotation::DRAFT) {
                throw InvalidStatusTransitionException::because('Báo giá vừa được gửi khách, không sửa được nữa.');
            }
            $locked->items()->delete();
            $locked->update(['discount_amount' => $discountAmount, 'stays_overnight' => $staysOvernight ?? $locked->stays_overnight]);
            $this->addQuotationItems($locked, $itemsInput, $recommendedPartIds, $serviceIdsOnOrder);
            $locked->recalculateTotals();
            $this->assertDiscountWithinSubtotal($locked);

            return $locked->load('items');
        });
    }

    /** Giảm giá không được lớn hơn tổng các dòng (tổng báo giá không âm). Ném lỗi trong transaction → không lưu gì. */
    private function assertDiscountWithinSubtotal(Quotation $quotation): void
    {
        if ((float) $quotation->total_amount < 0) {
            throw InvalidStatusTransitionException::because('Giảm giá không được lớn hơn tổng tiền các hạng mục báo giá.');
        }
    }

    /** @return list<int> Phụ tùng đã có trong đề xuất kiểm tra / chẩn đoán của phiếu. */
    private function recommendedPartIds(RepairOrder $ro): array
    {
        return InspectionRecommendation::query()
            ->whereHas('inspection', fn ($q) => $q->where('repair_order_id', $ro->id))
            ->where('item_type', InspectionRecommendation::TYPE_PART)
            ->pluck('part_id')
            ->all();
    }

    /**
     * Dịch vụ đã có trên phiếu (đề xuất hoặc báo giá): vẫn được báo giá lại dù vừa bị ngừng, để phiếu đang chạy không kẹt.
     *
     * @return list<int>
     */
    private function serviceIdsOnOrder(RepairOrder $ro): array
    {
        $recommended = InspectionRecommendation::query()
            ->whereHas('inspection', fn ($q) => $q->where('repair_order_id', $ro->id))
            ->whereNotNull('service_id')
            ->pluck('service_id');
        $quoted = QuotationItem::query()
            ->whereHas('quotation', fn ($q) => $q->where('repair_order_id', $ro->id))
            ->whereNotNull('service_id')
            ->pluck('service_id');

        return $recommended->merge($quoted)->map(fn ($id): int => (int) $id)->unique()->values()->all();
    }

    /**
     * @param  list<array<string, mixed>>  $itemsInput
     * @param  list<int>|null  $recommendedPartIds  null = báo giá phát sinh, chỉ cần phụ tùng đang kinh doanh.
     * @param  list<int>  $serviceIdsOnOrder  Dịch vụ đã có trên phiếu, được giữ lại dù đã ngừng.
     */
    private function addQuotationItems(Quotation $quotation, array $itemsInput, ?array $recommendedPartIds, array $serviceIdsOnOrder): void
    {
        // Không cho 2 dòng cùng một dịch vụ / phụ tùng — muốn nhiều hơn thì tăng số lượng của dòng đó.
        $keys = array_map(fn (array $item) => $item['item_type'].':'.($item['item_type'] === QuotationItem::TYPE_PART ? $item['part_id'] : $item['service_id']), $itemsInput);
        if (count($keys) !== count(array_unique($keys))) {
            throw InvalidStatusTransitionException::because('Báo giá có hạng mục bị trùng. Gộp lại một dòng và tăng số lượng.');
        }

        foreach ($itemsInput as $item) {
            if ($item['item_type'] === QuotationItem::TYPE_PART
                && $recommendedPartIds !== null
                && ! in_array($item['part_id'], $recommendedPartIds, true)) {
                throw InvalidStatusTransitionException::because(
                    'Phụ tùng chỉ được thêm vào báo giá sau khi đã có trong đề xuất kiểm tra/chẩn đoán.'
                );
            }

            $catalogItem = $item['item_type'] === QuotationItem::TYPE_PART
                ? Part::query()->find($item['part_id'])
                : Service::query()->find($item['service_id']);
            if ($item['item_type'] === QuotationItem::TYPE_PART && $recommendedPartIds === null && $catalogItem?->status !== 'ACTIVE') {
                throw InvalidStatusTransitionException::because('Phụ tùng này đã ngừng kinh doanh, không đưa vào báo giá phát sinh được.');
            }
            if ($item['item_type'] === QuotationItem::TYPE_SERVICE && $catalogItem?->status !== 'ACTIVE'
                && ! in_array((int) $item['service_id'], $serviceIdsOnOrder, true)) {
                throw InvalidStatusTransitionException::because("Dịch vụ “{$catalogItem?->name}” đã ngừng áp dụng, không thêm vào báo giá được.");
            }
            $catalogPrice = $item['item_type'] === QuotationItem::TYPE_PART
                ? $catalogItem?->sell_price
                : $catalogItem?->base_price;

            $unitPrice = (float) ($item['unit_price'] ?? $catalogPrice ?? 0);
            $quantity = (int) ($item['quantity'] ?? 1);

            QuotationItem::create([
                'quotation_id' => $quotation->id,
                'item_type' => $item['item_type'],
                'service_id' => $item['item_type'] === QuotationItem::TYPE_SERVICE ? $item['service_id'] : null,
                'part_id' => $item['item_type'] === QuotationItem::TYPE_PART ? $item['part_id'] : null,
                'description' => $item['description'] ?? $catalogItem?->name ?? '',
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'amount' => $unitPrice * $quantity,
                'is_required' => (bool) ($item['is_required'] ?? false),
                'required_reason' => ($item['is_required'] ?? false) ? (trim((string) ($item['required_reason'] ?? '')) ?: null) : null,
            ]);
        }
    }

    /**
     * Khách từ chối một hạng mục BẮT BUỘC → coi như từ chối toàn bộ báo giá (gara không thể chỉ làm phần còn lại).
     * Dùng chung cho mọi đường khách trả lời (tài khoản, mã email tại quầy, link email) trước khi ghi và băm nội dung.
     *
     * @param  array<int, array{item_id: int|string, is_approved: bool|int|string}>  $responses
     * @return list<array{item_id: int, is_approved: bool}>
     */
    public function normalizeResponses(Quotation $quotation, array $responses): array
    {
        $quotation->loadMissing('items');
        $requiredIds = $quotation->items->where('is_required', true)->pluck('id')->all();
        $responses = array_values(array_map(fn ($r) => ['item_id' => (int) $r['item_id'], 'is_approved' => (bool) $r['is_approved']], $responses));
        $rejectsRequired = collect($responses)->contains(fn ($r) => ! $r['is_approved'] && in_array($r['item_id'], $requiredIds, true));

        return $rejectsRequired
            ? array_map(fn ($r) => ['item_id' => $r['item_id'], 'is_approved' => false], $responses)
            : $responses;
    }

    /** Vị trí 4 ảnh tổng quan bắt buộc cho dịch vụ nhanh (D-011). */
    public const QUICK_OVERVIEW_POSITIONS = ['FRONT', 'REAR', 'LEFT', 'RIGHT'];

    /**
     * P5 — Dịch vụ nhanh: báo giá theo giá niêm yết của các dịch vụ QUICK, gửi khách ngay,
     * bỏ bước chẩn đoán (RECEIVED → WAITING_APPROVAL). Khách vẫn phải duyệt giá như mọi báo giá.
     * Điều kiện: biên bản nhận xe đã được khách xác nhận và có đủ 4 ảnh tổng quan.
     *
     * @param  list<int>  $serviceIds
     */
    public function createQuickQuotation(RepairOrder $ro, Employee $advisor, array $serviceIds, ?Account $actor): Quotation
    {
        $this->assertAdvisor($advisor);
        if ($ro->status !== RepairOrder::RECEIVED) {
            throw InvalidStatusTransitionException::because('Báo giá dịch vụ nhanh chỉ lập khi phiếu vừa tiếp nhận (RECEIVED).');
        }
        $checkIn = $ro->confirmedCheckIn()->first();
        if (! $checkIn) {
            throw InvalidStatusTransitionException::because('Dịch vụ nhanh cần biên bản nhận xe đã được khách xác nhận.');
        }
        $positions = MediaAttachment::query()
            ->where('attachable_type', VehicleHandover::class)->where('attachable_id', $checkIn->id)
            ->whereIn('position_code', self::QUICK_OVERVIEW_POSITIONS)
            ->distinct()->pluck('position_code')->all();
        $missing = array_values(array_diff(self::QUICK_OVERVIEW_POSITIONS, $positions));
        if ($missing) {
            throw InvalidStatusTransitionException::because('Dịch vụ nhanh cần đủ 4 ảnh tổng quan trong biên bản nhận xe. Còn thiếu: '.implode(', ', $missing).'.');
        }

        $services = Service::query()->whereIn('id', array_unique($serviceIds))->get();
        if ($services->isEmpty() || $services->count() !== count(array_unique($serviceIds))) {
            throw InvalidStatusTransitionException::because('Danh sách dịch vụ không hợp lệ.');
        }
        $notQuick = $services->filter(fn (Service $s) => $s->service_level !== Service::LEVEL_QUICK || $s->status !== 'ACTIVE');
        if ($notQuick->isNotEmpty()) {
            throw InvalidStatusTransitionException::because('Chỉ dịch vụ nhanh đang hoạt động mới dùng luồng này: '.$notQuick->pluck('name')->implode(', ').'. Dịch vụ khác cần kiểm tra / chẩn đoán.');
        }

        return DB::transaction(function () use ($ro, $advisor, $services, $actor): Quotation {
            $quotation = Quotation::create([
                'quotation_code' => $this->generateCode('QT'),
                'repair_order_id' => $ro->id,
                'advisor_id' => $advisor->id,
                'version' => (int) $ro->quotations()->max('version') + 1,
                'type' => Quotation::TYPE_INITIAL,
                'discount_amount' => 0,
                'status' => Quotation::SENT,
            ]);
            foreach ($services as $service) {
                QuotationItem::create([
                    'quotation_id' => $quotation->id,
                    'item_type' => QuotationItem::TYPE_SERVICE,
                    'service_id' => $service->id,
                    'description' => $service->name,
                    'quantity' => 1,
                    'unit_price' => $service->base_price,
                    'amount' => $service->base_price,
                ]);
            }
            $quotation->recalculateTotals();

            $ro->flow_type = RepairOrder::FLOW_QUICK;
            $this->transition($ro, RepairOrder::WAITING_APPROVAL, $actor,
                "Dịch vụ nhanh: đã gửi báo giá niêm yết {$quotation->quotation_code} cho khách (không qua chẩn đoán).");
            $this->notifier->quotationSent($ro, false);

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
            if (in_array($ro->status, [RepairOrder::INSPECTING, RepairOrder::QUOTING], true)) {
                $this->transition($ro, RepairOrder::WAITING_APPROVAL, $actor,
                    "Đã gửi báo giá {$quotation->quotation_code} cho khách.");
            }
            $this->notifier->quotationSent($ro, $quotation->type === Quotation::TYPE_SUPPLEMENT);

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

        // Từ chối hạng mục bắt buộc = từ chối toàn bộ (idempotent nếu nơi gọi đã chuẩn hoá).
        $responses = $this->normalizeResponses($quotation, $responses);

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

            // P3: phát sinh được duyệt (khách trả lời hết) → tạo công việc cho dịch vụ được đồng ý.
            if ($quotation->type === Quotation::TYPE_SUPPLEMENT
                && in_array($quotation->status, [Quotation::APPROVED, Quotation::PARTIALLY_APPROVED], true)) {
                foreach ($items->where('item_type', QuotationItem::TYPE_SERVICE)->where('is_approved', true) as $item) {
                    $this->createWorkItemsFor($quotation->repairOrder, $item);
                }
                $this->refreshEstimatedReadyAt($quotation->repairOrder);
                $this->syncPartShortages($quotation->repairOrder, $quotation, null);
                $this->logHistory($quotation->repairOrder, $quotation->repairOrder->status, null,
                    "Khách đã trả lời báo giá phát sinh {$quotation->quotation_code}.");
            }

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
                $this->createWorkItemsFor($ro, $item);
            }

            $this->transition($ro, RepairOrder::IN_PROGRESS, $actor,
                "Bắt đầu sửa chữa theo báo giá {$quotation->quotation_code}.");
            $this->refreshEstimatedReadyAt($ro);
            $this->syncPartShortages($ro, $quotation, $actor);
            $this->notifier->repairStarted($ro);

            return $ro;
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 7. WAITING_FOR_PARTS
    |--------------------------------------------------------------------------
    */
    /**
     * ADV-01 (D-020): "Chờ phụ tùng" phải nói rõ đang thiếu gì — cần ≥ 1 yêu cầu phụ tùng đang mở.
     * Chưa có thì cố vấn báo thiếu ngay lúc chuyển ($parts: [{part_id, quantity, note?}]) → tạo yêu cầu cho kho.
     *
     * @param  array<int, array{part_id: int, quantity: int, note?: string|null}>  $parts
     */
    public function markWaitingForParts(RepairOrder $ro, ?Account $actor, ?string $note = null, array $parts = []): RepairOrder
    {
        DB::transaction(function () use ($ro, $actor, $note, $parts): void {
            if ($ro->status !== RepairOrder::IN_PROGRESS) {
                throw InvalidStatusTransitionException::because("Không thể chuyển sang chờ phụ tùng khi phiếu đang {$ro->status}.");
            }
            foreach ($parts as $line) {
                $this->partRequests->report($ro, (int) $line['part_id'], (int) $line['quantity'], $line['note'] ?? null, $actor);
            }
            if (! $ro->partRequests()->whereIn('status', PartRequest::OPEN)->exists()) {
                throw InvalidStatusTransitionException::because('Chọn phụ tùng đang thiếu (và số lượng) để kho đặt hàng trước khi chuyển sang chờ phụ tùng.');
            }
            $this->transition($ro, RepairOrder::WAITING_FOR_PARTS, $actor, $note ?? 'Đang chờ phụ tùng.');
        });
        $this->notifier->waitingForParts($ro);

        return $ro;
    }

    public function resumeFromWaitingForParts(RepairOrder $ro, ?Account $actor, ?string $note = null): RepairOrder
    {
        // P6: còn phụ tùng đặt chưa về thì cố vấn phải ghi lý do tiếp tục.
        if ($ro->partRequests()->whereIn('status', PartRequest::OPEN)->exists() && mb_strlen(trim((string) $note)) < 5) {
            throw InvalidStatusTransitionException::because('Còn phụ tùng đặt hàng chưa về. Ghi lý do (ít nhất 5 ký tự) nếu vẫn tiếp tục sửa.');
        }

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

        // Chỉ cập nhật công việc khi phiếu đang sửa / chờ phụ tùng (giống màn hình cố vấn) — phiếu đã xong, bàn giao, đóng thì khóa.
        $orderStatus = $item->repairOrder()->value('status');
        if (! in_array($orderStatus, [RepairOrder::IN_PROGRESS, RepairOrder::WAITING_FOR_PARTS], true)) {
            throw InvalidStatusTransitionException::because('Chỉ cập nhật công việc khi phiếu đang sửa chữa hoặc chờ phụ tùng.');
        }

        $item->status = $status;

        if ($status === WorkItem::IN_PROGRESS) {
            $item->started_at ??= now();
        }

        $item->completed_at = $status === WorkItem::COMPLETED ? now() : null;

        $item->save();

        return $item;
    }

    /**
     * RULE: chỉ ghi nhận phụ tùng thực dùng nếu part_id nằm trong
     * các dòng PART đã được khách duyệt của báo giá mới nhất.
     * Ghi nhận = xuất kho: trừ inventories và tạo inventory_transactions loại OUT.
     */
    public function recordUsedPart(RepairOrder $ro, array $data): UsedPart
    {
        if ($ro->status !== RepairOrder::IN_PROGRESS) {
            throw InvalidStatusTransitionException::because('Chỉ ghi nhận phụ tùng thực dùng khi phiếu đang IN_PROGRESS.');
        }

        // Báo giá gốc đang hiệu lực + phát sinh đã duyệt (P3).
        $approvedItem = QuotationItem::query()
            ->whereIn('quotation_id', $ro->billableQuotationIds())
            ->where('item_type', QuotationItem::TYPE_PART)
            ->where('is_approved', true)
            ->where('part_id', $data['part_id'])
            ->first();

        if (! $approvedItem) {
            throw InvalidStatusTransitionException::because(
                'Phụ tùng phải nằm trong báo giá đã được khách duyệt mới được ghi nhận sử dụng.'
            );
        }

        return DB::transaction(function () use ($ro, $data, $approvedItem) {
            $inventory = Inventory::query()->where('part_id', $data['part_id'])->lockForUpdate()->first();
            $quantity = (int) $data['quantity'];

            // Không xuất vượt số lượng khách đã duyệt (gốc + phát sinh đã duyệt), cộng dồn các lần xuất trước.
            $approvedQuantity = (int) QuotationItem::query()
                ->whereIn('quotation_id', $ro->billableQuotationIds())
                ->where('item_type', QuotationItem::TYPE_PART)
                ->where('is_approved', true)
                ->where('part_id', $data['part_id'])
                ->sum('quantity');
            $exported = (int) UsedPart::query()->where('repair_order_id', $ro->id)->where('part_id', $data['part_id'])->lockForUpdate()->sum('quantity');
            if ($exported + $quantity > $approvedQuantity) {
                $remaining = max(0, $approvedQuantity - $exported);
                throw InvalidStatusTransitionException::because($remaining > 0
                    ? "Khách chỉ duyệt {$approvedQuantity}, đã xuất {$exported} — chỉ còn xuất được {$remaining}. Cần thêm thì lập báo giá phát sinh."
                    : "Đã xuất đủ số khách duyệt ({$exported}/{$approvedQuantity}). Cần thêm thì lập báo giá phát sinh.");
            }

            if (! $inventory || $inventory->quantity < $quantity) {
                $inStock = $inventory->quantity ?? 0;
                throw InvalidStatusTransitionException::because(
                    "Không đủ tồn kho (còn {$inStock}). Chuyển phiếu sang chờ phụ tùng nếu cần."
                );
            }

            $usedPart = UsedPart::create([
                'repair_order_id' => $ro->id,
                'work_item_id' => $data['work_item_id'] ?? null,
                'part_id' => $data['part_id'],
                'quantity' => $quantity,
                'unit_price' => $approvedItem->unit_price,
                'used_at' => now(),
            ]);

            $inventory->decrement('quantity', $quantity);

            InventoryTransaction::create([
                'inventory_id' => $inventory->id,
                'repair_order_id' => $ro->id,
                'used_part_id' => $usedPart->id,
                'transaction_type' => InventoryTransaction::TYPE_OUT,
                'quantity' => $quantity,
                'note' => "Xuất kho cho phiếu {$ro->repair_order_code}.",
            ]);

            return $usedPart->load('part');
        });
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

        if ($ro->supplementQuotations()->where('status', Quotation::SENT)->exists()) {
            throw InvalidStatusTransitionException::because('Còn báo giá phát sinh đang chờ khách trả lời.');
        }

        $this->transition($ro, RepairOrder::COMPLETED, $actor, $note ?? 'Hoàn tất toàn bộ công việc sửa chữa.');
        $this->notifier->repairCompleted($ro);

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

        // P4: xe đã nhận theo biên bản thì phải có biên bản trả xe được chủ xe xác nhận trước khi đóng phiếu.
        if ($ro->requires_check_in && $ro->confirmedCheckIn()->exists() && ! $ro->confirmedCheckOut()->exists()) {
            throw InvalidStatusTransitionException::because('Chưa có biên bản trả xe (CHECK_OUT) được chủ xe xác nhận.');
        }

        $ro->close_reason = $reason;
        $this->transition($ro, RepairOrder::CLOSED, $actor, $note);
        $this->notifier->repairClosed($ro, $note);

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

            // Báo giá gốc đang hiệu lực + phát sinh đã duyệt (P3). Không gộp bản báo giá lại cũ (P0).
            $quotation = $ro->latestQuotation;
            $approvedItems = QuotationItem::query()
                ->whereIn('quotation_id', $ro->billableQuotationIds())
                ->where('is_approved', true)
                ->orderBy('quotation_id')->orderBy('id')
                ->get();

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

            $subtotal = (float) $invoice->items()->sum('amount');
            // Khách chỉ duyệt một phần: giảm giá không vượt quá tiền các hạng mục được duyệt → tổng hoá đơn không âm.
            $invoice->discount_amount = min((float) ($quotation?->discount_amount ?? 0), $subtotal);
            $invoice->subtotal = $subtotal;
            $invoice->total_amount = $subtotal - $invoice->discount_amount;
            $invoice->save();
            $this->notifier->invoiceIssued($ro, (float) $invoice->total_amount);

            return $invoice->load('items');
        });
    }

    /**
     * Thu tại quầy (tiền mặt / chuyển khoản / thẻ / ví): cố vấn xác nhận đã nhận tiền → SUCCESS ngay.
     * VNPay do khách tự thanh toán (VnpayPaymentService). Giao dịch QR cũ chỉ còn trong lịch sử.
     */
    public function recordPayment(Invoice $invoice, string $method, float $amount, ?string $transactionCode = null, ?Account $actor = null): Payment
    {
        if (! in_array($method, Payment::COUNTER_METHODS, true)) {
            throw InvalidStatusTransitionException::because('Phương thức thanh toán không hợp lệ.');
        }
        // PO 17/11/2026: chuyển khoản / thẻ / ví thu tại quầy phải có mã giao dịch để đối soát, không ghi trùng mã.
        $transactionCode = $transactionCode === null ? null : trim($transactionCode);
        if ($method !== Payment::DIRECT) {
            if ($transactionCode === null || $transactionCode === '') {
                throw InvalidStatusTransitionException::because('Nhập mã giao dịch (mã chuyển khoản / mã chuẩn chi POS / mã ví) để đối soát.');
            }
            if (Payment::query()->where('payment_method', $method)->where('transaction_code', $transactionCode)->where('status', Payment::SUCCESS)->exists()) {
                throw InvalidStatusTransitionException::because("Mã giao dịch {$transactionCode} đã được ghi nhận trước đó.");
            }
        }

        return DB::transaction(function () use ($invoice, $method, $amount, $transactionCode, $actor) {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);

            if ($invoice->status === Invoice::PAID) {
                throw InvalidStatusTransitionException::because('Hóa đơn đã thanh toán đủ.');
            }

            if ($invoice->status === Invoice::CANCELLED) {
                throw InvalidStatusTransitionException::because('Hóa đơn đã bị hủy, không thể thanh toán.');
            }

            $remaining = (float) $invoice->total_amount - (float) $invoice->totalPaid();
            if ($amount > $remaining + 0.001) {
                throw InvalidStatusTransitionException::because('Số tiền thanh toán vượt quá số còn phải trả.');
            }

            $payment = Payment::create([
                'invoice_id' => $invoice->id,
                'amount' => $amount,
                'payment_method' => $method,
                'transaction_code' => $method !== Payment::DIRECT ? $transactionCode : null,
                // Thu tại quầy: cố vấn xác nhận đã nhận tiền → thành công ngay.
                'status' => Payment::SUCCESS,
                'paid_at' => now(),
                'recorded_by' => $actor?->id,
            ]);

            $this->refreshInvoiceStatus($invoice);
            $this->notifyPayment($invoice, (float) $amount);

            return $payment;
        });
    }

    private function notifyPayment(Invoice $invoice, float $amount): void
    {
        $this->notifier->paymentReceived($invoice->repairOrder, $amount, $invoice->status === Invoice::PAID);
    }

    public function refreshInvoiceStatus(Invoice $invoice): void
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
    /**
     * Kiểm tra sau sửa chữa (PO 17/11/2026, bắt buộc trước bàn giao): chỉ khi phiếu đã sửa xong (COMPLETED),
     * phải tick đủ mọi hạng mục `RepairOrder::QUALITY_CHECK_ITEMS`. Lưu người kiểm + thời điểm; làm lại thì ghi đè.
     *
     * @param  list<string>  $checked
     */
    public function recordQualityCheck(RepairOrder $ro, array $checked, ?string $note, ?Account $actor): RepairOrder
    {
        if ($ro->status !== RepairOrder::COMPLETED) {
            throw InvalidStatusTransitionException::because('Chỉ kiểm tra sau sửa chữa khi phiếu đã hoàn thành sửa chữa và chưa bàn giao.');
        }
        $missing = array_diff(array_keys(RepairOrder::QUALITY_CHECK_ITEMS), $checked);
        if ($missing !== []) {
            $labels = array_map(fn (string $code) => RepairOrder::QUALITY_CHECK_ITEMS[$code], array_values($missing));
            throw InvalidStatusTransitionException::because('Chưa kiểm đủ: '.implode(', ', $labels).'.');
        }

        $ro->forceFill([
            'quality_check' => ['items' => array_keys(RepairOrder::QUALITY_CHECK_ITEMS), 'note' => $note],
            'quality_checked_at' => now(),
            'quality_checked_by' => $actor?->id,
        ])->save();

        return $ro;
    }

    public function handOver(RepairOrder $ro, ?Account $actor): RepairOrder
    {
        if ($ro->quality_checked_at === null) {
            throw InvalidStatusTransitionException::because('Chưa kiểm tra sau sửa chữa. Hoàn tất checklist kiểm tra trước khi bàn giao xe.');
        }

        $invoice = $ro->invoice;

        if (! $invoice || $invoice->status !== Invoice::PAID) {
            throw InvalidStatusTransitionException::because('Chỉ bàn giao xe khi hóa đơn đã thanh toán đủ (PAID).');
        }

        // P4: xác định và xác thực người nhận — biên bản trả xe được chủ xe xác nhận (tài khoản / OTP email chủ xe).
        if ($ro->requires_check_in && ! $ro->confirmedCheckOut()->exists()) {
            throw InvalidStatusTransitionException::because('Chưa có biên bản trả xe (CHECK_OUT) được chủ xe xác nhận. Lập biên bản trả xe trước khi bàn giao.');
        }

        $this->transition($ro, RepairOrder::HANDED_OVER, $actor, 'Đã bàn giao xe cho khách.');
        $this->notifier->reviewInvite($ro);

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

        // Phiếu xong/đóng thì KTV không còn bị tính là đang giữ phiếu này.
        if (in_array($to, [RepairOrder::COMPLETED, RepairOrder::CLOSED], true)) {
            $ro->assignments()
                ->whereIn('status', [Assignment::ASSIGNED, Assignment::IN_PROGRESS])
                ->update(['status' => $to === RepairOrder::COMPLETED ? Assignment::COMPLETED : Assignment::CANCELLED]);
        }

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

    /**
     * Lịch hẹn chỉ được lập phiếu khi xe đã check-in, đúng khách/xe và chưa có phiếu.
     *
     * @param  array{customer_id: int|string, vehicle_id: int|string}  $data
     */
    /** @return int xe trong lịch hẹn (để phát hiện đổi xe) */
    private function assertAppointmentReadyForReceiving(int $appointmentId, array $data): int
    {
        $appointment = Appointment::query()->lockForUpdate()->find($appointmentId);

        if (! $appointment) {
            throw InvalidStatusTransitionException::because('Không tìm thấy lịch hẹn.');
        }

        if ($appointment->status !== 'CHECKED_IN') {
            throw InvalidStatusTransitionException::because(
                "Chỉ tạo phiếu sửa chữa khi lịch hẹn đã check-in (CHECKED_IN). Trạng thái hiện tại: {$appointment->status}."
            );
        }

        // Xe có thể khác lịch hẹn (khách mang xe khác của mình) — receive() bắt buộc lý do + ghi audit.
        // Xe phải thuộc đúng khách của lịch hẹn (receive() đã kiểm xe thuộc customer_id).
        if ((int) $appointment->customer_id !== (int) $data['customer_id']) {
            throw InvalidStatusTransitionException::because('Khách hàng không khớp với lịch hẹn.');
        }

        $existing = RepairOrder::query()->where('appointment_id', $appointmentId)->first();

        if ($existing) {
            throw InvalidStatusTransitionException::because(
                "Lịch hẹn này đã có phiếu sửa chữa {$existing->repair_order_code}, không tạo phiếu thứ hai."
            );
        }

        return (int) $appointment->vehicle_id;
    }

    /**
     * P5: dịch vụ có bước chuẩn → một công việc / bước (kèm phút chuẩn); không có bước → một công việc
     * với phút chuẩn = estimated_minutes × số lượng. Không ảnh hưởng tiền (hóa đơn lấy từ báo giá).
     */
    private function createWorkItemsFor(RepairOrder $ro, QuotationItem $item): void
    {
        $service = $item->service_id ? Service::query()->with('steps')->find($item->service_id) : null;
        if ($service && $service->steps->isNotEmpty()) {
            foreach ($service->steps as $step) {
                WorkItem::create([
                    'repair_order_id' => $ro->id,
                    'service_id' => $service->id,
                    'service_step_id' => $step->id,
                    'description' => "{$service->name} · {$step->step_order}. {$step->name}",
                    'standard_minutes' => $step->standard_minutes * max(1, (int) $item->quantity),
                    'status' => WorkItem::PENDING,
                ]);
            }

            return;
        }

        WorkItem::create([
            'repair_order_id' => $ro->id,
            'service_id' => $item->service_id,
            'description' => $item->description,
            'standard_minutes' => $service?->estimated_minutes ? $service->estimated_minutes * max(1, (int) $item->quantity) : null,
            'status' => WorkItem::PENDING,
        ]);
    }

    /**
     * P6: dòng phụ tùng khách đã duyệt mà tồn kho không đủ → tạo yêu cầu đặt hàng (một lần / dòng).
     * Không chặn bắt đầu sửa; cố vấn có thể chuyển phiếu sang WAITING_FOR_PARTS (luồng có sẵn).
     */
    private function syncPartShortages(RepairOrder $ro, Quotation $quotation, ?Account $actor): void
    {
        $parts = $quotation->items()->where('item_type', QuotationItem::TYPE_PART)->where('is_approved', true)->get();
        foreach ($parts as $item) {
            if (PartRequest::query()->where('quotation_item_id', $item->id)->where('status', '!=', PartRequest::CANCELLED)->exists()) {
                continue;
            }
            $inStock = (int) Inventory::query()->where('part_id', $item->part_id)->value('quantity');
            $missing = (int) $item->quantity - max(0, $inStock);
            if ($missing > 0) {
                PartRequest::query()->create([
                    'repair_order_id' => $ro->id,
                    'quotation_item_id' => $item->id,
                    'part_id' => $item->part_id,
                    'quantity' => $missing,
                    'status' => PartRequest::REQUESTED,
                    'created_by_account_id' => $actor?->id,
                ]);
            }
        }
    }

    /** Giờ dự kiến xong = bây giờ + tổng phút chuẩn của công việc chưa xong (null nếu chưa có phút chuẩn). */
    private function refreshEstimatedReadyAt(RepairOrder $ro): void
    {
        $minutes = (int) $ro->workItems()->whereIn('status', [WorkItem::PENDING, WorkItem::IN_PROGRESS])->sum('standard_minutes');
        $ro->forceFill(['estimated_ready_at' => $minutes > 0 ? now()->addMinutes($minutes) : null])->save();
    }

    /** P2: phiếu tạo sau khi triển khai biên bản phải có CHECK_IN được khách xác nhận trước khi kiểm tra. */
    private function assertCheckInConfirmed(RepairOrder $ro): void
    {
        if ($ro->requires_check_in && ! $ro->confirmedCheckIn()->exists()) {
            throw InvalidStatusTransitionException::because(
                'Chưa có biên bản nhận xe (CHECK_IN) được khách xác nhận. Lập biên bản và gửi khách xác nhận trước khi kiểm tra.'
            );
        }
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

    /**
     * Không cho 2 đề xuất cùng một dịch vụ / phụ tùng trong một phiếu kiểm tra — cần nhiều hơn thì tăng số lượng.
     *
     * @param  array<int, array<string, mixed>>  $recommendations
     */
    private function assertNoDuplicateRecommendations(array $recommendations): void
    {
        $keys = array_map(fn (array $rec) => ($rec['item_type'] ?? '').':'.(($rec['item_type'] ?? '') === InspectionRecommendation::TYPE_PART ? ($rec['part_id'] ?? '') : ($rec['service_id'] ?? '')), $recommendations);
        if (count($keys) !== count(array_unique($keys))) {
            throw InvalidStatusTransitionException::because('Đề xuất bị trùng dịch vụ / phụ tùng. Gộp lại một dòng và tăng số lượng.');
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

    /** Đề xuất mới không được dùng dịch vụ đã ngừng áp dụng. */
    private function assertRecommendedServiceIsActive(array $rec): void
    {
        if ($rec['item_type'] !== InspectionRecommendation::TYPE_SERVICE) {
            return;
        }
        $service = Service::query()->find($rec['service_id']);
        if ($service?->status !== 'ACTIVE') {
            throw InvalidStatusTransitionException::because("Dịch vụ “{$service?->name}” đã ngừng áp dụng, không thêm vào đề xuất được.");
        }
    }

    private function generateCode(string $prefix): string
    {
        return sprintf('%s-%s-%s', $prefix, now()->format('Y'), Str::upper(Str::random(6)));
    }
}
