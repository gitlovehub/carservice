{{-- Bảng thông tin lịch hẹn (email + trang xác nhận). Biến: code, when, car, items, total, symptom, note. --}}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 14px;">
    <tr><td style="padding: 6px 0; color: #7B8794; width: 110px;">Mã lịch hẹn</td><td style="padding: 6px 0; color: #20252B; font-weight: 600; text-align: right;">{{ $code }}</td></tr>
    <tr><td style="padding: 6px 0; color: #7B8794;">Giờ hẹn</td><td style="padding: 6px 0; color: #20252B; font-weight: 600; text-align: right;">{{ $when }}</td></tr>
    <tr><td style="padding: 6px 0; color: #7B8794;">Xe</td><td style="padding: 6px 0; color: #20252B; font-weight: 600; text-align: right;">{{ $car }}</td></tr>
</table>

@if (count($items))
<p style="margin: 20px 0 8px; font-size: 13px; font-weight: 700; color: #20252B; text-transform: uppercase; letter-spacing: .04em;">Dịch vụ đã đặt</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 14px;">
    @foreach ($items as $item)
    <tr>
        <td style="padding: 8px 0; border-top: 1px solid #E1E4E6; vertical-align: top;">
            <span style="display: inline-block; padding: 1px 6px; margin-right: 6px; border-radius: 4px; background: #F6EBD9; color: #8A6326; font-size: 11px; font-weight: 700;">{{ $item['tag'] }}</span>
            <span style="color: #20252B; font-weight: 600;">{{ $item['name'] }}</span>
            @if (count($item['includes']))
            <div style="margin-top: 4px; font-size: 12px; color: #7B8794;">Gồm: {{ implode(', ', $item['includes']) }}</div>
            @endif
        </td>
        <td style="padding: 8px 0; border-top: 1px solid #E1E4E6; vertical-align: top; text-align: right; white-space: nowrap; color: #52606D;">{{ $item['price'] > 0 ? number_format($item['price'], 0, ',', '.').' ₫' : '' }}</td>
    </tr>
    @endforeach
    @if ($total > 0)
    <tr>
        <td style="padding: 10px 0 0; border-top: 1px solid #E1E4E6; color: #20252B; font-weight: 700;">Tạm tính</td>
        <td style="padding: 10px 0 0; border-top: 1px solid #E1E4E6; text-align: right; color: #20252B; font-weight: 700; white-space: nowrap;">{{ number_format($total, 0, ',', '.') }} ₫</td>
    </tr>
    @endif
</table>
@if ($total > 0)
<p style="margin: 6px 0 0; font-size: 12px; color: #7B8794;">Giá ước tính, chi phí cuối cùng theo báo giá sau khi kiểm tra xe.</p>
@endif
@endif

@if ($symptom)
<p style="margin: 16px 0 0; font-size: 14px; color: #52606D;"><strong style="color: #20252B;">Tình trạng xe:</strong> {{ $symptom }}</p>
@endif
@if ($note)
<p style="margin: 8px 0 0; font-size: 14px; color: #52606D;"><strong style="color: #20252B;">Ghi chú:</strong> {{ $note }}</p>
@endif
