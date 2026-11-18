@php
    // [tiêu đề, mô tả, màu, biểu tượng]
    $copy = [
        'ready' => ['Đang xác nhận lịch hẹn…', 'Vui lòng chờ trong giây lát.', '#D6A85F', '…'],
        'confirmed' => ['Đã xác nhận lịch hẹn', 'Cảm ơn bạn! Gara đã giữ chỗ cho xe của bạn. Hẹn gặp bạn đúng giờ.', '#2F9E6B', '✓'],
        'already' => ['Lịch hẹn đã được xác nhận', 'Lịch này đã được xác nhận trước đó, bạn không cần làm gì thêm.', '#2F9E6B', '✓'],
        'changed' => ['Lịch hẹn đã thay đổi', 'Giờ hẹn đã được đổi sau khi gửi email này nên link không còn hiệu lực. Vui lòng xem email mới nhất hoặc liên hệ gara.', '#C2410C', '!'],
        'closed' => ['Không thể xác nhận', 'Lịch hẹn này đã bị hủy hoặc đã kết thúc. Vui lòng liên hệ gara nếu cần đặt lại.', '#C2410C', '!'],
        'expired' => ['Link đã hết hạn', 'Link xác nhận chỉ có hiệu lực đến giờ hẹn. Vui lòng liên hệ gara để được hỗ trợ.', '#C2410C', '!'],
    ][$state];
    $done = in_array($state, ['confirmed', 'already'], true);
@endphp
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex">
    <title>{{ $copy[0] }} – CarService</title>
    <style>
        @keyframes cs-spin { to { transform: rotate(360deg); } }
        .cs-spinner { width: 28px; height: 28px; border: 3px solid #F3E6CF; border-top-color: #D6A85F; border-radius: 50%; animation: cs-spin .8s linear infinite; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #20252B;">
    <div style="padding: 40px 16px;">
        <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E1E4E6; overflow: hidden;">
            <div style="background-color: #1F2933; padding: 24px 32px; text-align: center;">
                @include('emails.partials.logo')
            </div>
            <div style="padding: 32px; font-size: 14px; line-height: 1.6; color: #52606D;">
                <div style="text-align: center; margin-bottom: 24px;">
                    @if ($state === 'ready')
                        <div style="display: inline-grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: #FBF4E8;"><div class="cs-spinner"></div></div>
                    @else
                        <div style="display: inline-grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: {{ $copy[2] }}1A; color: {{ $copy[2] }}; font-size: 30px; font-weight: 700;">{{ $copy[3] }}</div>
                    @endif
                    <h2 style="margin: 14px 0 6px; font-size: 21px; color: {{ $done ? '#20252B' : $copy[2] }};">{{ $copy[0] }}</h2>
                    <p style="margin: 0;">{{ $copy[1] }}</p>
                </div>

                @if ($summary)
                    @include('emails.partials.appointment-summary', $summary)
                @endif

                @if ($state === 'ready')
                {{-- Tự gửi ngay khi trang mở (khách chỉ bấm 1 lần trong mail). Trình quét link của hộp thư không chạy JS nên không xác nhận hộ. --}}
                <form id="confirm-form" method="POST" action="{{ $action }}" style="margin: 24px 0 0; text-align: center;">
                    <noscript><p style="margin: 0 0 12px;">Bấm nút bên dưới để xác nhận lịch hẹn.</p></noscript>
                    <button id="confirm-button" type="submit" style="padding: 13px 28px; border: 0; border-radius: 10px; background-color: #D6A85F; color: #1F2933; font-size: 15px; font-weight: 700; cursor: pointer;">Xác nhận lịch hẹn</button>
                </form>
                <script>
                    (function () {
                        var form = document.getElementById('confirm-form');
                        document.getElementById('confirm-button').style.display = 'none';
                        form.submit();
                    })();
                </script>
                @elseif ($done)
                <p style="margin: 24px 0 0; text-align: center; font-size: 13px; color: #7B8794;">Bạn có thể đóng trang này.</p>
                @endif
            </div>
        </div>
    </div>
</body>
</html>
