@extends('emails.layout')

@section('title', 'Hoá đơn sửa chữa')
@section('subtitle', 'Số hoá đơn '.$code)

@section('content')
    <p style="margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #20252B;">Xin chào {{ $customerName }},</p>
    <p style="margin: 0 0 20px;">
        Gara đã hoàn thành sửa chữa và lập hoá đơn cho xe của bạn.
        Bấm <strong style="color: #20252B;">Xem &amp; thanh toán</strong> để kiểm tra hoá đơn và thanh toán qua VNPay.
    </p>

    @include('emails.partials.invoice-summary')
    @include('emails.partials.action-button', ['href' => $paymentUrl, 'label' => 'Xem & thanh toán'])

    <p style="margin: 24px 0 0; font-size: 13px; color: #7B8794;">Không cần đăng nhập. Link có hiệu lực {{ $ttlDays }} ngày và chỉ dùng cho hoá đơn này, vui lòng không chuyển tiếp email. Bạn cũng có thể thanh toán tại gara khi nhận xe.</p>
@endsection
