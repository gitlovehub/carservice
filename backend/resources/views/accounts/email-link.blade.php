@php
    $copy = [
        'ready' => [$readyTitle ?? 'Đang xác thực…', 'Vui lòng chờ trong giây lát.', '#E11D2E', '…'],
        'expired' => ['Link không còn hiệu lực', 'Link đã hết hạn hoặc đã được sử dụng. Bạn có thể yêu cầu gửi lại email xác thực.', '#D7192A', '!'],
        'taken' => ['Không đổi được email', 'Email này vừa được dùng cho hồ sơ khác. Vui lòng chọn email khác hoặc liên hệ gara.', '#D7192A', '!'],
    ][$state];
    $home = rtrim((string) config('services.frontend.url'), '/');
@endphp
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex">
    <meta name="referrer" content="no-referrer">
    <title>{{ $copy[0] }} – CarService</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: Arial, Helvetica, sans-serif; color: #20252B;">
    <div style="padding: 40px 16px;">
        <div style="max-width: 520px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E1E4E6; overflow: hidden;">
            <div style="background-color: #0F1115; border-bottom: 3px solid #E11D2E; padding: 24px 32px; text-align: center;">
                @include('emails.partials.logo')
            </div>
            <div style="padding: 32px; font-size: 14px; line-height: 1.6; color: #52606D; text-align: center;">
                <div style="display: inline-grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: {{ $copy[2] }}1A; color: {{ $copy[2] }}; font-size: 28px; font-weight: 700;">{{ $copy[3] }}</div>
                <h1 style="margin: 14px 0 6px; font-size: 21px; color: {{ $state === 'ready' ? '#20252B' : $copy[2] }};">{{ $copy[0] }}</h1>
                <p role="status" style="margin: 0;">{{ $copy[1] }}</p>

                @if ($state === 'ready')
                    {{-- Tự gửi khi trang mở: khách chỉ bấm một lần trong email; trình quét link không chạy JS nên không xác thực hộ. --}}
                    <form id="email-link-form" method="POST" action="{{ $action }}" style="margin: 24px 0 0;">
                        <button id="email-link-button" type="submit" style="padding: 14px 34px; border-radius: 12px; border: 1px solid #FF6B78; background-color: #E11D2E; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700; line-height: 1.4; cursor: pointer;">Xác thực</button>
                    </form>
                    <script>
                        document.getElementById('email-link-button').style.display = 'none';
                        document.getElementById('email-link-form').submit();
                    </script>
                @else
                    <p style="margin: 24px 0 0;"><a href="{{ $home }}/login" style="color: #E11D2E; font-weight: 700;">Về trang đăng nhập</a></p>
                @endif
            </div>
        </div>
    </div>
</body>
</html>
