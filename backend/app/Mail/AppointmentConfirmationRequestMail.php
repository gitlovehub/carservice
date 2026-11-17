<?php

namespace App\Mail;

use App\Models\Appointment;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** Cố vấn gửi khách: thông tin lịch hẹn + dịch vụ đã đặt, nút "Xác nhận lịch hẹn" (link có chữ ký). */
class AppointmentConfirmationRequestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Appointment $appointment, public string $confirmUrl) {}

    public function build(): self
    {
        return $this->subject("Xác nhận lịch hẹn {$this->appointment->appointment_code} – CarService")
            ->view('emails.appointment-confirmation-request', self::summary($this->appointment) + ['confirmUrl' => $this->confirmUrl]);
    }

    /**
     * Thông tin lịch hẹn dùng chung cho email và trang xác nhận.
     *
     * @return array<string, mixed>
     */
    public static function summary(Appointment $appointment): array
    {
        $appointment->loadMissing(['customer', 'vehicle.model.brand', 'services', 'packages.services']);
        $vehicle = $appointment->vehicle;
        $car = trim(implode(' ', array_filter([$vehicle?->model?->brand?->name, $vehicle?->model?->name])));
        $items = $appointment->packages->map(fn ($p) => [
            'tag' => 'Gói', 'name' => $p->name,
            'price' => (float) ($p->pivot->estimated_price ?? 0),
            'includes' => $p->services->pluck('name')->all(),
        ])->concat($appointment->services->map(fn ($s) => [
            'tag' => 'Dịch vụ', 'name' => $s->name,
            'price' => (float) ($s->pivot->estimated_price ?? $s->base_price),
            'includes' => [],
        ]))->values()->all();

        return [
            'code' => $appointment->appointment_code,
            'customerName' => $appointment->customer?->full_name ?: 'Quý khách',
            'when' => substr((string) $appointment->appointment_time, 0, 5).' · '.Carbon::parse($appointment->appointment_date)->format('d/m/Y'),
            'car' => ($car !== '' ? $car.' · ' : '').($vehicle?->license_plate ?: 'chưa có biển số'),
            'items' => $items,
            'total' => array_sum(array_column($items, 'price')),
            'symptom' => $appointment->symptom_description,
            'note' => $appointment->note,
        ];
    }
}
