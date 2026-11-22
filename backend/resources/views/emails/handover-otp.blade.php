@extends('emails.layout')

@section('title', 'Biên bản '.$title)
@section('subtitle', 'Phiếu '.($snapshot['repair_order_code'] ?? '').' · '.$vehicleText)

@section('content')
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 16px; border: 1px solid #E1E4E6; border-radius: 10px; background-color: #F8F9FA; font-size: 14px;">
        <tr>
            <td style="padding: 10px 12px;"><span style="display: block; font-size: 12px; color: #7B8794;">Số km</span><strong style="color: #20252B;">{{ isset($snapshot['mileage']) ? number_format((int) $snapshot['mileage'], 0, ',', '.') : '—' }}</strong></td>
            <td style="padding: 10px 12px;"><span style="display: block; font-size: 12px; color: #7B8794;">Nhiên liệu</span><strong style="color: #20252B;">{{ $fuelText }}</strong></td>
            <td style="padding: 10px 12px;"><span style="display: block; font-size: 12px; color: #7B8794;">{{ $personLabel }}</span><strong style="color: #20252B;">{{ $snapshot['person']['name'] ?? '' }}</strong></td>
        </tr>
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px; border-collapse: collapse;">
        @foreach (($snapshot['items'] ?? []) as $item)
            <tr style="border-bottom: 1px solid #E1E4E6;">
                <td style="padding: 7px 4px;">{{ $item['label'] }}</td>
                <td style="padding: 7px 4px; text-align: right; font-weight: 700; color: #20252B;">{{ $conditionText[$item['condition']] ?? $item['condition'] }}{{ $item['quantity'] ? ' × '.$item['quantity'] : '' }}</td>
            </tr>
        @endforeach
    </table>
    <p style="margin: 12px 0 0; font-size: 14px;">Ảnh đính kèm: <strong>{{ count($snapshot['photos'] ?? []) }}</strong>. Bấm nút bên dưới để xem đầy đủ.</p>

    @include('emails.partials.otp-box', ['code' => $otp, 'minutes' => $ttlMinutes])
    @include('emails.partials.action-button', ['href' => $viewUrl, 'label' => 'Xem biên bản đầy đủ'])

    <p style="margin: 12px 0 0; text-align: center; font-size: 12px; color: #7B8794;">Không cần đăng nhập. Link có hiệu lực {{ $viewTtlDays }} ngày, vui lòng không chuyển tiếp email này.</p>
    <p style="margin: 20px 0 0; font-size: 13px; color: #7B8794;">Chỉ đọc mã cho cố vấn (trực tiếp hoặc qua điện thoại) nếu nội dung đúng với tình trạng xe. Nếu không, đừng cung cấp mã.</p>
@endsection
