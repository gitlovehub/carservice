@php
    // [tiêu đề, mô tả, màu, biểu tượng]
    $copy = [
        'ready' => ['Duyệt báo giá', 'Chọn Đồng ý hoặc Từ chối cho từng hạng mục rồi bấm “Gửi lựa chọn cho gara”. Gara chỉ làm những hạng mục bạn đồng ý.', '#E11D2E', '₫'],
        'done' => ['Đã gửi lựa chọn cho gara', 'Cảm ơn bạn! Gara đã nhận lựa chọn và sẽ tiến hành các hạng mục bạn đồng ý.', '#2F9E6B', '✓'],
        'already' => ['Báo giá đã được duyệt', 'Báo giá này đã có lựa chọn trước đó (qua email, tài khoản hoặc tại gara). Bạn không cần làm gì thêm.', '#2F9E6B', '✓'],
        'changed' => ['Báo giá đã thay đổi', 'Gara đã cập nhật báo giá sau khi gửi email này nên link không còn hiệu lực. Vui lòng xem email mới nhất hoặc liên hệ gara.', '#D7192A', '!'],
        'closed' => ['Báo giá không còn hiệu lực', 'Báo giá này đã được thay bằng bản mới hoặc phiếu đã kết thúc. Vui lòng liên hệ gara nếu cần hỗ trợ.', '#D7192A', '!'],
        'expired' => ['Link đã hết hạn', 'Link duyệt báo giá chỉ có hiệu lực 3 ngày. Bạn có thể duyệt trong tài khoản (mục “Báo giá”) hoặc liên hệ gara.', '#D7192A', '!'],
    ][$state];
    $done = in_array($state, ['done', 'already'], true);
    $money = fn ($n) => number_format((float) $n, 0, ',', '.').' ₫';
