<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\Assignment;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Inspection;
use App\Models\InspectionRecommendation;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\MaintenancePackage;
use App\Models\Notification;
use App\Models\Part;
use App\Models\Quotation;
use App\Models\RepairOrder;
use App\Models\Service;
use App\Models\TechnicianProfile;
use App\Models\Vehicle;
use App\Models\WorkItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Luồng sau chẩn đoán: báo giá → khách duyệt → sửa chữa → thanh toán → bàn giao.
 */
class RepairFlowTest extends TestCase
{
    use RefreshDatabase;

    private Account $advisor;

    private Account $customerAccount;

    private Account $technicianAccount;

    private RepairOrder $repairOrder;

    private Service $service;

    private Part $part;

    protected function setUp(): void
    {
        parent::setUp();

        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);

        $this->technicianAccount = Account::factory()->technician()->create();
        $technician = TechnicianProfile::factory()->create([
            'employee_id' => Employee::factory()->create(['account_id' => $this->technicianAccount->id])->id,
        ]);

        $this->customerAccount = Account::factory()->create();
        $customer = Customer::factory()->create(['account_id' => $this->customerAccount->id]);

        $this->service = Service::factory()->create(['name' => 'Công thay má phanh', 'base_price' => 300000, 'status' => 'ACTIVE']);
        $this->part = Part::query()->create([
            'sku' => 'BRK-01', 'name' => 'Má phanh trước', 'unit' => 'Bộ', 'sell_price' => 450000, 'status' => 'ACTIVE',
        ]);

        $this->repairOrder = RepairOrder::query()->create([
            'repair_order_code' => 'RO-TEST',
            'customer_id' => $customer->id,
            'vehicle_id' => Vehicle::factory()->create(['customer_id' => $customer->id])->id,
            'advisor_id' => $this->advisor->employee->id,
            'status' => RepairOrder::QUOTING,
            'received_at' => now(),
        ]);

        Assignment::query()->create([
            'repair_order_id' => $this->repairOrder->id,
            'technician_id' => $technician->id,
            'status' => Assignment::ASSIGNED,
            'assigned_at' => now(),
        ]);

        $inspection = Inspection::query()->create([
            'repair_order_id' => $this->repairOrder->id,
            'technician_id' => $technician->id,
            'diagnosis' => 'Má phanh mòn',
            'inspected_at' => now(),
        ]);

