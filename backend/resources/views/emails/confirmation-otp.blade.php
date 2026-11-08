<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mã xác nhận báo giá CarService</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #20252B;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 40px 15px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E1E4E6; overflow: hidden;" cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="background-color: #1F2933; padding: 28px 32px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #FFFFFF;">Car<span style="color: #D6A85F;">Service</span></h1>
                            <p style="margin: 6px 0 0; font-size: 13px; color: #AEB8C1;">Xác nhận báo giá sửa chữa</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px;">
                            <h2 style="margin: 0 0 12px; font-size: 18px; color: #20252B;">Báo giá {{ $quotation->quotation_code }}</h2>
                            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #52606D;">
                                Cố vấn dịch vụ đang ghi nhận lựa chọn của bạn tại quầy. Hãy kiểm tra kỹ từng hạng mục dưới đây.
                                <strong>Chỉ đọc mã cho cố vấn nếu nội dung đúng với ý bạn.</strong>
                            </p>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 13px; border-collapse: collapse;">
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
                            <p style="margin: 16px 0 0; font-size: 14px; text-align: right;">Tổng tiền đồng ý: <strong>{{ number_format($approvedTotal, 0, ',', '.') }} ₫</strong></p>

                            <div style="background-color: #F4F6F8; border: 2px dashed #D6A85F; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0 0;">
                                <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1F2933; font-family: 'Courier New', Courier, monospace;">{{ $otp }}</div>
                                <p style="margin: 8px 0 0; font-size: 12px; color: #7B8794;">Mã có hiệu lực trong <strong>{{ $ttlMinutes }} phút</strong> và chỉ dùng một lần.</p>
                            </div>
                            <p style="margin: 20px 0 0; font-size: 13px; line-height: 1.5; color: #7B8794;">
                                Nếu nội dung không đúng hoặc bạn không ở gara, đừng cung cấp mã này cho bất kỳ ai.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #F8F9FA; border-top: 1px solid #E1E4E6; padding: 20px 32px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #9AA5B1;">&copy; {{ date('Y') }} CarService.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
