{{-- Bảng báo giá (email + trang duyệt). Biến: code, orderCode, car, items, subtotal, discount, total, reason. --}}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 14px;">
    <tr><td style="padding: 6px 0; color: #7B8794; width: 110px;">Mã báo giá</td><td style="padding: 6px 0; color: #20252B; font-weight: 600; text-align: right;">{{ $code }}</td></tr>
    <tr><td style="padding: 6px 0; color: #7B8794;">Phiếu sửa chữa</td><td style="padding: 6px 0; color: #20252B; font-weight: 600; text-align: right;">{{ $orderCode }}</td></tr>
    <tr><td style="padding: 6px 0; color: #7B8794;">Xe</td><td style="padding: 6px 0; color: #20252B; font-weight: 600; text-align: right;">{{ $car }}</td></tr>
</table>

@if ($reason)
<p style="margin: 14px 0 0; font-size: 14px; color: #52606D;"><strong style="color: #20252B;">Lý do phát sinh:</strong> {{ $reason }}</p>
@endif

@if ($staysOvernight ?? false)
<p style="margin: 14px 0 0; padding: 10px 12px; border-radius: 8px; background: #FFF4E5; font-size: 13px; color: #92400E;"><strong>Xe cần lưu xưởng qua đêm</strong> để hoàn thành các hạng mục này. Gara không tính thêm phí lưu xe.</p>
@endif

<p style="margin: 20px 0 8px; font-size: 13px; font-weight: 700; color: #20252B; text-transform: uppercase; letter-spacing: .04em;">Hạng mục báo giá</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 14px;">
    @foreach ($items as $index => $item)
    <tr>
        <td style="padding: 8px 0; border-top: 1px solid #E1E4E6; vertical-align: top;">
            <span style="color: #7B8794;">{{ $index + 1 }}.</span>
            <span style="display: inline-block; padding: 1px 6px; margin: 0 4px; border-radius: 4px; background: #FDE8EA; color: #B4141F; font-size: 11px; font-weight: 700;">{{ $item['type'] }}</span>
            <span style="color: #20252B; font-weight: 600;">{{ $item['name'] }}</span>
            @if ($item['required'])
            <span style="display: inline-block; padding: 1px 6px; margin-left: 4px; border-radius: 4px; background: #FFF4E5; color: #B45309; font-size: 11px; font-weight: 700;">Bắt buộc</span>
            @endif
            <div style="margin-top: 2px; font-size: 12px; color: #7B8794;">{{ $item['quantity'] }} × {{ number_format($item['price'], 0, ',', '.') }} ₫</div>
            @if ($item['required'] && $item['requiredReason'])
            <div style="margin-top: 2px; font-size: 12px; color: #B45309;">Lý do bắt buộc: {{ $item['requiredReason'] }}</div>
            @endif
        </td>
        <td style="padding: 8px 0; border-top: 1px solid #E1E4E6; vertical-align: top; text-align: right; white-space: nowrap; color: #20252B; font-weight: 600;">{{ number_format($item['amount'], 0, ',', '.') }} ₫</td>
    </tr>
    @endforeach
    @if ($discount > 0)
    <tr>
        <td style="padding: 8px 0 0; border-top: 1px solid #E1E4E6; color: #52606D;">Giảm giá</td>
        <td style="padding: 8px 0 0; border-top: 1px solid #E1E4E6; text-align: right; color: #52606D; white-space: nowrap;">−{{ number_format($discount, 0, ',', '.') }} ₫</td>
    </tr>
    @endif
    <tr>
        <td style="padding: 10px 0 0; border-top: 1px solid #E1E4E6; color: #20252B; font-weight: 700;">Tổng báo giá</td>
        <td style="padding: 10px 0 0; border-top: 1px solid #E1E4E6; text-align: right; color: #E11D2E; font-weight: 800; font-size: 16px; white-space: nowrap;">{{ number_format($total, 0, ',', '.') }} ₫</td>
    </tr>
</table>
@if (collect($items)->contains('required', true))
<p style="margin: 12px 0 0; padding: 10px 12px; border-radius: 8px; background: #FFF4E5; font-size: 13px; color: #92400E;">Hạng mục <strong>Bắt buộc</strong>: gara không thể chỉ làm các hạng mục khác nếu thiếu hạng mục này. Từ chối hạng mục bắt buộc đồng nghĩa với từ chối toàn bộ báo giá.</p>
@endif
