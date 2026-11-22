@extends('emails.layout')

@section('title', 'Email đã được thay đổi')

@section('content')
    <p style="margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #20252B;">Xin chào {{ $customerName }},</p>
    <p style="margin: 0;">Email nhận báo giá và biên bản giao nhận xe của bạn tại CarService vừa được đổi sang <strong style="color: #20252B;">{{ $maskedEmail }}</strong>.</p>
    <p style="margin: 16px 0 0; font-size: 13px; line-height: 1.5; color: #7B8794;">Nếu bạn không yêu cầu thay đổi này, vui lòng liên hệ gara ngay.</p>
@endsection
