<?php

namespace App\Http\Controllers;

use App\Models\RepairOrder;
use App\Services\PickupAuthorizationLinkService;
use Illuminate\Http\Request;
use Illuminate\View\View;

/** Chủ xe mở link trong email để tự khai người được ủy quyền nhận xe. Trình quét link chỉ GET nên không tạo ủy quyền. */
class PickupAuthorizationLinkController extends Controller
{
    public function __construct(private readonly PickupAuthorizationLinkService $links) {}

    public function show(Request $request, int $repairOrder): View
    {
        $order = $this->validOrder($request, $repairOrder);
        if (! $order) {
            return view('handovers.pickup-authorization', ['state' => 'expired']);
        }

        return view('handovers.pickup-authorization', ['state' => 'ready', 'action' => $request->fullUrl(), 'orderCode' => $order->repair_order_code]);
    }

    public function store(Request $request, int $repairOrder): View
    {
        $order = $this->validOrder($request, $repairOrder);
        if (! $order) {
            return view('handovers.pickup-authorization', ['state' => 'expired']);
        }
        $data = $request->validate([
            'full_name' => ['required', 'string', 'min:2', 'max:150'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^[0-9+ ]{8,20}$/'],
            'id_last4' => ['required', 'digits:4'],
        ], [
            'full_name.required' => 'Nhập họ tên người nhận xe.',
            'full_name.min' => 'Họ tên quá ngắn.',
            'phone.required' => 'Nhập số điện thoại người nhận xe.',
            'phone.regex' => 'Số điện thoại không hợp lệ.',
            'id_last4.required' => 'Nhập 4 số cuối giấy tờ.',
            'id_last4.digits' => '4 số cuối giấy tờ phải đủ 4 chữ số.',
        ]);
        $this->links->create($order, (string) $request->query('nonce'), $data, $request);

        return view('handovers.pickup-authorization', ['state' => 'done', 'orderCode' => $order->repair_order_code, 'personName' => $data['full_name']]);
    }

    private function validOrder(Request $request, int $id): ?RepairOrder
    {
        $order = RepairOrder::query()->find($id);

        return $order && $request->hasValidSignature(false) && $this->links->isActive($order, (string) $request->query('nonce')) ? $order : null;
    }
}
