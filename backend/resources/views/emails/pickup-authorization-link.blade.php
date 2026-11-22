@extends('emails.layout')

@section('title', 'Ủy quyền nhận xe')
@section('subtitle', 'Phiếu '.$orderCode.' · '.$vehicleText)

@section('content')
    <p style="margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #20252B;">Xin chào {{ $customerName }},</p>
    <p style="margin: 0;">Nếu bạn nhờ người khác đến nhận xe, hãy bấm nút bên dưới và <strong style="color: #20252B;">tự nhập</strong> họ tên, số điện thoại và 4 số cuối giấy tờ của người đó. Khi đến gara, người nhận phải xuất trình giấy tờ gốc.</p>

    @include('emails.partials.action-button', ['href' => $linkUrl, 'label' => 'Ủy quyền người nhận xe'])

    <p style="margin: 24px 0 0; font-size: 13px; color: #7B8794;">Không cần đăng nhập. Link có hiệu lực {{ $ttlHours }} giờ, chỉ dùng một lần. Nếu bạn không nhờ ai nhận xe, hãy bỏ qua email và báo gara. Vui lòng không chuyển tiếp email này.</p>
@endsection
