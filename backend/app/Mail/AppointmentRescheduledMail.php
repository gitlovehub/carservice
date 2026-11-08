<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/** Báo khách: cố vấn đã đổi lịch hẹn (giờ cũ → giờ mới, lý do). */
class AppointmentRescheduledMail extends Mailable
{
    use Queueable, SerializesModels;

    /** @param array{appointment_date: string, appointment_time: string} $old */
    public function __construct(public Appointment $appointment, public array $old, public string $reason) {}

    public function build(): self
    {
        return $this->subject("Lịch hẹn {$this->appointment->appointment_code} đã được đổi – CarService")
            ->view('emails.appointment-rescheduled');
    }
}