@endphp
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex">
    <title>{{ $copy[0] }} – CarService</title>
    <style>
        .qr-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; padding: 12px 0; border-top: 1px solid #E1E4E6; }
        .qr-name { flex: 1 1 220px; min-width: 0; }
        .qr-choice { display: inline-flex; border: 1px solid #E1E4E6; border-radius: 10px; overflow: hidden; }
        .qr-choice input { position: absolute; opacity: 0; pointer-events: none; }
        .qr-choice label { padding: 8px 14px; font-size: 13px; font-weight: 700; color: #52606D; cursor: pointer; user-select: none; }
        .qr-choice label + input + label { border-left: 1px solid #E1E4E6; }
        .qr-choice input.approve:checked + label { background: #E8F6EE; color: #1F7A4D; }
        .qr-choice input.reject:checked + label { background: #FDECEE; color: #B4141F; }
        .qr-choice input:focus-visible + label { outline: 2px solid #E11D2E; outline-offset: -2px; }
        .qr-pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    </style>
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
                    <h2 style="margin: 14px 0 6px; font-size: 21px; color: {{ $done || $state === 'ready' ? '#20252B' : $copy[2] }};">{{ $copy[0] }}</h2>
                    <p style="margin: 0;">{{ $copy[1] }}</p>
                </div>

                @if ($summary && $state === 'ready')
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; font-size: 14px;">
                        <tr><td style="padding: 6px 0; color: #7B8794;">Mã báo giá</td><td style="padding: 6px 0; color: #20252B; font-weight: 600; text-align: right;">{{ $summary['code'] }}</td></tr>
                        <tr><td style="padding: 6px 0; color: #7B8794;">Phiếu sửa chữa</td><td style="padding: 6px 0; color: #20252B; font-weight: 600; text-align: right;">{{ $summary['orderCode'] }}</td></tr>
                        <tr><td style="padding: 6px 0; color: #7B8794;">Xe</td><td style="padding: 6px 0; color: #20252B; font-weight: 600; text-align: right;">{{ $summary['car'] }}</td></tr>
                    </table>
                    @if ($summary['reason'])
                        <p style="margin: 14px 0 0;"><strong style="color: #20252B;">Lý do phát sinh:</strong> {{ $summary['reason'] }}</p>
                    @endif
                    @if ($summary['staysOvernight'] ?? false)
                        <p style="margin: 14px 0 0; padding: 10px 12px; border-radius: 8px; background: #FFF4E5; font-size: 13px; color: #92400E;"><strong>Xe cần lưu xưởng qua đêm</strong> để hoàn thành các hạng mục này. Gara không tính thêm phí lưu xe.</p>
                    @endif

                    @if ($errors->any())
                        <p role="alert" style="margin: 16px 0 0; padding: 10px 14px; border-radius: 10px; background: #FDECEE; color: #B4141F; font-weight: 600;">{{ $errors->first() }}</p>
                    @endif

                    <form id="review-form" method="POST" action="{{ $action }}" style="margin: 20px 0 0;">
                        <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #20252B; text-transform: uppercase; letter-spacing: .04em;">Hạng mục báo giá</p>
                        @foreach ($summary['items'] as $index => $item)
                            <div class="qr-row">
                                <div class="qr-name">
                                    <span style="color: #7B8794;">{{ $index + 1 }}.</span>
                                    <span style="display: inline-block; padding: 1px 6px; margin: 0 4px; border-radius: 4px; background: #FDE8EA; color: #B4141F; font-size: 11px; font-weight: 700;">{{ $item['type'] }}</span>
                                    <strong style="color: #20252B;">{{ $item['name'] }}</strong>
                                    @if ($item['required'])
                                        <span class="qr-pill" style="margin-left: 4px; padding: 1px 8px; background: #FFF4E5; color: #B45309; font-size: 11px;">Bắt buộc</span>
                                    @endif
                                    <div style="font-size: 12px; color: #7B8794;">{{ $item['quantity'] }} × {{ $money($item['price']) }} = <strong style="color: #20252B;">{{ $money($item['amount']) }}</strong></div>
                                    @if ($item['required'] && $item['requiredReason'])
                                        <div style="font-size: 12px; color: #B45309;">Lý do bắt buộc: {{ $item['requiredReason'] }}</div>
                                    @endif
                                </div>
                                <div class="qr-choice" role="radiogroup" aria-label="Lựa chọn cho {{ $item['name'] }}">
                                    <input class="approve" type="radio" id="a{{ $item['id'] }}" name="decision[{{ $item['id'] }}]" value="approve" data-amount="{{ $item['amount'] }}" checked>
                                    <label for="a{{ $item['id'] }}">✓ Đồng ý</label>
                                    <input class="reject{{ $item['required'] ? ' required' : '' }}" type="radio" id="r{{ $item['id'] }}" name="decision[{{ $item['id'] }}]" value="reject">
                                    <label for="r{{ $item['id'] }}">✕ Từ chối</label>
                                </div>
                            </div>
                        @endforeach
                        <p id="required-warning" role="alert" hidden style="margin: 12px 0 0; padding: 10px 12px; border-radius: 10px; background: #FFF4E5; color: #92400E; font-size: 13px;">
                            Bạn đang từ chối một hạng mục <strong>bắt buộc</strong> — gara không thể chỉ làm các hạng mục còn lại, nên báo giá sẽ được ghi nhận là <strong>từ chối toàn bộ</strong>.</p>
                        <div style="display: flex; justify-content: space-between; padding: 12px 0 0; border-top: 1px solid #E1E4E6; color: #20252B; font-weight: 700;">
                            <span>Tổng các hạng mục bạn đồng ý</span>
                            <span id="approved-total" style="color: #E11D2E; font-size: 17px; font-weight: 800;">{{ $money($summary['total']) }}</span>
                        </div>
                        @if ($summary['discount'] > 0)
                            <p style="margin: 4px 0 0; font-size: 12px; color: #7B8794;">Đã trừ giảm giá {{ $money($summary['discount']) }} của báo giá.</p>
                        @endif

                        <div style="margin-top: 24px; text-align: center;">
                            <button type="submit" style="padding: 14px 34px; border-radius: 12px; border: 1px solid #FF6B78; background-color: #E11D2E; background-image: linear-gradient(180deg, #FF4757 0%, #E11D2E 55%, #B3101F 100%); color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700; line-height: 1.4; box-shadow: 0 0 6px rgba(255, 71, 87, .9), 0 0 18px rgba(225, 29, 46, .6); cursor: pointer;">Gửi lựa chọn cho gara</button>
                            <p style="margin: 10px 0 0; font-size: 12px; color: #7B8794;">Sau khi gửi, lựa chọn không sửa được qua link này. Cần đổi lại, vui lòng liên hệ gara.</p>
                        </div>
                    </form>
                    <script>
                        (function () {
                            // Tổng các dòng đang chọn Đồng ý (trừ giảm giá, không âm). Chỉ hiển thị — gara tính lại khi ghi nhận.
                            var discount = {{ (float) $summary['discount'] }};
                            var form = document.getElementById('review-form');
                            var out = document.getElementById('approved-total');
                            var warning = document.getElementById('required-warning');
                            function update() {
                                // Từ chối mục bắt buộc = từ chối toàn bộ → tổng đồng ý về 0 và hiện cảnh báo.
                                var rejectsRequired = !!form.querySelector('input.reject.required:checked');
                                var sum = 0;
                                if (!rejectsRequired) form.querySelectorAll('input.approve:checked').forEach(function (i) { sum += Number(i.dataset.amount) || 0; });
                                warning.hidden = !rejectsRequired;
                                out.textContent = Math.max(0, sum > 0 ? sum - discount : 0).toLocaleString('vi-VN') + ' ₫';
                            }
                            form.addEventListener('change', update);
                            form.addEventListener('submit', function () { form.querySelector('button[type=submit]').disabled = true; });
                        })();
                    </script>
                @elseif ($summary && $done)
                    <p style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #20252B; text-transform: uppercase; letter-spacing: .04em;">Báo giá {{ $summary['code'] }}</p>
                    @foreach ($summary['items'] as $index => $item)
                        @php $decision = $decisions[$item['id']] ?? null; @endphp
                        <div class="qr-row">
                            <div class="qr-name"><span style="color: #7B8794;">{{ $index + 1 }}.</span> <strong style="color: #20252B;">{{ $item['name'] }}</strong>
                                <div style="font-size: 12px; color: #7B8794;">{{ $money($item['amount']) }}</div></div>
                            @if ($decision === true)
                                <span class="qr-pill" style="background: #E8F6EE; color: #1F7A4D;">Đồng ý</span>
                            @elseif ($decision === false)
                                <span class="qr-pill" style="background: #FDECEE; color: #B4141F;">Từ chối</span>
                            @endif
                        </div>
                    @endforeach
                    <p style="margin: 24px 0 0; text-align: center; font-size: 13px; color: #7B8794;">Bạn có thể đóng trang này. Tiến độ sửa chữa xem trong tài khoản, mục “Tra cứu tiến độ”.</p>
                @endif
            </div>
        </div>
    </div>
</body>
</html>
