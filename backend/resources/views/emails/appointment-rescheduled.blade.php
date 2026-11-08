<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lịch hẹn đã được đổi – CarService</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #20252B;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 40px 15px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E1E4E6; overflow: hidden;" cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="background-color: #1F2933; padding: 28px 32px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #FFFFFF;">Car<span style="color: #D6A85F;">Service</span></h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px; font-size: 14px; line-height: 1.6; color: #52606D;">
                            <h2 style="margin: 0 0 12px; font-size: 18px; color: #20252B;">Lịch hẹn {{ $appointment->appointment_code }} đã được đổi</h2>
                            <p style="margin: 0 0 8px;">Giờ cũ: <s>{{ substr($old['appointment_time'], 0, 5) }} ngày {{ \Carbon\Carbon::parse($old['appointment_date'])->format('d/m/Y') }}</s></p>
                            <p style="margin: 0 0 8px;">Giờ mới: <strong style="color: #20252B;">{{ substr((string) $appointment->appointment_time, 0, 5) }} ngày {{ \Carbon\Carbon::parse($appointment->appointment_date)->format('d/m/Y') }}</strong></p>
                            <p style="margin: 0 0 16px;">Lý do: {{ $reason }}</p>
                            <p style="margin: 0; font-size: 13px; color: #7B8794;">Nếu giờ mới không phù hợp, vui lòng liên hệ gara hoặc đổi lịch trong tài khoản của bạn.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
