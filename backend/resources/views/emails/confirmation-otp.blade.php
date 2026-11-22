@extends('emails.layout')

@section('title', 'Xác nhận báo giá')
@section('subtitle', 'Báo giá '.$quotation->quotation_code)

@section('content')
    <p style="margin: 0 0 16px;">
        Cố vấn dịch vụ đang ghi nhận lựa chọn của bạn tại quầy. Hãy kiểm tra kỹ từng hạng mục dưới đây.
        <strong>Chỉ đọc mã cho cố vấn nếu nội dung đúng với ý bạn.</strong>
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px; border-collapse: collapse;">
        @foreach ($items as $item)
            <tr style="border-bottom: 1px solid #E1E4E6;">
                <td style="padding: 8px 4px;">{{ $item->description }} × {{ $item->quantity }}</td>
                <td style="padding: 8px 4px; text-align: right; white-space: nowrap;">{{ number_format((float) $item->amount, 0, ',', '.') }} ₫</td>
                <td style="padding: 8px 4px; text-align: right; white-space: nowrap; font-weight: 700; color: {{ ($decisions[$item->id] ?? false) ? '#1E7A4C' : '#B42318' }};">
                    {{ ($decisions[$item->id] ?? false) ? 'Đồng ý' : 'Từ chối' }}
                </td>
            </tr>
        @endforeach
    </table>
    <p style="margin: 16px 0 0; text-align: right;">Tổng tiền đồng ý: <strong>{{ number_format($approvedTotal, 0, ',', '.') }} ₫</strong></p>

    @include('emails.partials.otp-box', ['code' => $otp, 'minutes' => $ttlMinutes])
    <p style="margin: 20px 0 0; font-size: 13px; line-height: 1.5; color: #7B8794;">Nếu nội dung không đúng hoặc bạn không ở gara, đừng cung cấp mã này cho bất kỳ ai.</p>
@endsection
