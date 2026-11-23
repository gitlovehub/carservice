{{-- Bảng hoá đơn (email + trang thanh toán). Biến: code, orderCode, car, items, discount, total, paid, remaining. --}}
@php $vnd = fn ($n) => number_format((float) $n, 0, ',', '.').' ₫'; @endphp
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 14px;">
    <tr><td style="padding: 6px 0; color: #7B8794; width: 110px;">Số hoá đơn</td><td style="padding: 6px 0; color: #20252B; font-weight: 600; text-align: right;">{{ $code }}</td></tr>
    <tr><td style="padding: 6px 0; color: #7B8794;">Phiếu sửa chữa</td><td style="padding: 6px 0; color: #20252B; font-weight: 600; text-align: right;">{{ $orderCode }}</td></tr>
    <tr><td style="padding: 6px 0; color: #7B8794;">Xe</td><td style="padding: 6px 0; color: #20252B; font-weight: 600; text-align: right;">{{ $car }}</td></tr>
</table>

<p style="margin: 20px 0 8px; font-size: 13px; font-weight: 700; color: #20252B; text-transform: uppercase; letter-spacing: .04em;">Hạng mục</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 14px;">
    @foreach ($items as $index => $item)
    <tr>
        <td style="padding: 8px 0; border-top: 1px solid #E1E4E6; vertical-align: top;">
            <span style="color: #7B8794;">{{ $index + 1 }}.</span>
            <span style="display: inline-block; padding: 1px 6px; margin: 0 4px; border-radius: 4px; background: #FDE8EA; color: #B4141F; font-size: 11px; font-weight: 700;">{{ $item['type'] }}</span>
            <span style="color: #20252B; font-weight: 600;">{{ $item['name'] }}</span>
            <div style="margin-top: 2px; font-size: 12px; color: #7B8794;">{{ $item['quantity'] }} × {{ $vnd($item['price']) }}</div>
        </td>
        <td style="padding: 8px 0; border-top: 1px solid #E1E4E6; vertical-align: top; text-align: right; white-space: nowrap; color: #20252B; font-weight: 600;">{{ $vnd($item['amount']) }}</td>
    </tr>
    @endforeach
    @if ($discount > 0)
    <tr>
        <td style="padding: 8px 0 0; border-top: 1px solid #E1E4E6; color: #52606D;">Giảm giá</td>
        <td style="padding: 8px 0 0; border-top: 1px solid #E1E4E6; text-align: right; color: #52606D; white-space: nowrap;">−{{ $vnd($discount) }}</td>
    </tr>
    @endif
    <tr>
        <td style="padding: 8px 0 0; border-top: 1px solid #E1E4E6; color: #52606D;">Tổng hoá đơn</td>
        <td style="padding: 8px 0 0; border-top: 1px solid #E1E4E6; text-align: right; color: #20252B; font-weight: 600; white-space: nowrap;">{{ $vnd($total) }}</td>
    </tr>
    @if ($paid > 0)
    <tr>
        <td style="padding: 6px 0 0; color: #52606D;">Đã thanh toán</td>
        <td style="padding: 6px 0 0; text-align: right; color: #1F7A4D; font-weight: 600; white-space: nowrap;">{{ $vnd($paid) }}</td>
    </tr>
    @endif
    <tr>
        <td style="padding: 10px 0 0; color: #20252B; font-weight: 700;">Còn phải thanh toán</td>
        <td style="padding: 10px 0 0; text-align: right; color: #E11D2E; font-weight: 800; font-size: 16px; white-space: nowrap;">{{ $vnd($remaining) }}</td>
    </tr>
</table>
