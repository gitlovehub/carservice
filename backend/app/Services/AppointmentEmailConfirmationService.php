<?php

namespace App\Services;

use App\Mail\AppointmentConfirmationRequestMail;
use App\Models\Account;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Support\GarageDay;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;

/**
 * Xác nhận lịch hẹn qua email: cố vấn gửi mail (kèm dịch vụ khách đặt) → khách bấm nút trong mail → lịch PENDING → CONFIRMED.
 *
 * Link là URL có chữ ký, hết hạn ở giờ hẹn và gắn với ngày giờ hiện tại của lịch ("slot"): đổi lịch thì link cũ vô hiệu.
 * Trang mở bằng GET chỉ hiển thị; phải bấm nút (POST) mới xác nhận — tránh trình quét link của hộp thư tự xác nhận hộ.
 */
class AppointmentEmailConfirmationService
{
    public const SENT = 'appointment.confirmation_email_sent';

    public const CONFIRMED_BY_CUSTOMER = 'appointment.confirmed_by_customer';

    public function __construct(
        private readonly AppointmentActivityService $activity,
        private readonly CustomerNotifier $notifier,
    ) {}

    public function send(Appointment $appointment, Account $actor): string
    {
        if ($appointment->status !== 'PENDING') {
            throw ValidationException::withMessages(['status' => 'Chỉ gửi email xác nhận cho lịch đang chờ xác nhận.']);
        }
        $email = $this->email($appointment);
        if (! $email) {
            throw ValidationException::withMessages(['email' => 'Khách chưa có email. Hãy gọi điện để xác nhận.']);
        }
        if ($this->startsAt($appointment)->isPast()) {
            throw ValidationException::withMessages(['appointment_date' => 'Đã qua giờ hẹn, không gửi email xác nhận được nữa.']);
        }

        $appointment->loadMissing(['customer', 'vehicle.model.brand', 'services', 'packages.services']);
        Mail::to($email)->send(new AppointmentConfirmationRequestMail($appointment, $this->url($appointment)));
        $this->activity->record($appointment, self::SENT, $actor, [], ['email' => $email]);

        return $email;
    }

    public function url(Appointment $appointment): string
    {
        return URL::temporarySignedRoute('appointments.email-confirm', $this->startsAt($appointment), [
            'appointment' => $appointment->id,
            'slot' => $this->slot($appointment),
        ]);
    }

    /** Link còn đúng ngày giờ hiện tại của lịch không (đổi lịch → link cũ hết hiệu lực). */
    public function matchesSlot(Appointment $appointment, string $slot): bool
    {
        return hash_equals($this->slot($appointment), $slot);
    }

    /** Khách bấm xác nhận. Trả về true nếu lần này chuyển PENDING → CONFIRMED. */
    public function confirmByCustomer(Appointment $appointment): bool
    {
        $confirmed = DB::transaction(function () use ($appointment): bool {
            $locked = Appointment::query()->lockForUpdate()->findOrFail($appointment->id);
            if ($locked->status !== 'PENDING') {
                return false;
            }
            $locked->update(['status' => 'CONFIRMED']);
            // Không đổi "người xử lý" (đó là nhân viên); ghi lịch sử dưới tài khoản khách nếu có.
            AuditLog::query()->create([
                'account_id' => $locked->customer?->account_id,
                'action' => self::CONFIRMED_BY_CUSTOMER,
                'auditable_type' => Appointment::class,
                'auditable_id' => $locked->id,
                'old_values' => ['status' => 'PENDING'],
                'new_values' => ['status' => 'CONFIRMED', 'channel' => 'EMAIL'],
                'ip_address' => request()->ip(),
                'user_agent' => substr((string) request()->userAgent(), 0, 1000),
            ]);
            $this->notifier->appointmentConfirmed($locked);

            return true;
        });
        $appointment->refresh();

        return $confirmed;
    }

    public function startsAt(Appointment $appointment): Carbon
    {
        // Giờ hẹn là giờ gara (VN); app chạy UTC.
        return Carbon::parse(Carbon::parse($appointment->appointment_date)->toDateString().' '.substr((string) $appointment->appointment_time, 0, 8), GarageDay::TIMEZONE);
    }

    private function slot(Appointment $appointment): string
    {
        return substr(hash('sha256', $appointment->id.'|'.$this->startsAt($appointment)->format('Y-m-d H:i')), 0, 16);
    }

    private function email(Appointment $appointment): ?string
    {
        $customer = $appointment->customer;

        return $customer?->email ?: $customer?->account?->email;
    }
}
