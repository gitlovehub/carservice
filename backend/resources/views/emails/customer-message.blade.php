@extends('emails.layout')

@section('title', $mailSubject)

@section('content')
    <p style="margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #20252B;">Xin chào {{ $customerName }},</p>
    <p style="margin: 0;">{!! nl2br(e($messageBody)) !!}</p>
    <p style="margin: 16px 0 0; font-size: 13px; line-height: 1.5; color: #7B8794;">Nếu cần hỗ trợ thêm, vui lòng liên hệ gara CarService.</p>
@endsection
