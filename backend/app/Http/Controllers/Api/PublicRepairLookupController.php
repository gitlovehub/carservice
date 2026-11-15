<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Customer;
use App\Models\RepairOrder;
use App\Models\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Tra cứu tiến độ KHÔNG cần đăng nhập: mã phiếu (RO-…) hoặc mã lịch hẹn (APT-…) + 4 số cuối điện thoại của khách.
 *
 * Chỉ trả thông tin tối thiểu để theo dõi (xe, biển số che bớt, trạng thái, mốc tiến độ, giờ dự kiến) —
 * không có giá tiền, báo giá, hóa đơn, ghi chú hay thông tin cá nhân. Sai mã hoặc sai số điện thoại đều
 * trả cùng một thông báo để không lộ mã nào tồn tại; route giới hạn số lần thử để chống dò.
 */
class PublicRepairLookupController extends Controller
{
    private const NOT_FOUND = 'Không tìm thấy phiếu khớp với mã và số điện thoại đã nhập.';

    public function lookup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'phone_last4' => ['required', 'digits:4'],
        ], [
            'code.required' => 'Nhập mã phiếu hoặc mã lịch hẹn.',
            'phone_last4.required' => 'Nhập 4 số cuối số điện thoại.',
            'phone_last4.digits' => '4 số cuối điện thoại phải gồm đúng 4 chữ số.',
        ]);

        $code = strtoupper(trim($data['code']));

        $order = RepairOrder::query()
            ->with(['customer:id,phone', 'vehicle.model.brand', 'vehicle.trim', 'statusHistory', 'workItems:id,repair_order_id,status'])
            ->where('repair_order_code', $code)
            ->first();

        if ($order) {
            abort_unless($this->phoneMatches($order->customer, $data['phone_last4']), 404, self::NOT_FOUND);

            return response()->json(['data' => $this->repairOrderPayload($order)]);
        }

        // Mã lịch hẹn: nếu gara đã tiếp nhận xe thì trả tiến độ phiếu; chưa thì trả trạng thái lịch hẹn.
        $appointment = Appointment::query()
            ->with(['customer:id,phone', 'vehicle.model.brand', 'vehicle.trim'])
            ->where('appointment_code', $code)
            ->first();
        abort_unless($appointment && $this->phoneMatches($appointment->customer, $data['phone_last4']), 404, self::NOT_FOUND);

        $linkedOrder = RepairOrder::query()
            ->with(['vehicle.model.brand', 'vehicle.trim', 'statusHistory', 'workItems:id,repair_order_id,status'])
            ->where('appointment_id', $appointment->id)
            ->latest('id')
            ->first();

        if ($linkedOrder) {
            return response()->json(['data' => $this->repairOrderPayload($linkedOrder, $appointment->appointment_code)]);
        }

        return response()->json(['data' => [
            'type' => 'appointment',
            'appointment_code' => $appointment->appointment_code,
            'status' => $appointment->status,
            'appointment_date' => $appointment->appointment_date,
            'appointment_time' => $appointment->appointment_time,
            'vehicle' => $this->vehiclePayload($appointment->vehicle),
        ]]);
    }

    /** So 4 số cuối của số điện thoại khách (bỏ khoảng trắng, dấu chấm, +84…). */
    private function phoneMatches(?Customer $customer, string $last4): bool
    {
        $digits = preg_replace('/\D+/', '', (string) $customer?->phone);

        return strlen($digits) >= 4 && hash_equals(substr($digits, -4), $last4);
    }

    /**
     * @return array<string, mixed>
     */
    private function repairOrderPayload(RepairOrder $order, ?string $appointmentCode = null): array
    {
        $works = $order->workItems;

        return [
            'type' => 'repair_order',
            'repair_order_code' => $order->repair_order_code,
            'appointment_code' => $appointmentCode,
            'status' => $order->status,
            'received_at' => $order->received_at,
            'estimated_ready_at' => $order->estimated_ready_at,
            'completed_at' => $order->completed_at,
            'handed_over_at' => $order->handed_over_at,
            'vehicle' => $this->vehiclePayload($order->vehicle),
            // Chỉ trạng thái + thời điểm (không kèm ghi chú nội bộ).
            'history' => $order->statusHistory
                ->sortBy('created_at')
                ->map(fn ($item) => ['status' => $item->status, 'created_at' => $item->created_at])
                ->values(),
            'work_progress' => [
                'done' => $works->where('status', 'COMPLETED')->count(),
                'total' => $works->count(),
            ],
        ];
    }

    /**
     * @return array{name: string, license_plate: string|null}
     */
    private function vehiclePayload(?Vehicle $vehicle): array
    {
        $name = collect([$vehicle?->model?->brand?->name, $vehicle?->model?->name, $vehicle?->trim?->name])
            ->filter()->implode(' ');

        return ['name' => $name !== '' ? $name : 'Xe của bạn', 'license_plate' => $this->maskPlate($vehicle?->license_plate)];
    }

    /** "30A-123.45" → "30A-***.45": đủ để khách nhận ra xe, người khác không đọc được biển số đầy đủ. */
    private function maskPlate(?string $plate): ?string
    {
        if (! $plate) {
            return null;
        }
        $chars = mb_str_split($plate);
        $digitPositions = array_keys(array_filter($chars, fn (string $c) => ctype_digit($c)));
        // Giữ 2-3 ký tự đầu (mã tỉnh + seri) và 2 số cuối; che các chữ số ở giữa.
        $keepTail = array_slice($digitPositions, -2);
        foreach ($digitPositions as $index => $position) {
            if ($position >= 3 && ! in_array($position, $keepTail, true)) {
                $chars[$position] = '*';
            }
        }

        return implode('', $chars);
    }
}
