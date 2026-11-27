@extends('emails.layout')

@section('title', 'Xác thực email mới')

@section('content')
    <p style="margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #20252B;">Xin chào {{ $name }},</p>
    <p style="margin: 0;">Có yêu cầu dùng email này để đăng nhập tài khoản CarService. Bấm nút bên dưới để xác nhận. Email cũ vẫn dùng được cho đến khi bạn xác nhận.</p>
    @include('emails.partials.action-button', ['href' => $url, 'label' => 'Xác thực email mới'])
    <p style="margin: 24px 0 0; font-size: 13px; color: #7B8794;">Link có hiệu lực {{ $ttlHours }} giờ, vui lòng không chuyển tiếp email. Nếu bạn không yêu cầu, hãy bỏ qua email này và tài khoản sẽ không thay đổi.</p>
@endsection
