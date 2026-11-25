@extends('emails.layout')

@section('title', 'Xác minh email')

@section('content')
    <p style="margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #20252B;">Xin chào {{ $customerName }},</p>
    <p style="margin: 0;">Gara đang xác minh email này để gửi báo giá và biên bản giao nhận xe cho bạn. Hãy đọc mã bên dưới cho cố vấn dịch vụ để hoàn tất.</p>

    @include('emails.partials.otp-box', ['code' => $otp, 'minutes' => $ttlMinutes])

    <p style="margin: 20px 0 0; font-size: 13px; line-height: 1.5; color: #7B8794;">Nếu bạn không làm việc với gara, đừng cung cấp mã này cho bất kỳ ai và hãy bỏ qua email.</p>
@endsection
