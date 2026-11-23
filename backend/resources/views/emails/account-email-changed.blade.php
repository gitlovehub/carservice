@extends('emails.layout')

@section('title', $stage === 'requested' ? 'Có yêu cầu đổi email' : 'Email đăng nhập đã thay đổi')

@section('content')
    <p style="margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #20252B;">Xin chào {{ $name }},</p>
    @if ($stage === 'requested')
        <p style="margin: 0;">Gara vừa gửi yêu cầu đổi email đăng nhập của bạn sang <strong style="color: #20252B;">{{ $maskedEmail }}</strong>. Email hiện tại vẫn dùng bình thường cho đến khi yêu cầu được xác thực từ email mới.</p>
    @elseif ($stage === 'new')
        <p style="margin: 0;">Email này hiện là email đăng nhập của bạn tại CarService. Vui lòng đăng nhập lại. Nếu chưa có mật khẩu, hãy dùng chức năng Quên mật khẩu.</p>
    @else
        <p style="margin: 0;">Email đăng nhập CarService của bạn vừa được đổi sang <strong style="color: #20252B;">{{ $maskedEmail }}</strong>. Các phiên đăng nhập cũ đã được đăng xuất.</p>
    @endif
    @if ($stage !== 'new')
        <p style="margin: 16px 0 0; font-size: 13px; line-height: 1.5; color: #7B8794;">Nếu bạn không yêu cầu thay đổi này, vui lòng liên hệ gara ngay.</p>
    @endif
@endsection
