@php
    // [tiêu đề, mô tả, màu, biểu tượng]
    $copy = [
        'ready' => ['Thanh toán hoá đơn', 'Kiểm tra các hạng mục rồi bấm thanh toán. Bạn sẽ được chuyển sang cổng VNPay an toàn.', '#E11D2E', '₫'],
        'paid' => ['Hoá đơn đã thanh toán', 'Hoá đơn này đã được thanh toán đủ. Bạn không cần làm gì thêm.', '#2F9E6B', '✓'],
        'changed' => ['Hoá đơn đã thay đổi', 'Gara đã cập nhật hoá đơn sau khi gửi email này nên link không còn hiệu lực. Vui lòng xem email mới nhất hoặc liên hệ gara.', '#D7192A', '!'],
        'closed' => ['Hoá đơn không còn hiệu lực', 'Hoá đơn này đã bị huỷ. Vui lòng liên hệ gara nếu cần hỗ trợ.', '#D7192A', '!'],
        'expired' => ['Link đã hết hạn', 'Link thanh toán chỉ có hiệu lực 3 ngày. Bạn có thể thanh toán trong tài khoản, tại gara, hoặc nhờ gara gửi lại email.', '#D7192A', '!'],
        'unavailable' => ['Chưa thể thanh toán online', 'Cổng thanh toán đang tạm ngưng. Vui lòng thử lại sau hoặc thanh toán tại gara.', '#D7192A', '!'],
    ][$state];
    $money = fn ($n) => number_format((float) $n, 0, ',', '.').' ₫';
    $buttonStyle = 'display: inline-block; padding: 14px 34px; border-radius: 12px; border: 1px solid #FF6B78; background-color: #E11D2E; background-image: linear-gradient(180deg, #FF4757 0%, #E11D2E 55%, #B3101F 100%); color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700; line-height: 1.4; text-decoration: none; box-shadow: 0 0 6px rgba(255, 71, 87, .9), 0 0 18px rgba(225, 29, 46, .6); cursor: pointer;';
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
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #20252B;">
    <div style="padding: 40px 16px;">
        <div style="max-width: 620px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E1E4E6; overflow: hidden;">
            <div style="background-color: #0F1115; border-bottom: 3px solid #E11D2E; padding: 24px 32px; text-align: center;">
                @include('emails.partials.logo')
            </div>
            <div style="padding: 32px; font-size: 14px; line-height: 1.6; color: #52606D;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; background: {{ $copy[2] }}1A; color: {{ $copy[2] }}; font-size: 28px; font-weight: 700;">{{ $copy[3] }}</div>
                    <h1 style="margin: 14px 0 6px; font-size: 21px; color: {{ in_array($state, ['ready', 'paid'], true) ? '#20252B' : $copy[2] }};">{{ $copy[0] }}</h1>
                    <p role="status" style="margin: 0;">{{ $copy[1] }}</p>
                </div>

                @if ($error)
                    <p role="alert" style="margin: 0 0 16px; padding: 10px 14px; border-radius: 10px; background: #FDECEE; color: #B4141F; font-weight: 600;">{{ $error }}</p>
                @endif

                @if ($summary)
                    @include('emails.partials.invoice-summary', $summary)
                @endif

                @if ($state === 'ready' && $summary)
                    <form id="pay-form" method="POST" action="{{ $action }}" style="margin: 24px 0 0; text-align: center;">
                        <button type="submit" style="{{ $buttonStyle }}">Thanh toán {{ $money($summary['remaining']) }} qua VNPay</button>
                        <p style="margin: 10px 0 0; font-size: 12px; color: #7B8794;">CarService không lưu thông tin thẻ hay tài khoản ngân hàng của bạn.</p>
                    </form>
                    <script>
                        document.getElementById('pay-form').addEventListener('submit', function (event) {
                            var button = event.currentTarget.querySelector('button');
                            button.disabled = true;
                            button.textContent = 'Đang chuyển sang VNPay...';
                        });
                    </script>
                @endif

                @if ($state === 'paid')
                    <p style="margin: 24px 0 0; text-align: center; font-size: 13px; color: #7B8794;">Bạn có thể đóng trang này. Gara sẽ liên hệ khi xe sẵn sàng bàn giao.</p>
                @endif
            </div>
        </div>
    </div>
</body>
</html>