        InspectionRecommendation::query()->create([
            'inspection_id' => $inspection->id,
            'item_type' => InspectionRecommendation::TYPE_PART,
            'part_id' => $this->part->id,
            'quantity' => 1,
        ]);
    }

    /**
     * Cố vấn lập + gửi báo giá 2 dòng (công + phụ tùng), trả về báo giá đã gửi.
     */
    private function sendQuotation(): Quotation
    {
        $quotationId = $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/quotations", [
                'items' => [
                    ['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 1],
                    ['item_type' => 'PART', 'part_id' => $this->part->id, 'quantity' => 2],
                ],
            ])
            ->assertCreated()
            ->json('id');

        $this->actingAs($this->advisor)->postJson("/api/quotations/{$quotationId}/send")->assertOk();

        return Quotation::query()->with('items')->findOrFail($quotationId);
    }

    /**
     * Khách duyệt toàn bộ báo giá rồi Cố vấn bắt đầu sửa.
     */
    private function approveAndStartRepair(): Quotation
    {
        $quotation = $this->sendQuotation();

        $this->actingAs($this->customerAccount)
            ->postJson("/api/me/quotations/{$quotation->id}/respond", [
                'responses' => $quotation->items->map(fn ($item) => ['item_id' => $item->id, 'is_approved' => true])->all(),
            ])
            ->assertOk();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/start-repair")->assertOk();

        return $quotation->fresh('items');
    }

    public function test_quotation_uses_catalog_price_and_name_when_omitted(): void
    {
        $quotation = $this->sendQuotation();

        $this->assertSame(RepairOrder::WAITING_APPROVAL, $this->repairOrder->fresh()->status);
        $this->assertEqualsCanonicalizing(
            [['Công thay má phanh', 300000.0], ['Má phanh trước', 900000.0]],
            $quotation->items->map(fn ($item) => [$item->description, (float) $item->amount])->all()
        );
    }

    public function test_advisor_edits_draft_quotation_but_not_after_sending(): void
    {
        $id = $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/quotations", [
                'items' => [['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 1]],
            ])->assertCreated()->json('id');

        // Sửa nháp: thay dòng, đổi số lượng / giá, thêm giảm giá → tổng tính lại.
        $this->actingAs($this->advisor)->putJson("/api/quotations/{$id}", [
            'discount_amount' => 100000,
            'items' => [
                ['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 2, 'unit_price' => 250000],
                ['item_type' => 'PART', 'part_id' => $this->part->id, 'quantity' => 1],
            ],
        ])->assertOk()->assertJsonCount(2, 'items');
        $quotation = Quotation::query()->with('items')->findOrFail($id);
        $this->assertSame(Quotation::DRAFT, $quotation->status);
        $this->assertSame(500000.0 + 450000.0 - 100000.0, (float) $quotation->total_amount);

        // Phụ tùng ngoài đề xuất chẩn đoán vẫn bị chặn như lúc lập mới.
        $other = Part::query()->create(['sku' => 'OTHER-01', 'name' => 'Lọc gió', 'unit' => 'Cái', 'sell_price' => 100000, 'status' => 'ACTIVE']);
        $this->actingAs($this->advisor)->putJson("/api/quotations/{$id}", [
            'items' => [['item_type' => 'PART', 'part_id' => $other->id, 'quantity' => 1]],
        ])->assertStatus(422);

        // Đã gửi khách → không sửa được nữa.
        $this->actingAs($this->advisor)->postJson("/api/quotations/{$id}/send")->assertOk();
        $this->actingAs($this->advisor)->putJson("/api/quotations/{$id}", [
            'items' => [['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 1]],
        ])->assertStatus(422);
        $this->assertCount(2, Quotation::query()->findOrFail($id)->items);

        // Khách không có quyền sửa.
        $this->actingAs($this->customerAccount)->putJson("/api/quotations/{$id}", [
            'items' => [['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 1]],
        ])->assertForbidden();
    }

    public function test_customer_partial_approval_creates_work_items_only_for_approved_services(): void
    {
        $quotation = $this->sendQuotation();
        $serviceItem = $quotation->items->firstWhere('item_type', 'SERVICE');
        $partItem = $quotation->items->firstWhere('item_type', 'PART');

        $this->actingAs($this->customerAccount)
            ->postJson("/api/me/quotations/{$quotation->id}/respond", [
                'responses' => [
                    ['item_id' => $serviceItem->id, 'is_approved' => true],
                    ['item_id' => $partItem->id, 'is_approved' => false],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', Quotation::PARTIALLY_APPROVED);

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/start-repair")->assertOk();

        $this->assertSame(RepairOrder::IN_PROGRESS, $this->repairOrder->fresh()->status);
        $this->assertSame(1, WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->count());
    }

    public function test_repair_cannot_start_before_customer_approves(): void
    {
        $this->sendQuotation();

        $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/start-repair")
            ->assertUnprocessable();
    }

    public function test_cannot_export_more_parts_than_customer_approved(): void
    {
        // Khách duyệt 2 má phanh (sendQuotation) — kho còn 10.
        $this->approveAndStartRepair();
        $inventory = Inventory::query()->create(['part_id' => $this->part->id, 'quantity' => 10]);
        $url = "/api/repair-orders/{$this->repairOrder->id}/used-parts";

        $this->actingAs($this->advisor)->postJson($url, ['part_id' => $this->part->id, 'quantity' => 3])
            ->assertUnprocessable()->assertJsonPath('message', 'Khách chỉ duyệt 2, đã xuất 0 — chỉ còn xuất được 2. Cần thêm thì lập báo giá phát sinh.');

        // Xuất từng đợt: 1 + 1 = đủ 2; lần thứ ba bị chặn.
        $this->actingAs($this->advisor)->postJson($url, ['part_id' => $this->part->id, 'quantity' => 1])->assertCreated();
        $this->actingAs($this->advisor)->postJson($url, ['part_id' => $this->part->id, 'quantity' => 1])->assertCreated();
        $this->actingAs($this->advisor)->postJson($url, ['part_id' => $this->part->id, 'quantity' => 1])
            ->assertUnprocessable()->assertJsonPath('message', 'Đã xuất đủ số khách duyệt (2/2). Cần thêm thì lập báo giá phát sinh.');

        $this->assertSame(8, $inventory->fresh()->quantity);
    }

    public function test_used_part_ignores_client_price_and_rejects_work_item_of_another_order(): void
    {
        $this->approveAndStartRepair();
        Inventory::query()->create(['part_id' => $this->part->id, 'quantity' => 5]);
        $url = "/api/repair-orders/{$this->repairOrder->id}/used-parts";
        $foreignWorkItem = WorkItem::query()->whereKeyNot(
            WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->pluck('id')
        )->value('id') ?? 999999;

        $this->actingAs($this->advisor)->postJson($url, ['part_id' => $this->part->id, 'quantity' => 1, 'work_item_id' => $foreignWorkItem])
            ->assertUnprocessable()->assertJsonValidationErrors('work_item_id');

        $this->actingAs($this->advisor)->postJson($url, ['part_id' => $this->part->id, 'quantity' => 1, 'unit_price' => 1])
            ->assertCreated()->assertJsonPath('unit_price', '450000.00');
    }

    public function test_technician_uses_approved_part_and_stock_is_exported(): void
    {
        $this->approveAndStartRepair();
        $inventory = Inventory::query()->create(['part_id' => $this->part->id, 'quantity' => 5]);

        $this->actingAs($this->technicianAccount)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/used-parts", ['part_id' => $this->part->id, 'quantity' => 2])
            ->assertCreated()
            ->assertJsonPath('unit_price', '450000.00');

        $this->assertSame(3, $inventory->fresh()->quantity);
        $this->assertDatabaseHas('inventory_transactions', [
            'inventory_id' => $inventory->id,
            'repair_order_id' => $this->repairOrder->id,
            'transaction_type' => 'OUT',
            'quantity' => 2,
        ]);
    }

    public function test_using_part_beyond_stock_is_rejected_without_changes(): void
    {
        $this->approveAndStartRepair();
        $inventory = Inventory::query()->create(['part_id' => $this->part->id, 'quantity' => 1]);

        $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/used-parts", ['part_id' => $this->part->id, 'quantity' => 2])
            ->assertUnprocessable();

        $this->assertSame(1, $inventory->fresh()->quantity);
        $this->assertDatabaseCount('used_parts', 0);
    }

    public function test_order_completes_only_after_all_work_items_are_done(): void
    {
        $this->approveAndStartRepair();
        $workItem = WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->firstOrFail();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/complete")->assertUnprocessable();

        $this->actingAs($this->technicianAccount)
            ->patchJson("/api/work-items/{$workItem->id}/status", ['status' => WorkItem::COMPLETED])
            ->assertOk();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/complete")->assertOk();
        $this->assertSame(RepairOrder::COMPLETED, $this->repairOrder->fresh()->status);
    }

    public function test_work_items_are_locked_once_the_order_is_completed(): void
    {
        $this->approveAndStartRepair();
        $workItem = WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->firstOrFail();
        $this->actingAs($this->technicianAccount)->patchJson("/api/work-items/{$workItem->id}/status", ['status' => WorkItem::COMPLETED])->assertOk();
        $this->assertNotNull($workItem->fresh()->completed_at);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/complete")->assertOk();

        $this->actingAs($this->advisor)
            ->patchJson("/api/work-items/{$workItem->id}/status", ['status' => WorkItem::PENDING])
            ->assertUnprocessable();
        $this->assertSame(WorkItem::COMPLETED, $workItem->fresh()->status);
    }

    public function test_reopening_a_work_item_clears_its_completion_time(): void
    {
        $this->approveAndStartRepair();
        $workItem = WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->firstOrFail();
        $this->actingAs($this->advisor)->patchJson("/api/work-items/{$workItem->id}/status", ['status' => WorkItem::COMPLETED])->assertOk();

        $this->actingAs($this->advisor)->patchJson("/api/work-items/{$workItem->id}/status", ['status' => WorkItem::IN_PROGRESS])->assertOk();
        $this->assertNull($workItem->fresh()->completed_at);
    }

    /**
     * Đưa phiếu đến COMPLETED và xuất hóa đơn, trả về id hóa đơn.
     */
    private function completeAndInvoice(): int
    {
        $this->approveAndStartRepair();
        WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->update(['status' => WorkItem::COMPLETED]);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/complete")->assertOk();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/quality-check", ['items' => array_keys(RepairOrder::QUALITY_CHECK_ITEMS)])->assertOk();

        return $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/invoice")
            ->assertCreated()
            ->assertJsonPath('total_amount', '1200000.00')
            ->json('id');
    }

    public function test_cash_payment_then_hand_over_then_customer_review(): void
    {
        $invoiceId = $this->completeAndInvoice();
        $orderId = $this->repairOrder->id;

        $this->actingAs($this->advisor)->postJson("/api/invoices/{$invoiceId}/payments", ['amount' => 200000])
            ->assertCreated()
            ->assertJsonPath('payment_method', 'DIRECT')
            ->assertJsonPath('status', 'SUCCESS');

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/hand-over")->assertUnprocessable();

        $this->actingAs($this->customerAccount)
            ->postJson('/api/me/reviews', ['repair_order_id' => $orderId, 'overall_rating' => 5])
            ->assertUnprocessable();

        $this->actingAs($this->advisor)->postJson("/api/invoices/{$invoiceId}/payments", ['amount' => 1000000])->assertCreated();
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$orderId}/hand-over")->assertOk();
        $this->assertSame(RepairOrder::HANDED_OVER, $this->repairOrder->fresh()->status);

        $this->assertDatabaseHas('notifications', [
            'account_id' => $this->customerAccount->id,
            'repair_order_id' => $orderId,
            'type' => Notification::TYPE_REVIEW_INVITE,
            'channel' => 'WEB',
        ]);
        $this->actingAs($this->customerAccount)->getJson('/api/me/notifications')->assertOk()
            ->assertJsonPath('data.0.type', Notification::TYPE_REVIEW_INVITE)
            ->assertJsonPath('data.0.repair_order_id', $orderId);

        // Mỗi bước cố vấn làm mà khách cần biết đều có thông báo gắn đúng phiếu.
        $types = Notification::query()->where('account_id', $this->customerAccount->id)->where('repair_order_id', $orderId)->pluck('type')->all();
        foreach ([
            Notification::TYPE_QUOTATION_SENT, Notification::TYPE_REPAIR_STARTED, Notification::TYPE_REPAIR_COMPLETED,
            Notification::TYPE_INVOICE_ISSUED, Notification::TYPE_PAYMENT_RECEIVED, Notification::TYPE_REVIEW_INVITE,
        ] as $expected) {
            $this->assertContains($expected, $types, "Thiếu thông báo {$expected}");
        }
        // 2 lần trả tiền mặt → 2 thông báo đã nhận tiền; khách chỉ thấy thông báo của chính mình.
        $this->assertSame(2, collect($types)->filter(fn ($t) => $t === Notification::TYPE_PAYMENT_RECEIVED)->count());

        $this->actingAs($this->customerAccount)->patchJson('/api/me/notifications/read-all')->assertOk();
        $this->actingAs($this->customerAccount)->getJson('/api/me/notifications')->assertJsonPath('unread_count', 0);

        $this->actingAs($this->customerAccount)
            ->postJson('/api/me/reviews', ['repair_order_id' => $orderId, 'overall_rating' => 5])
            ->assertCreated();
    }

    public function test_only_cash_payment_is_accepted_and_overpayment_is_rejected(): void
    {
        $invoiceId = $this->completeAndInvoice();

        $this->actingAs($this->advisor)
            ->postJson("/api/invoices/{$invoiceId}/payments", ['payment_method' => 'QR', 'amount' => 1000])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('payment_method');

        $this->actingAs($this->advisor)
            ->postJson("/api/invoices/{$invoiceId}/payments", ['amount' => 1300000])
            ->assertUnprocessable();

        $this->assertDatabaseCount('payments', 0);
    }

    public function test_manual_qr_confirmation_endpoint_is_removed(): void
    {
        $this->actingAs($this->advisor)->postJson('/api/payments/1/confirm-qr', ['success' => true])->assertNotFound();
    }

    public function test_cancelled_invoice_cannot_receive_a_payment(): void
    {
        $invoiceId = $this->completeAndInvoice();
        Invoice::query()->whereKey($invoiceId)->update(['status' => Invoice::CANCELLED]);

        $this->actingAs($this->advisor)
            ->postJson("/api/invoices/{$invoiceId}/payments", ['amount' => 1000])
            ->assertUnprocessable();

        $this->assertDatabaseCount('payments', 0);
        $this->assertSame(Invoice::CANCELLED, Invoice::query()->findOrFail($invoiceId)->status);
    }

    public function test_order_detail_includes_what_the_customer_requested_when_booking(): void
    {
        $package = MaintenancePackage::factory()->create(['name' => 'Bảo dưỡng 5.000 km']);
        $package->services()->attach($this->service->id, ['quantity' => 1]);
        $package->parts()->attach($this->part->id, ['quantity' => 2]);
        $extraService = Service::factory()->create(['name' => 'Kiểm tra điều hòa']);

        $appointment = Appointment::query()->create([
            'appointment_code' => 'APT-RO-TEST',
            'customer_id' => $this->repairOrder->customer_id,
            'vehicle_id' => $this->repairOrder->vehicle_id,
            'appointment_date' => now()->toDateString(),
            'appointment_time' => '09:00:00',
            'request_type' => 'MAINTENANCE',
            'symptom_description' => 'Phanh kêu khi dừng',
            'status' => 'CHECKED_IN',
        ]);
        $appointment->syncRequestedItems([$extraService->id], [$package->id]);
        $this->repairOrder->update(['appointment_id' => $appointment->id]);

        $this->actingAs($this->advisor)
            ->getJson("/api/repair-orders/{$this->repairOrder->id}")
            ->assertOk()
            ->assertJsonPath('appointment.symptom_description', 'Phanh kêu khi dừng')
            ->assertJsonPath('appointment.services.0.name', 'Kiểm tra điều hòa')
            ->assertJsonPath('appointment.packages.0.name', 'Bảo dưỡng 5.000 km')
            ->assertJsonPath('appointment.packages.0.services.0.id', $this->service->id)
            ->assertJsonPath('appointment.packages.0.parts.0.id', $this->part->id)
            ->assertJsonPath('appointment.packages.0.parts.0.pivot.quantity', 2);
    }

    /**
     * P0: chỉ khách được duyệt báo giá — nhân viên không có đường nào để "ghi nhận thay khách".
     */
    public function test_staff_cannot_respond_to_quotation_on_behalf_of_customer(): void
    {
        $quotation = $this->sendQuotation();
        $responses = $quotation->items->map(fn ($item) => ['item_id' => $item->id, 'is_approved' => true])->all();

        // Route cũ dành cho cố vấn đã gỡ.
        $this->actingAs($this->advisor)
            ->postJson("/api/quotations/{$quotation->id}/respond", ['responses' => $responses])
            ->assertNotFound();

        // Route của khách chặn mọi vai trò khác.
        $this->actingAs($this->advisor)
            ->postJson("/api/me/quotations/{$quotation->id}/respond", ['responses' => $responses])
            ->assertForbidden();

        $quotation->refresh();
        $this->assertSame(Quotation::SENT, $quotation->status);
        $this->assertNull($quotation->customer_response_at);
        $this->assertSame(0, $quotation->items()->whereNotNull('is_approved')->count());
        $this->assertSame(RepairOrder::WAITING_APPROVAL, $this->repairOrder->fresh()->status);
    }

    /**
     * Khóa hành vi hiện tại: phiên bản báo giá mới THAY THẾ bản cũ (báo giá lại trước khi sửa).
     * Hóa đơn và công việc lấy từ bản mới nhất — không cộng dồn các phiên bản (tránh tính tiền 2 lần).
     * Báo giá phát sinh cộng dồn sẽ được thiết kế riêng ở P3 (quotations.type = SUPPLEMENT).
     */
    public function test_requote_replaces_previous_version_and_invoice_is_not_double_counted(): void
    {
        $first = $this->sendQuotation();
        $this->actingAs($this->customerAccount)
            ->postJson("/api/me/quotations/{$first->id}/respond", [
                'responses' => [
                    ['item_id' => $first->items->firstWhere('item_type', 'SERVICE')->id, 'is_approved' => true],
                    ['item_id' => $first->items->firstWhere('item_type', 'PART')->id, 'is_approved' => false],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('status', Quotation::PARTIALLY_APPROVED);

        // Cố vấn báo giá lại (vẫn ở WAITING_APPROVAL) với cùng công + 1 phụ tùng.
        $secondId = $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/quotations", [
                'items' => [
                    ['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 1],
                    ['item_type' => 'PART', 'part_id' => $this->part->id, 'quantity' => 1],
                ],
            ])
            ->assertCreated()
            ->assertJsonPath('version', 2)
            ->json('id');
        $this->actingAs($this->advisor)->postJson("/api/quotations/{$secondId}/send")->assertOk();
        $second = Quotation::query()->with('items')->findOrFail($secondId);
        $this->actingAs($this->customerAccount)
            ->postJson("/api/me/quotations/{$secondId}/respond", [
                'responses' => $second->items->map(fn ($item) => ['item_id' => $item->id, 'is_approved' => true])->all(),
            ])
            ->assertOk()
            ->assertJsonPath('status', Quotation::APPROVED);

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/start-repair")->assertOk();
        // Chỉ 1 công việc (từ bản 2), không nhân đôi với dịch vụ đã duyệt ở bản 1.
        $this->assertSame(1, WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->count());

        WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->update(['status' => WorkItem::COMPLETED]);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/complete")->assertOk();

        // 300.000 công + 1 × 450.000 phụ tùng = 750.000 (không cộng thêm 300.000 của bản 1).
        $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/invoice")
            ->assertCreated()
            ->assertJsonPath('total_amount', '750000.00')
            ->assertJsonCount(2, 'items');
    }

    public function test_advisor_supplements_recommendation_after_diagnosis_only_before_repair(): void
    {
        $filter = Part::query()->create(['sku' => 'FLT-01', 'name' => 'Lọc dầu', 'unit' => 'Cái', 'sell_price' => 120000, 'status' => 'ACTIVE']);
        $url = "/api/repair-orders/{$this->repairOrder->id}/inspections/recommendations";

        // Chẩn đoán đã hoàn tất → bổ sung phải có lý do; dòng thiếu lý do làm hỏng cả lô (không lưu gì).
        $this->actingAs($this->advisor)->postJson($url, ['recommendations' => [
            ['item_type' => 'PART', 'part_id' => $filter->id, 'quantity' => 1, 'note' => 'Đi kèm thay dầu'],
            ['item_type' => 'PART', 'part_id' => $filter->id, 'quantity' => 1],
        ]])->assertUnprocessable();
        $this->assertSame(0, InspectionRecommendation::query()->where('part_id', $filter->id)->count());

        $this->actingAs($this->advisor)->postJson($url, ['recommendations' => [
            ['item_type' => 'PART', 'part_id' => $filter->id, 'quantity' => 1, 'note' => 'Lọc dầu đi kèm thay dầu'],
        ]])->assertCreated()->assertJsonPath('0.added_after_completion', true);
        $this->assertSame($this->advisor->id, InspectionRecommendation::query()->where('part_id', $filter->id)->value('added_by_account_id'));

        // Đã có đề xuất phụ tùng này → không thêm dòng trùng (kể cả phụ tùng đề xuất gốc).
        $this->actingAs($this->advisor)->postJson($url, ['item_type' => 'PART', 'part_id' => $filter->id, 'quantity' => 2, 'note' => 'Thêm lọc dầu nữa'])
            ->assertUnprocessable()->assertJsonPath('message', 'Đề xuất bị trùng dịch vụ / phụ tùng. Gộp lại một dòng và tăng số lượng.');
        $this->actingAs($this->advisor)->postJson($url, ['item_type' => 'PART', 'part_id' => $this->part->id, 'quantity' => 1, 'note' => 'Má phanh lần nữa'])
            ->assertUnprocessable();
        $this->assertSame(1, InspectionRecommendation::query()->where('part_id', $filter->id)->count());

        // Phụ tùng vừa bổ sung báo giá được.
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/quotations", [
            'items' => [['item_type' => 'PART', 'part_id' => $filter->id, 'quantity' => 1]],
        ])->assertCreated();

        // Đã bắt đầu sửa → không bổ sung nữa (dùng báo giá phát sinh).
        $this->repairOrder->update(['status' => RepairOrder::IN_PROGRESS]);
        $this->actingAs($this->advisor)->postJson($url, ['item_type' => 'PART', 'part_id' => $filter->id, 'quantity' => 1, 'note' => 'Thêm một lọc nữa'])
            ->assertUnprocessable();
    }

    public function test_rejecting_a_required_item_rejects_the_whole_quotation(): void
    {
        // Bắt buộc mà không có lý do → không lưu.
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/quotations", [
            'items' => [['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 1, 'is_required' => true]],
        ])->assertUnprocessable()->assertJsonValidationErrors('items.0.required_reason');

        $id = $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/quotations", [
            'items' => [
                ['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 1],
                ['item_type' => 'PART', 'part_id' => $this->part->id, 'quantity' => 1, 'is_required' => true, 'required_reason' => 'Má phanh mòn tới kim loại, không thay thì không an toàn'],
            ],
        ])->assertCreated()->assertJsonPath('items.1.is_required', true)->json('id');
        $this->actingAs($this->advisor)->postJson("/api/quotations/{$id}/send")->assertOk();
        $quotation = Quotation::query()->with('items')->findOrFail($id);

        // Khách đồng ý công nhưng từ chối phụ tùng bắt buộc → cả báo giá bị từ chối, không có dòng nào được duyệt.
        $this->actingAs($this->customerAccount)->postJson("/api/me/quotations/{$id}/respond", [
            'responses' => $quotation->items->map(fn ($item) => ['item_id' => $item->id, 'is_approved' => $item->item_type === 'SERVICE'])->all(),
        ])->assertOk()->assertJsonPath('status', Quotation::REJECTED);
        $this->assertSame(0, $quotation->items()->where('is_approved', true)->count());
    }

    public function test_quotation_rejects_duplicate_lines(): void
    {
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/quotations", [
            'items' => [
                ['item_type' => 'PART', 'part_id' => $this->part->id, 'quantity' => 1],
                ['item_type' => 'PART', 'part_id' => $this->part->id, 'quantity' => 1],
            ],
        ])->assertUnprocessable()->assertJsonPath('message', 'Báo giá có hạng mục bị trùng. Gộp lại một dòng và tăng số lượng.');
        $this->assertSame(0, Quotation::query()->count());
    }

    public function test_discount_cannot_exceed_quotation_or_make_invoice_negative(): void
    {
        // Giảm giá lớn hơn tổng các dòng → không lưu báo giá.
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/quotations", [
            'discount_amount' => 2000000,
            'items' => [['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 1]],
        ])->assertUnprocessable();
        $this->assertSame(0, Quotation::query()->count());

        // Báo giá 1.200.000 giảm 500.000; khách chỉ đồng ý công 300.000 → hoá đơn trừ tối đa 300.000, tổng 0 (không âm).
        $id = $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/quotations", [
            'discount_amount' => 500000,
            'items' => [
                ['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 1],
                ['item_type' => 'PART', 'part_id' => $this->part->id, 'quantity' => 2],
            ],
        ])->assertCreated()->json('id');
        $this->actingAs($this->advisor)->postJson("/api/quotations/{$id}/send")->assertOk();
        $quotation = Quotation::query()->with('items')->findOrFail($id);
        $this->actingAs($this->customerAccount)->postJson("/api/me/quotations/{$id}/respond", [
            'responses' => $quotation->items->map(fn ($item) => ['item_id' => $item->id, 'is_approved' => $item->item_type === 'SERVICE'])->all(),
        ])->assertOk();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/start-repair")->assertOk();
        WorkItem::query()->where('repair_order_id', $this->repairOrder->id)->update(['status' => WorkItem::COMPLETED]);
        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/complete")->assertOk();

        $this->actingAs($this->advisor)->postJson("/api/repair-orders/{$this->repairOrder->id}/invoice")
            ->assertCreated()
            ->assertJsonPath('subtotal', '300000.00')
            ->assertJsonPath('discount_amount', '300000.00')
            ->assertJsonPath('total_amount', '0.00');
    }

    /**
     * Khóa điều kiện để hóa đơn theo bản mới nhất là đúng: không lập báo giá mới khi đang sửa.
     * (Phát sinh trong lúc sửa sẽ có luồng riêng ở P3.)
     */
    public function test_new_quotation_cannot_be_created_while_repair_is_in_progress(): void
    {
        $this->approveAndStartRepair();

        $this->actingAs($this->advisor)
            ->postJson("/api/repair-orders/{$this->repairOrder->id}/quotations", [
                'items' => [['item_type' => 'SERVICE', 'service_id' => $this->service->id, 'quantity' => 1]],
            ])
            ->assertUnprocessable();

        $this->assertSame(1, Quotation::query()->where('repair_order_id', $this->repairOrder->id)->count());
    }

    public function test_order_detail_includes_invoice_items_and_newest_history_first(): void
    {
        $this->completeAndInvoice();

        $response = $this->actingAs($this->advisor)->getJson("/api/repair-orders/{$this->repairOrder->id}")->assertOk();

        $this->assertCount(2, $response->json('invoice.items'));
        $this->assertSame(RepairOrder::COMPLETED, $response->json('status_history.0.status'));
    }

    public function test_order_detail_includes_vehicle_brand_and_model_for_header(): void
    {
        $vehicle = $this->repairOrder->vehicle()->with('model.brand')->first();

        $this->actingAs($this->advisor)->getJson("/api/repair-orders/{$this->repairOrder->id}")
            ->assertOk()
            ->assertJsonPath('vehicle.model.name', $vehicle->model->name)
            ->assertJsonPath('vehicle.model.brand.name', $vehicle->model->brand->name);
    }
}
