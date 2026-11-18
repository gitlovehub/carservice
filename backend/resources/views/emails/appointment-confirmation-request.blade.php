<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác nhận lịch hẹn – CarService</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #20252B;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 40px 15px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E1E4E6; overflow: hidden;" cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="background-color: #0F1115; border-bottom: 3px solid #E11D2E; padding: 28px 32px; text-align: center;">
                            @include('emails.partials.logo')
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px; font-size: 14px; line-height: 1.6; color: #52606D;">
                            <h2 style="margin: 0 0 8px; font-size: 18px; color: #20252B;">Xin chào {{ $customerName }},</h2>
                            <p style="margin: 0 0 20px;">Gara đã nhận lịch hẹn của bạn. Vui lòng kiểm tra thông tin dưới đây và bấm <strong style="color: #20252B;">Xác nhận lịch hẹn</strong> để gara giữ chỗ cho xe.</p>

                            @include('emails.partials.appointment-summary')

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 28px;">
                                <tr>
                                    <td align="center">
                                        @include('emails.partials.neon-button', ['href' => $confirmUrl, 'label' => 'Xác nhận lịch hẹn'])
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 24px 0 0; font-size: 13px; color: #7B8794;">Link có hiệu lực đến giờ hẹn. Nếu muốn đổi giờ hoặc hủy, vui lòng liên hệ gara hoặc thao tác trong tài khoản của bạn.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
