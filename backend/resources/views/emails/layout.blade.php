{{-- Khung chung của mọi email gửi khách: logo vừa phải, tiêu đề lớn trên nền tối, nội dung, chân email.
     Email con khai báo @section('title'), @section('subtitle') (không bắt buộc) và @section('content'). --}}
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title') – CarService</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #20252B;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6; padding: 32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E1E4E6; overflow: hidden;">
                    <tr>
                        <td style="background-color: #0F1115; border-bottom: 3px solid #E11D2E; padding: 24px 32px 26px; text-align: center;">
                            @include('emails.partials.logo')
                            <h1 style="margin: 14px 0 0; font-size: 28px; line-height: 1.25; font-weight: 800; color: #FFFFFF;">@yield('title')</h1>
                            @hasSection('subtitle')
                                <p style="margin: 6px 0 0; font-size: 14px; line-height: 1.5; color: #C5CDD5;">@yield('subtitle')</p>
                            @endif
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 32px; font-size: 15px; line-height: 1.6; color: #52606D;">
                            @yield('content')
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #F8F9FA; border-top: 1px solid #E1E4E6; padding: 18px 32px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #7B8794;">Email tự động từ CarService.<br>&copy; {{ date('Y') }} CarService. Mọi quyền được bảo lưu.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
