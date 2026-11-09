<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Employee;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Part;
use App\Models\Payment;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\RepairOrder;
use App\Models\RepairOrderStatusHistory;
use App\Models\Review;
use App\Models\Service;
use App\Models\TechnicianProfile;
use App\Models\UsedPart;
use App\Models\Vehicle;
use App\Models\WorkItem;
use App\Services\AppointmentActivityService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Dữ liệu vận hành mẫu cho khu Admin (chạy riêng, KHÔNG nằm trong DatabaseSeeder):
 *   php artisan db:seed --class=DemoOperationsSeeder
 *
 * Đi đúng luồng nghiệp vụ trong ~60 ngày gần nhất và 7 ngày tới:
 * lịch hẹn → phiếu sửa chữa (lịch sử trạng thái) → báo giá → công việc + xuất kho
 * → hoá đơn → thanh toán → đánh giá, kèm nhập kho định kỳ và nhật ký thao tác lịch hẹn.
 *
 * - Dùng danh mục thật (dịch vụ, phụ tùng + tồn kho, khách hàng + xe, cố vấn, kỹ thuật viên).
 * - Tiền khớp nhau: dòng = SL × đơn giá; hoá đơn = tổng dòng − giảm giá; đã thanh toán = tổng hoá đơn.
 * - Tồn kho không âm: thiếu thì có phiếu nhập trước khi xuất.
 * - Mã chứng từ có đoạn "DM" (APT-…-DM0001, RO-2026-DM0001…) để nhận biết; chạy lại không tạo trùng.
 * - Ngẫu nhiên có seed cố định → mỗi lần chạy trên cùng danh mục cho cùng kết quả.
 */
class DemoOperationsSeeder extends Seeder
{
    public const MARK = 'DM';

    private const DAYS_BACK = 60;

    private const DAYS_AHEAD = 7;

