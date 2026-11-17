@php
    $copy = [
        'ready' => ['Xác nhận lịch hẹn', 'Kiểm tra lại thông tin và bấm nút bên dưới để gara giữ chỗ cho xe của bạn.', '#D6A85F'],
        'confirmed' => ['Đã xác nhận lịch hẹn', 'Cảm ơn bạn! Gara đã giữ chỗ. Hẹn gặp bạn đúng giờ.', '#2F9E6B'],
        'already' => ['Lịch hẹn đã được xác nhận', 'Lịch này đã được xác nhận trước đó, bạn không cần làm gì thêm.', '#2F9E6B'],
        'changed' => ['Lịch hẹn đã thay đổi', 'Giờ hẹn đã được đổi sau khi gửi email này nên link không còn hiệu lực. Vui lòng xem email mới nhất hoặc liên hệ gara.', '#C2410C'],
        'closed' => ['Không thể xác nhận', 'Lịch hẹn này đã bị hủy hoặc đã kết thúc. Vui lòng liên hệ gara nếu cần đặt lại.', '#C2410C'],
        'expired' => ['Link đã hết hạn', 'Link xác nhận chỉ có hiệu lực đến giờ hẹn. Vui lòng liên hệ gara để được hỗ trợ.', '#C2410C'],
    ][$state];
@endphp
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex">
    <title>{{ $copy[0] }} – CarService</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #20252B;">
    <div style="padding: 40px 16px;">
        <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E1E4E6; overflow: hidden;">
            <div style="background-color: #1F2933; padding: 24px 32px; text-align: center;">
                <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #FFFFFF;">Car<span style="color: #D6A85F;">Service</span></h1>
            </div>
            <div style="padding: 28px 32px; font-size: 14px; line-height: 1.6; color: #52606D;">
                <h2 style="margin: 0 0 6px; font-size: 20px; color: {{ $copy[2] }};">{{ $copy[0] }}</h2>
                <p style="margin: 0 0 20px;">{{ $copy[1] }}</p>

                @if ($summary)
                    @include('emails.partials.appointment-summary', $summary)
                @endif

                @if ($state === 'ready')
                <form method="POST" action="{{ $action }}" style="margin: 28px 0 0; text-align: center;">
                    <button type="submit" style="padding: 13px 28px; border: 0; border-radius: 10px; background-color: #D6A85F; color: #1F2933; font-size: 15px; font-weight: 700; cursor: pointer;">Xác nhận lịch hẹn</button>
                </form>
                @endif
            </div>
        </div>
    </div>
</body>
</html>
