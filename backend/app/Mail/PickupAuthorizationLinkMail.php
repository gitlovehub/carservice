<?php

namespace App\Mail;

use App\Models\RepairOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** Link để chủ xe tự khai người được ủy quyền nhận xe (không cần tài khoản). */
class PickupAuthorizationLinkMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public RepairOrder $order, public string $linkUrl, public int $ttlHours) {}

    public function build(): self
    {
        $this->order->loadMissing('customer', 'vehicle.model.brand');
        $vehicle = $this->order->vehicle;
        $name = trim(($vehicle?->model?->brand?->name ?? '').' '.($vehicle?->model?->name ?? ''));
        $plate = $vehicle?->license_plate ?: 'xxx.xx';

        return $this->subject('Ủy quyền người nhận xe – CarService')->view('emails.pickup-authorization-link', [
            'customerName' => $this->order->customer?->full_name ?? 'quý khách',
            'orderCode' => $this->order->repair_order_code,
            'vehicleText' => $name !== '' ? "{$name} · {$plate}" : $plate,
        ]);
    }
}
