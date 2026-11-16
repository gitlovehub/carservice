<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Notification;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use Illuminate\Support\Carbon;

/**
 * Nơi DUY NHẤT tạo thông báo WEB (chuông ở header) cho khách khi cố vấn / admin / hệ thống làm gì đó liên quan tới họ.
 *
 * Nội dung nói theo XE của khách ("xe BMW Series 7 735Li (51A-123.45)") thay vì mã lịch / mã phiếu — khách nhận ra xe
 * mình ngay, không cần nhớ mã. Mỗi thông báo gắn appointment_id hoặc repair_order_id để FE mở thẳng đúng mục.
 * Khách vãng lai (không có tài khoản) thì bỏ qua — họ không có chuông để xem.
 */
class CustomerNotifier
{
    public function appointmentConfirmed(Appointment $appointment): void
    {
        $this->forAppointment($appointment, Notification::TYPE_APPOINTMENT_CONFIRMED, 'Lịch hẹn đã được xác nhận',
            "Gara đã xác nhận lịch hẹn cho {$this->vehicle($appointment->vehicle)} lúc {$this->when($appointment)}. Hẹn gặp bạn!");
    }

    public function appointmentCancelled(Appointment $appointment, string $reason): void
    {
        $this->forAppointment($appointment, Notification::TYPE_APPOINTMENT_CANCELLED, 'Lịch hẹn đã bị hủy',
            "Gara đã hủy lịch hẹn của {$this->vehicle($appointment->vehicle)} lúc {$this->when($appointment)}. Lý do: {$reason}");
    }

    public function appointmentRescheduled(Appointment $appointment, string $reason): void
    {
        $this->forAppointment($appointment, Notification::TYPE_APPOINTMENT_RESCHEDULED, 'Lịch hẹn đã được đổi',
            "Lịch hẹn của {$this->vehicle($appointment->vehicle)} đổi sang {$this->when($appointment)}. Lý do: {$reason}");
    }

    public function quotationSent(RepairOrder $order, bool $supplement): void
    {
        $supplement
            ? $this->forOrder($order, Notification::TYPE_QUOTATION_SENT, 'Có báo giá phát sinh cần bạn duyệt',
                "Trong lúc sửa {$this->vehicle($order->vehicle)}, gara phát hiện thêm hạng mục cần làm. Xem và duyệt báo giá phát sinh.")
            : $this->forOrder($order, Notification::TYPE_QUOTATION_SENT, 'Báo giá mới cần bạn duyệt',
                "Gara đã gửi báo giá cho {$this->vehicle($order->vehicle)}. Gara chỉ sửa sau khi bạn đồng ý.");
    }

    public function repairStarted(RepairOrder $order): void
    {
        $this->forOrder($order, Notification::TYPE_REPAIR_STARTED, 'Xe của bạn bắt đầu được sửa',
            ucfirst($this->vehicle($order->vehicle)).' đã bắt đầu được sửa theo các hạng mục bạn đồng ý.');
    }

    public function waitingForParts(RepairOrder $order): void
    {
        $this->forOrder($order, Notification::TYPE_WAITING_FOR_PARTS, 'Xe đang chờ phụ tùng',
            ucfirst($this->vehicle($order->vehicle)).' tạm dừng sửa để chờ phụ tùng. Gara sẽ báo ngay khi hàng về.');
    }

    public function partArrived(RepairOrder $order, string $partName): void
    {
        $this->forOrder($order, Notification::TYPE_PART_ARRIVED, 'Phụ tùng đã về',
            "Phụ tùng {$partName} cho {$this->vehicle($order->vehicle)} đã về gara. Gara sẽ tiếp tục sửa chữa.");
    }

    public function repairCompleted(RepairOrder $order): void
    {
        $this->forOrder($order, Notification::TYPE_REPAIR_COMPLETED, 'Xe đã sửa xong',
            ucfirst($this->vehicle($order->vehicle)).' đã sửa xong. Gara đang lập hóa đơn để bạn thanh toán và nhận xe.');
    }

    public function invoiceIssued(RepairOrder $order, float $total): void
    {
        $this->forOrder($order, Notification::TYPE_INVOICE_ISSUED, 'Hóa đơn đã sẵn sàng',
            "Hóa đơn sửa chữa {$this->vehicle($order->vehicle)}: {$this->money($total)}. Bạn có thể thanh toán online hoặc tại quầy khi nhận xe.");
    }

