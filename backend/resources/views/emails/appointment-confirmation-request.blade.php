@extends('emails.layout')

@section('title', 'Xác nhận lịch hẹn')

@section('content')
    <p style="margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #20252B;">Xin chào {{ $customerName }},</p>
    <p style="margin: 0 0 20px;">Gara đã nhận lịch hẹn của bạn. Vui lòng kiểm tra thông tin dưới đây và bấm <strong style="color: #20252B;">Xác nhận lịch hẹn</strong> để gara giữ chỗ cho xe.</p>

    @include('emails.partials.appointment-summary')
    @include('emails.partials.action-button', ['href' => $confirmUrl, 'label' => 'Xác nhận lịch hẹn'])

    <p style="margin: 24px 0 0; font-size: 13px; color: #7B8794;">Link có hiệu lực đến giờ hẹn. Nếu muốn đổi giờ hoặc hủy, vui lòng liên hệ gara hoặc thao tác trong tài khoản của bạn.</p>
@endsection
