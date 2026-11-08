<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mã xác nhận biên bản {{ $title }} CarService</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #20252B;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 40px 15px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E1E4E6; overflow: hidden;" cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="background-color: #1F2933; padding: 28px 32px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #FFFFFF;">Car<span style="color: #D6A85F;">Service</span></h1>
                            <p style="margin: 6px 0 0; font-size: 13px; color: #AEB8C1;">Biên bản {{ $title }}</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px; font-size: 14px; line-height: 1.6; color: #52606D;">
                            <p style="margin: 0 0 12px;">Phiếu <strong>{{ $snapshot['repair_order_code'] ?? '' }}</strong> · Xe <strong>{{ $snapshot['vehicle']['license_plate'] ?? '' }}</strong></p>
                            <p style="margin: 0 0 12px;">
                                Số km: <strong>{{ isset($snapshot['mileage']) ? number_format((int) $snapshot['mileage'], 0, ',', '.') : '—' }}</strong>
                                · Nhiên liệu: <strong>{{ $snapshot['fuel_level'] ?? '—' }}</strong>
                                · Người giao: <strong>{{ $snapshot['person']['name'] ?? '' }}</strong>
                            </p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; border-collapse: collapse;">
                                @foreach (($snapshot['items'] ?? []) as $item)
                                    <tr style="border-bottom: 1px solid #E1E4E6;">
                                        <td style="padding: 6px 4px;">{{ $item['label'] }}</td>
                                        <td style="padding: 6px 4px; text-align: right; font-weight: 700;">{{ $item['condition'] }}{{ $item['quantity'] ? ' × '.$item['quantity'] : '' }}</td>
                                    </tr>
                                @endforeach
                            </table>
                            <p style="margin: 12px 0 0;">Ảnh đính kèm: <strong>{{ count($snapshot['photos'] ?? []) }}</strong> (xem trong tài khoản, mục "Tiến độ xe").</p>
                            <div style="background-color: #F4F6F8; border: 2px dashed #D6A85F; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0 0;">
                                <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1F2933; font-family: 'Courier New', Courier, monospace;">{{ $otp }}</div>
                                <p style="margin: 8px 0 0; font-size: 12px; color: #7B8794;">Mã có hiệu lực trong <strong>{{ $ttlMinutes }} phút</strong> và chỉ dùng một lần.</p>
                            </div>
                            <p style="margin: 20px 0 0; font-size: 13px; color: #7B8794;">Chỉ đọc mã cho cố vấn nếu nội dung đúng với tình trạng xe. Nếu không, đừng cung cấp mã.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