    public function paymentReceived(RepairOrder $order, float $amount, bool $fullyPaid): void
    {
        $this->forOrder($order, Notification::TYPE_PAYMENT_RECEIVED, 'Gara đã nhận thanh toán',
            "Đã nhận {$this->money($amount)} cho hóa đơn sửa chữa {$this->vehicle($order->vehicle)}.".($fullyPaid ? ' Hóa đơn đã thanh toán đủ.' : ''));
    }

    public function handoverSubmitted(RepairOrder $order, bool $checkOut): void
    {
        $this->forOrder($order, Notification::TYPE_HANDOVER_SUBMITTED, 'Biên bản cần bạn xác nhận',
            ($checkOut ? 'Biên bản trả xe' : 'Biên bản nhận xe')." của {$this->vehicle($order->vehicle)} đã sẵn sàng. Kiểm tra và xác nhận để gara tiếp tục.");
    }

    public function repairClosed(RepairOrder $order, string $note): void
    {
        $this->forOrder($order, Notification::TYPE_REPAIR_CLOSED, 'Phiếu sửa chữa đã đóng',
            "Gara đã đóng phiếu sửa chữa của {$this->vehicle($order->vehicle)}. {$note}");
    }

    public function reviewInvite(RepairOrder $order): void
    {
        $this->forOrder($order, Notification::TYPE_REVIEW_INVITE, 'Mời bạn đánh giá dịch vụ',
            ucfirst($this->vehicle($order->vehicle)).' đã được bàn giao. Dành một phút đánh giá để gara phục vụ bạn tốt hơn.');
    }

    public function reviewReplied(RepairOrder $order): void
    {
        $this->forOrder($order, Notification::TYPE_REVIEW_REPLIED, 'Gara đã phản hồi đánh giá của bạn',
            "CarService đã trả lời đánh giá của bạn cho lần sửa {$this->vehicle($order->vehicle)}.");
    }

    /* ------------------------------------------------------------------ */

    /**
     * "xe BMW Series 7 735Li M Sport (51A-123.45)" — hãng + dòng + phiên bản (bỏ lặp khi tên phiên bản đã chứa
     * tên dòng, vd. "296" + "296 GTB" → "296 GTB") + biển số nếu có. Thiếu thông tin → "xe của bạn".
     */
    private function vehicle(?Vehicle $vehicle): string
    {
        if ($vehicle === null) {
            return 'xe của bạn';
        }
        $vehicle->loadMissing('model.brand', 'trim');
        $model = (string) $vehicle->model?->name;
        $trim = (string) ($vehicle->trim?->name ?: $vehicle->variant);
        $parts = [
            $vehicle->model?->brand?->name,
            $trim !== '' && $model !== '' && str_starts_with(mb_strtolower($trim), mb_strtolower($model)) ? null : $model,
            $trim,
        ];
        $name = trim(implode(' ', array_filter($parts, fn ($part) => filled($part))));
        if ($name === '') {
            return 'xe của bạn';
        }

        return 'xe '.$name.($vehicle->license_plate ? " ({$vehicle->license_plate})" : '');
    }

    private function forAppointment(Appointment $appointment, string $type, string $title, string $content): void
    {
        $this->create($appointment->customer()->value('account_id'), $type, $title, $content, ['appointment_id' => $appointment->id]);
    }

    private function forOrder(RepairOrder $order, string $type, string $title, string $content): void
    {
        $this->create($order->customer()->value('account_id'), $type, $title, $content, ['repair_order_id' => $order->id]);
    }

    /** @param  array{appointment_id?: int, repair_order_id?: int}  $target */
    private function create(?int $accountId, string $type, string $title, string $content, array $target): void
    {
        if ($accountId === null) {
            return;
        }

        Notification::query()->create([
            ...$target,
            'account_id' => $accountId,
            'type' => $type,
            'title' => mb_substr($title, 0, 150),
            'content' => $content,
            'channel' => 'WEB',
            'status' => 'PENDING',
        ]);
    }

    private function when(Appointment $appointment): string
    {
        return substr((string) $appointment->appointment_time, 0, 5).' ngày '.Carbon::parse($appointment->appointment_date)->format('d/m/Y');
    }

    private function money(float $amount): string
    {
        return number_format($amount, 0, ',', '.').' ₫';
    }
}
