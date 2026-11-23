@extends('emails.layout')

@section('title', 'Xác thực tài khoản')

@section('content')
    <p style="margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #20252B;">Xin chào {{ $name }},</p>
    <p style="margin: 0;">Cảm ơn bạn đã đăng ký CarService. Bấm nút bên dưới để kích hoạt tài khoản, sau đó bạn có thể đăng nhập ngay.</p>
    @include('emails.partials.action-button', ['href' => $url, 'label' => 'Xác thực tài khoản'])
    <p style="margin: 24px 0 0; font-size: 13px; color: #7B8794;">Link có hiệu lực {{ $ttlHours }} giờ, vui lòng không chuyển tiếp email. Nếu bạn không đăng ký, hãy bỏ qua email này.</p>
@endsection