    private const SLOTS = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];

    private const SYMPTOMS = [
        'Xe có tiếng kêu ở gầm khi đi qua gờ giảm tốc.',
        'Điều hoà kém lạnh, có mùi ẩm.',
        'Phanh kêu rít khi đạp nhẹ.',
        'Đèn báo kiểm tra động cơ sáng.',
        'Xe rung nhẹ ở tốc độ 80 km/h.',
        'Đến hạn bảo dưỡng định kỳ.',
        'Ắc quy yếu, khó khởi động buổi sáng.',
        'Lốp mòn không đều, xe hơi lệch lái.',
    ];

    private const REVIEW_COMMENTS = [
        5 => [
            'Tư vấn rõ ràng, báo giá trước khi làm, xe giao đúng hẹn.',
            'Kỹ thuật viên làm kỹ, có gửi ảnh phụ tùng cũ cho tôi xem.',
            'Rất hài lòng, xe chạy êm hẳn sau khi bảo dưỡng.',
            'Gara sạch sẽ, nhân viên nhiệt tình, sẽ quay lại.',
        ],
        4 => [
            'Dịch vụ tốt, chỉ phải chờ hơi lâu lúc nhận xe.',
            'Giá hợp lý, làm cẩn thận. Mong có thêm chỗ đỗ xe.',
            'Ổn, cố vấn giải thích dễ hiểu.',
        ],
        3 => [
            'Xe sửa xong nhưng trễ hẹn gần 2 tiếng.',
            'Chất lượng ổn nhưng giá phụ tùng hơi cao.',
        ],
        2 => [
            'Phải quay lại lần hai mới hết tiếng kêu.',
        ],
    ];

    private const REPLIES = [
        'Cảm ơn anh/chị đã tin tưởng CarService. Hẹn gặp lại ở lần bảo dưỡng tới!',
        'Gara xin cảm ơn góp ý, chúng tôi sẽ cải thiện thời gian chờ nhận xe.',
        'Xin lỗi anh/chị vì sự bất tiện. Cố vấn sẽ liên hệ để hỗ trợ thêm.',
    ];

    private int $seq = 0;

    private CarbonImmutable $now;

    /** @var array<int, Inventory> theo part_id */
    private array $inventories = [];

    public function run(): void
    {
        if (Appointment::query()->where('appointment_code', 'like', '%-'.self::MARK.'%')->exists()) {
            $this->command?->warn('Đã có dữ liệu vận hành mẫu (mã chứa "-DM"), bỏ qua.');

            return;
        }

        mt_srand(20261109);
        $this->now = CarbonImmutable::now()->startOfMinute();

        $context = $this->loadContext();

        Model::unguarded(function () use ($context): void {
            DB::transaction(function () use ($context): void {
                $this->restock($context['parts'], $this->now->subDays(self::DAYS_BACK + 2), 'Nhập kho đầu kỳ');

                for ($offset = -self::DAYS_BACK; $offset <= self::DAYS_AHEAD; $offset++) {
                    $day = $this->now->startOfDay()->addDays($offset);
                    if ($offset % 14 === 0 && $offset < 0) {
                        $this->restock($context['parts'], $day->setTime(7, 30), 'Nhập kho định kỳ');
                    }
                    $this->seedDay($day, $offset, $context);
                }
            });
        });

        $this->command?->info(sprintf('Dữ liệu vận hành mẫu: %d lịch hẹn, %d phiếu, %d hoá đơn, %d thanh toán, %d đánh giá.',
            Appointment::query()->where('appointment_code', 'like', '%-'.self::MARK.'%')->count(),
            RepairOrder::query()->where('repair_order_code', 'like', '%-'.self::MARK.'%')->count(),
            Invoice::query()->where('invoice_code', 'like', '%-'.self::MARK.'%')->count(),
            Payment::query()->where('transaction_code', 'like', '%-'.self::MARK.'%')->count(),
            Review::query()->whereHas('repairOrder', fn ($q) => $q->where('repair_order_code', 'like', '%-'.self::MARK.'%'))->count(),
        ));
    }

    /**
     * @return array{vehicles: Collection<int, Vehicle>, advisors: Collection<int, Employee>, technicians: Collection<int, TechnicianProfile>, services: Collection<int, Service>, parts: Collection<int, Part>}
     */
    private function loadContext(): array
    {
        $vehicles = Vehicle::query()->whereHas('customer')->with('customer')->get();
        $advisors = Employee::query()->where('status', 'ACTIVE')
            ->whereHas('account', fn ($q) => $q->where('role', Account::ROLE_ADVISOR))->with('account')->get();
        $technicians = TechnicianProfile::query()->get();
        $services = Service::query()->where('status', 'ACTIVE')->where('base_price', '>', 0)->get();
        $parts = Part::query()->where('status', 'ACTIVE')->where('sell_price', '>', 0)->get();

        foreach ([
            'xe có chủ' => $vehicles, 'cố vấn' => $advisors, 'kỹ thuật viên' => $technicians,
            'dịch vụ có giá' => $services, 'phụ tùng có giá' => $parts,
        ] as $label => $items) {
            if ($items->isEmpty()) {
                throw new RuntimeException("Thiếu {$label}: chạy DatabaseSeeder (danh mục, tài khoản demo) trước.");
            }
        }

        foreach ($parts as $part) {
            $this->inventories[$part->id] = Inventory::query()->firstOrCreate(['part_id' => $part->id], ['quantity' => 0, 'min_quantity' => 5]);
        }

        return compact('vehicles', 'advisors', 'technicians', 'services', 'parts');
    }

    /**
     * @param  array<string, Collection<int, mixed>>  $context
     */
    private function seedDay(CarbonImmutable $day, int $offset, array $context): void
    {
        if ($day->isSunday() && mt_rand(1, 3) > 1) {
            return; // Chủ nhật ít khách.
        }

        $count = $day->isSaturday() ? mt_rand(3, 6) : mt_rand(2, 5);
        $slots = self::SLOTS;
        shuffle($slots);

        foreach (array_slice($slots, 0, $count) as $slot) {
            $at = $day->setTimeFromTimeString($slot);
            $vehicle = $context['vehicles']->random();
            $advisor = $context['advisors']->random();
            $services = $context['services']->random(min(mt_rand(1, 3), $context['services']->count()));

            $status = $this->appointmentStatus($at, $offset);
            $appointment = Appointment::query()->create([
                'appointment_code' => sprintf('APT-%s-%s%04d', $at->format('Ymd'), self::MARK, ++$this->seq),
                'customer_id' => $vehicle->customer_id,
                'vehicle_id' => $vehicle->id,
                'appointment_date' => $at->toDateString(),
                'appointment_time' => $at->format('H:i:s'),
                'request_type' => mt_rand(1, 3) === 1 ? 'REPAIR' : 'MAINTENANCE',
                'symptom_description' => self::SYMPTOMS[array_rand(self::SYMPTOMS)],
                'status' => $status,
                'cancel_reason' => $status === 'CANCELLED' ? 'Khách bận đột xuất, hẹn lại sau.' : null,
                'handled_by_account_id' => $status === 'PENDING' ? null : $advisor->account_id,
                'created_at' => $at->subDays(mt_rand(1, 6))->setTime(mt_rand(7, 21), mt_rand(0, 59)),
                'updated_at' => $at,
            ]);
            $appointment->syncRequestedItems($services->modelKeys(), []);

            if (in_array($status, ['CONFIRMED', 'CHECKED_IN', 'CANCELLED'], true)) {
                $this->audit($advisor->account_id, AppointmentActivityService::CONFIRMED, $appointment, ['status' => 'PENDING'], ['status' => 'CONFIRMED'], $at->subDay()->setTime(17, mt_rand(0, 59)));
            }
            if ($status === 'CANCELLED') {
                $this->audit($advisor->account_id, AppointmentActivityService::CANCELLED, $appointment, ['status' => 'CONFIRMED'], ['status' => 'CANCELLED'], $at->subHours(3));
            }
            if ($status === 'CHECKED_IN') {
                $this->audit($advisor->account_id, AppointmentActivityService::CHECKED_IN, $appointment, ['status' => 'CONFIRMED'], ['status' => 'CHECKED_IN'], $at->addMinutes(mt_rand(0, 20)));
                $this->seedRepairOrder($appointment, $vehicle, $advisor, $services, $at, $offset, $context);
            }
        }
    }

    private function appointmentStatus(CarbonImmutable $at, int $offset): string
    {
        if ($at->greaterThan($this->now)) {
            return $offset <= 1 || mt_rand(1, 3) > 1 ? 'CONFIRMED' : 'PENDING';
        }
        $roll = mt_rand(1, 100);

        return match (true) {
            $roll <= 8 => 'CANCELLED',
            $roll <= 12 => 'NO_SHOW',
            default => 'CHECKED_IN',
        };
    }

    /**
     * Trạng thái phiếu theo tuổi: phiếu cũ đã bàn giao, phiếu mấy ngày gần đây còn đang xử lý.
     */
    private function targetStatus(int $offset): string
    {
        $age = -$offset;
        if ($age >= 4) {
            return mt_rand(1, 100) <= 6 ? RepairOrder::CLOSED : RepairOrder::HANDED_OVER;
        }
        $pool = match ($age) {
            3 => [RepairOrder::HANDED_OVER, RepairOrder::HANDED_OVER, RepairOrder::COMPLETED, RepairOrder::WAITING_FOR_PARTS],
            2 => [RepairOrder::HANDED_OVER, RepairOrder::COMPLETED, RepairOrder::IN_PROGRESS, RepairOrder::WAITING_FOR_PARTS],
            1 => [RepairOrder::COMPLETED, RepairOrder::IN_PROGRESS, RepairOrder::WAITING_APPROVAL, RepairOrder::IN_PROGRESS],
            default => [RepairOrder::RECEIVED, RepairOrder::INSPECTING, RepairOrder::QUOTING, RepairOrder::WAITING_APPROVAL, RepairOrder::IN_PROGRESS],
        };

        return $pool[array_rand($pool)];
    }

    /**
     * @param  Collection<int, Service>  $services
     * @param  array<string, Collection<int, mixed>>  $context
     */
    private function seedRepairOrder(Appointment $appointment, Vehicle $vehicle, Employee $advisor, Collection $services, CarbonImmutable $at, int $offset, array $context): void
    {
        $target = $this->targetStatus($offset);
        $received = $at->addMinutes(mt_rand(5, 25));
        $mileage = max(1000, (int) ($vehicle->mileage ?? 0) + mt_rand(500, 4000));

        // Chuỗi trạng thái hợp lệ theo RepairOrder::TRANSITIONS.
        $path = [RepairOrder::RECEIVED, RepairOrder::INSPECTING, RepairOrder::QUOTING, RepairOrder::WAITING_APPROVAL, RepairOrder::IN_PROGRESS];
        $withParts = $target === RepairOrder::WAITING_FOR_PARTS || mt_rand(1, 100) <= 12;
        if ($withParts) {
            $path[] = RepairOrder::WAITING_FOR_PARTS;
            if ($target !== RepairOrder::WAITING_FOR_PARTS) {
                $path[] = RepairOrder::IN_PROGRESS;
            }
        }
        if (! in_array($target, [RepairOrder::WAITING_FOR_PARTS], true)) {
            $path = [...$path, RepairOrder::COMPLETED, RepairOrder::HANDED_OVER];
        }
        if ($target === RepairOrder::CLOSED) {
            $path = [RepairOrder::RECEIVED, RepairOrder::INSPECTING, RepairOrder::QUOTING, RepairOrder::WAITING_APPROVAL, RepairOrder::CLOSED];
        } else {
            $path = array_slice($path, 0, array_search($target, $path, true) + 1);
        }

        $times = [];
        $history = [];
        $clock = $received;
        foreach ($path as $index => $status) {
            $clock = $index === 0 ? $clock : $clock->addMinutes(match ($status) {
                RepairOrder::WAITING_FOR_PARTS => mt_rand(60, 180),
                RepairOrder::IN_PROGRESS => mt_rand(30, 240),
                RepairOrder::COMPLETED => mt_rand(60, 300),
                RepairOrder::HANDED_OVER => mt_rand(60, 60 * 24),
                default => mt_rand(15, 60),
            });
            $times[$status] = $this->cap($clock);
            $history[] = [$status, $times[$status]];
        }

        $order = RepairOrder::query()->create([
            'repair_order_code' => sprintf('RO-%s-%s%04d', $at->format('Y'), self::MARK, $this->seq),
            'appointment_id' => $appointment->id,
            'source' => RepairOrder::SOURCE_APPOINTMENT,
            'customer_id' => $vehicle->customer_id,
            'vehicle_id' => $vehicle->id,
            'advisor_id' => $advisor->id,
            'mileage_received' => $mileage,
            'initial_condition' => 'Ngoại thất bình thường, không có vết xước mới. Nhiên liệu khoảng 1/2 bình.',
            'status' => $target,
            'received_at' => $received,
            'estimated_ready_at' => $received->addHours(mt_rand(3, 30)),
            'completed_at' => $times[RepairOrder::COMPLETED] ?? null,
            'handed_over_at' => $times[RepairOrder::HANDED_OVER] ?? null,
            'closed_at' => $times[RepairOrder::CLOSED] ?? null,
            'close_reason' => $target === RepairOrder::CLOSED ? 'CUSTOMER_DECLINED_QUOTE' : null,
            'note' => $appointment->symptom_description,
            'created_at' => $received,
            'updated_at' => end($history)[1],
        ]);

        foreach ($history as [$status, $time]) {
            RepairOrderStatusHistory::query()->create([
                'repair_order_id' => $order->id,
                'status' => $status,
                'changed_by_account_id' => $advisor->account_id,
                'note' => $status === RepairOrder::CLOSED ? 'Khách không đồng ý báo giá.' : null,
                'created_at' => $time,
            ]);
        }

        if (! isset($times[RepairOrder::QUOTING])) {
            return; // Mới tiếp nhận / đang kiểm tra: chưa có báo giá.
        }

        $parts = $context['parts']->random(min(mt_rand(0, 3), $context['parts']->count()));
        $quotation = $this->seedQuotation($order, $advisor, $services, $parts, $times, $target);

        if (! isset($times[RepairOrder::IN_PROGRESS])) {
            return;
        }

        $technician = $context['technicians']->random();
        $done = isset($times[RepairOrder::COMPLETED]);
        foreach ($services as $service) {
            WorkItem::query()->create([
                'repair_order_id' => $order->id,
                'service_id' => $service->id,
                'technician_id' => $technician->id,
                'description' => $service->name,
                'status' => $done ? WorkItem::COMPLETED : WorkItem::IN_PROGRESS,
                'started_at' => $times[RepairOrder::IN_PROGRESS],
                'completed_at' => $done ? $times[RepairOrder::COMPLETED] : null,
                'standard_minutes' => $service->estimated_minutes,
                'created_at' => $times[RepairOrder::IN_PROGRESS],
                'updated_at' => $times[RepairOrder::COMPLETED] ?? $times[RepairOrder::IN_PROGRESS],
            ]);
        }

        if ($target !== RepairOrder::WAITING_FOR_PARTS) {
            foreach ($parts as $part) {
                $this->usePart($order, $part, mt_rand(1, 2), $times[RepairOrder::IN_PROGRESS]);
            }
        }

        if ($done) {
            $this->seedInvoice($order, $quotation, $times, $target);
        }
    }

    /**
     * @param  Collection<int, Service>  $services
     * @param  Collection<int, Part>  $parts
     * @param  array<string, CarbonImmutable>  $times
     */
    private function seedQuotation(RepairOrder $order, Employee $advisor, Collection $services, Collection $parts, array $times, string $target): Quotation
    {
        $sentAt = $times[RepairOrder::WAITING_APPROVAL] ?? $times[RepairOrder::QUOTING];
        $approved = isset($times[RepairOrder::IN_PROGRESS]);
        $status = match (true) {
            $target === RepairOrder::CLOSED => Quotation::REJECTED,
            $approved => Quotation::APPROVED,
            isset($times[RepairOrder::WAITING_APPROVAL]) => Quotation::SENT,
            default => Quotation::DRAFT,
        };

        $quotation = Quotation::query()->create([
            'quotation_code' => sprintf('QT-%s-%s%04d', $sentAt->format('Y'), self::MARK, $this->seq),
            'repair_order_id' => $order->id,
            'advisor_id' => $advisor->id,
            'version' => 1,
            'type' => Quotation::TYPE_INITIAL,
            'subtotal' => 0,
            'discount_amount' => 0,
            'total_amount' => 0,
            'status' => $status,
            'valid_until' => $sentAt->addDays(7)->toDateString(),
            'customer_response_at' => in_array($status, [Quotation::APPROVED, Quotation::REJECTED], true) ? $sentAt->addMinutes(mt_rand(10, 90)) : null,
            'created_at' => $times[RepairOrder::QUOTING],
            'updated_at' => $sentAt,
        ]);

        $subtotal = 0;
        foreach ($services as $service) {
            $subtotal += $this->quotationItem($quotation, QuotationItem::TYPE_SERVICE, $service->id, null, $service->name, 1, (float) $service->base_price, $approved);
        }
        foreach ($parts as $part) {
            $subtotal += $this->quotationItem($quotation, QuotationItem::TYPE_PART, null, $part->id, $part->name, mt_rand(1, 2), (float) $part->sell_price, $approved);
        }
        $quotation->update(['subtotal' => $subtotal, 'total_amount' => $subtotal]);

        return $quotation;
    }

    private function quotationItem(Quotation $quotation, string $type, ?int $serviceId, ?int $partId, string $description, int $quantity, float $price, bool $approved): float
    {
        $amount = round($quantity * $price, 2);
        QuotationItem::query()->create([
            'quotation_id' => $quotation->id,
            'item_type' => $type,
            'service_id' => $serviceId,
            'part_id' => $partId,
            'description' => $description,
            'quantity' => $quantity,
            'unit_price' => $price,
            'amount' => $amount,
            'is_approved' => $approved,
            'created_at' => $quotation->created_at,
        ]);

        return $amount;
    }

    /**
     * @param  array<string, CarbonImmutable>  $times
     */
    private function seedInvoice(RepairOrder $order, Quotation $quotation, array $times, string $target): void
    {
        $issuedAt = $times[RepairOrder::COMPLETED];
        $items = $quotation->items()->get();
        $subtotal = (float) $items->sum('amount');
        $discount = mt_rand(1, 100) <= 15 ? round($subtotal * 0.05, -3) : 0.0;
        $total = $subtotal - $discount;
        $handedOver = $target === RepairOrder::HANDED_OVER;

        $paid = $handedOver ? $total : (mt_rand(1, 3) === 1 ? round($total * 0.5, -3) : 0.0);
        $status = match (true) {
            $paid >= $total => Invoice::PAID,
            $paid > 0 => Invoice::PARTIALLY_PAID,
            default => Invoice::UNPAID,
        };

        $invoice = Invoice::query()->create([
            'repair_order_id' => $order->id,
            'invoice_code' => sprintf('INV-%s-%s%04d', $issuedAt->format('Y'), self::MARK, $this->seq),
            'subtotal' => $subtotal,
            'discount_amount' => $discount,
            'total_amount' => $total,
            'status' => $status,
            'created_at' => $issuedAt,
            'updated_at' => $times[RepairOrder::HANDED_OVER] ?? $issuedAt,
        ]);

        foreach ($items as $item) {
            InvoiceItem::query()->create([
                'invoice_id' => $invoice->id,
                'item_type' => $item->item_type,
                'service_id' => $item->service_id,
                'part_id' => $item->part_id,
                'description' => $item->description,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'amount' => $item->amount,
                'created_at' => $issuedAt,
            ]);
        }

        if ($paid <= 0) {
            return;
        }

        $method = [Payment::DIRECT, Payment::DIRECT, Payment::QR, Payment::VNPAY][mt_rand(0, 3)];
        $paidAt = $times[RepairOrder::HANDED_OVER] ?? $issuedAt->addMinutes(30);
        Payment::query()->create([
            'invoice_id' => $invoice->id,
            'amount' => $paid,
            'payment_method' => $method,
            'transaction_code' => sprintf('PAY-%s-%s%04d', $paidAt->format('Ymd'), self::MARK, $this->seq),
            'gateway_txn_ref' => $method === Payment::VNPAY ? sprintf('VNP%s%04d', $paidAt->format('YmdHis'), $this->seq) : null,
            'gateway_response_code' => $method === Payment::VNPAY ? '00' : null,
            'bank_code' => $method === Payment::VNPAY ? 'NCB' : null,
            'status' => Payment::SUCCESS,
            'paid_at' => $paidAt,
            'created_at' => $paidAt,
            'updated_at' => $paidAt,
        ]);

        if ($handedOver && mt_rand(1, 100) <= 55) {
            $this->seedReview($order, $paidAt);
        }
    }

    private function seedReview(RepairOrder $order, CarbonImmutable $handedOverAt): void
    {
        $roll = mt_rand(1, 100);
        $rating = match (true) {
            $roll <= 55 => 5,
            $roll <= 85 => 4,
            $roll <= 96 => 3,
            default => 2,
        };
        $at = $this->cap($handedOverAt->addHours(mt_rand(2, 48)));
        $replied = $rating <= 3 || mt_rand(1, 2) === 1;

        Review::query()->create([
            'repair_order_id' => $order->id,
            'customer_id' => $order->customer_id,
            'overall_rating' => $rating,
            'advisor_rating' => min(5, $rating + mt_rand(0, 1)),
            'technician_rating' => max(1, $rating - mt_rand(0, 1)),
            'comment' => self::REVIEW_COMMENTS[$rating][array_rand(self::REVIEW_COMMENTS[$rating])],
            'reply' => $replied ? self::REPLIES[$rating <= 3 ? 2 : mt_rand(0, 1)] : null,
            'replied_at' => $replied ? $this->cap($at->addHours(mt_rand(1, 20))) : null,
            'created_at' => $at,
            'updated_at' => $at,
        ]);
    }

    /** Không để mốc thời gian vượt quá hiện tại. */
    private function cap(CarbonImmutable $time): CarbonImmutable
    {
        return $time->greaterThan($this->now) ? $this->now : $time;
    }

    private function usePart(RepairOrder $order, Part $part, int $quantity, CarbonImmutable $at): void
    {
        $inventory = $this->inventories[$part->id];
        if ($inventory->quantity < $quantity) {
            $this->restockOne($inventory, $at->subHour(), 'Nhập bổ sung do thiếu hàng');
        }

        $used = UsedPart::query()->create([
            'repair_order_id' => $order->id,
            'part_id' => $part->id,
            'quantity' => $quantity,
            'unit_price' => $part->sell_price,
            'used_at' => $at,
            'created_at' => $at,
        ]);

        InventoryTransaction::query()->create([
            'inventory_id' => $inventory->id,
            'repair_order_id' => $order->id,
            'used_part_id' => $used->id,
            'transaction_type' => InventoryTransaction::TYPE_OUT,
            'quantity' => $quantity,
            'note' => "Xuất cho phiếu {$order->repair_order_code}",
            'created_at' => $at,
        ]);

        $inventory->quantity -= $quantity;
        $inventory->save();
    }

    /**
     * @param  Collection<int, Part>  $parts
     */
    private function restock(Collection $parts, CarbonImmutable $at, string $note): void
    {
        foreach ($parts as $part) {
            $inventory = $this->inventories[$part->id];
            if ($inventory->quantity < max(10, $inventory->min_quantity * 2)) {
                $this->restockOne($inventory, $at, $note);
            }
        }
    }

    private function restockOne(Inventory $inventory, CarbonImmutable $at, string $note): void
    {
        $quantity = max(10, $inventory->min_quantity * 3) - min($inventory->quantity, 5);
        InventoryTransaction::query()->create([
            'inventory_id' => $inventory->id,
            'transaction_type' => InventoryTransaction::TYPE_IN,
            'quantity' => $quantity,
            'note' => $note,
            'created_at' => $at,
        ]);
        $inventory->quantity += $quantity;
        $inventory->save();
    }

    /**
     * @param  array<string, mixed>  $old
     * @param  array<string, mixed>  $new
     */
    private function audit(int $accountId, string $action, Appointment $appointment, array $old, array $new, CarbonImmutable $at): void
    {
        AuditLog::query()->create([
            'account_id' => $accountId,
            'action' => $action,
            'auditable_type' => Appointment::class,
            'auditable_id' => $appointment->id,
            'old_values' => $old,
            'new_values' => $new,
            'reason' => $action === AppointmentActivityService::CANCELLED ? $appointment->cancel_reason : null,
            'ip_address' => '10.0.0.'.mt_rand(10, 60),
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/157.0',
            'created_at' => $at,
            'updated_at' => $at,
        ]);
    }
}
