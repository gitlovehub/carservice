@extends('emails.layout')

@section('title', $supplement ? 'Báo giá phát sinh' : 'Báo giá sửa chữa')
@section('subtitle', 'Mã báo giá '.$code)

@section('content')
    <p style="margin: 0 0 8px; font-size: 17px; font-weight: 700; color: #20252B;">Xin chào {{ $customerName }},</p>
    <p style="margin: 0 0 20px;">
        @if ($supplement)
            Trong lúc sửa xe, gara phát hiện thêm hạng mục cần làm.
        @else
            Gara đã kiểm tra xe và gửi báo giá cho bạn.
        @endif
        Bấm <strong style="color: #20252B;">Xem &amp; duyệt báo giá</strong> để đồng ý hoặc từ chối từng hạng mục — gara chỉ làm những hạng mục bạn đồng ý.
    </p>

    @include('emails.partials.quotation-summary')
    @include('emails.partials.action-button', ['href' => $reviewUrl, 'label' => 'Xem & duyệt báo giá'])

    <p style="margin: 24px 0 0; font-size: 13px; color: #7B8794;">Không cần đăng nhập. Link có hiệu lực {{ $ttlDays }} ngày và chỉ dùng cho báo giá này — vui lòng không chuyển tiếp email. Bạn cũng có thể duyệt trong tài khoản (mục “Báo giá”) hoặc liên hệ gara.</p>
@endsection
