<?php

namespace App\Http\Controllers;

use App\Mail\AppointmentConfirmationRequestMail;
use App\Models\Appointment;
use App\Services\AppointmentEmailConfirmationService;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * Trang khách mở từ email "Xác nhận lịch hẹn" (không cần đăng nhập — link có chữ ký là quyền truy cập).
 * GET: chỉ hiển thị thông tin + nút. POST (bấm nút): xác nhận lịch.
 */
class AppointmentEmailConfirmationController extends Controller
{
    public function __construct(private readonly AppointmentEmailConfirmationService $service) {}

    public function show(Request $request, int $appointment): View
    {
        return $this->page($request, $appointment, false);
    }

    public function confirm(Request $request, int $appointment): View
    {
        return $this->page($request, $appointment, true);
    }

    private function page(Request $request, int $id, bool $submit): View
    {
        $appointment = Appointment::query()->find($id);
        if (! $appointment || ! $request->hasValidSignature()) {
            return $this->view('expired');
        }
        if (! $this->service->matchesSlot($appointment, (string) $request->query('slot'))) {
            return $this->view('changed', $appointment);
        }
        if ($appointment->status === 'PENDING') {
            if (! $submit) {
                return $this->view('ready', $appointment, $request->fullUrl());
            }

            return $this->view($this->service->confirmByCustomer($appointment) ? 'confirmed' : 'already', $appointment);
        }

        return $this->view(in_array($appointment->status, ['CONFIRMED', 'CHECKED_IN'], true) ? 'already' : 'closed', $appointment);
    }

    private function view(string $state, ?Appointment $appointment = null, ?string $action = null): View
    {
        return view('appointments.email-confirm', [
            'state' => $state,
            'action' => $action,
            'summary' => $appointment ? AppointmentConfirmationRequestMail::summary($appointment) : null,
        ]);
    }
}
