@php
    $ready = $state === 'ready';
    $pill = fn (bool $changed) => $changed ? 'background:#FFF4E5;color:#B45309;' : 'background:#E8F6EE;color:#1F7A4D;';
@endphp
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex">
    <meta name="referrer" content="no-referrer">
    <title>{{ $ready ? 'Biên bản '.$title : 'Không mở được biên bản' }} – CarService</title>
    <style>
        * { box-sizing: border-box; }
        .hv-section { margin-top: 26px; }
        .hv-section h2 { margin: 0 0 10px; font-size: 16px; color: #20252B; }
        .hv-head, .hv-row { display: grid; gap: 8px 14px; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) 120px; align-items: center; }
        .hv-row.qty, .hv-head.qty { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr) 70px 120px; }
        .hv-row.two, .hv-head.two { grid-template-columns: minmax(0, .8fr) minmax(0, 1fr) minmax(0, 1fr); }
        .hv-head { padding: 0 14px 6px; font-size: 12px; font-weight: 700; color: #7B8794; }
        .hv-row { margin-top: 8px; padding: 11px 14px; border: 1px solid #E1E4E6; border-radius: 12px; background: #F8F9FA; font-size: 14px; color: #20252B; }
        .hv-name { font-weight: 700; }
        .hv-small { display: none; margin-bottom: 2px; font-size: 12px; color: #7B8794; }
        .hv-note { grid-column: 1 / -1; font-size: 13px; font-weight: 500; color: #52606D; }
        .hv-pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }
        .hv-photos { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
        .hv-photos a { display: block; overflow: hidden; border: 1px solid #E1E4E6; border-radius: 12px; color: #52606D; font-size: 12px; text-decoration: none; }
        .hv-photos img { display: block; width: 100%; height: 130px; object-fit: cover; }
        .hv-photos span { display: block; padding: 6px 8px; }
        @media (max-width: 640px) {
            .hv-head, .hv-head.qty, .hv-head.two { display: none; }
            .hv-row, .hv-row.qty, .hv-row.two { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
            .hv-name, .hv-wide { grid-column: 1 / -1; }
            .hv-small { display: block; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #20252B;">
    <div style="padding: 32px 16px;">
        <div style="max-width: 820px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E1E4E6; overflow: hidden;">
            <div style="background-color: #0F1115; border-bottom: 3px solid #E11D2E; padding: 24px 32px; text-align: center;">
                @include('emails.partials.logo')
            </div>
            <div style="padding: 28px; font-size: 14px; line-height: 1.6; color: #52606D;">
                @if (! $ready)
                    <div style="padding: 24px 0; text-align: center;">
                        <h1 style="margin: 0 0 8px; font-size: 21px; color: #D7192A;">{{ $state === 'expired' ? 'Link đã hết hạn' : 'Biên bản không còn hiệu lực' }}</h1>
                        <p style="margin: 0;">{{ $state === 'expired' ? 'Link xem biên bản chỉ có hiệu lực 3 ngày. Vui lòng liên hệ gara để được gửi lại.' : 'Biên bản này đã được hủy hoặc thay bằng bản mới. Vui lòng liên hệ gara nếu cần hỗ trợ.' }}</p>
                    </div>
                @else
                    <h1 style="margin: 0; font-size: 23px; color: #20252B;">Biên bản {{ $title }}</h1>
                    <p style="margin: 4px 0 0;">Phiếu <strong style="color:#20252B;">{{ $orderCode }}</strong> · {{ $vehicleText }}</p>
                    <p style="margin: 2px 0 0; font-size: 13px;">@if ($submittedAt) Lập lúc {{ $submittedAt }} · @endif<strong style="color: {{ $confirmed ? '#1F7A4D' : '#B45309' }};">{{ $confirmed ? 'Chủ xe đã xác nhận' : 'Chờ chủ xe xác nhận' }}</strong></p>

                    @if ($compare)
                        <div role="status" style="margin-top: 16px; padding: 11px 14px; border-radius: 12px; font-weight: 600; {{ $changes ? 'background:#FFF4E5;color:#B45309;' : 'background:#E8F6EE;color:#1F7A4D;' }}">
                            {{ $changes ? count($changes).' thay đổi so với lúc nhận: '.implode(', ', $changes) : 'Tất cả hạng mục giữ nguyên trạng như lúc nhận xe.' }}
                        </div>
                    @endif

                    <section class="hv-section">
                        <h2>Số km &amp; nhiên liệu</h2>
                        @if ($compare)
                            <div class="hv-head"><span>Hạng mục</span><span>Lúc nhận</span><span>Lúc trả</span><span>Trạng thái</span></div>
                        @endif
                        @foreach ($info as $row)
                            <div class="hv-row" @if (! $compare) style="grid-template-columns: minmax(0,1fr) minmax(0,1fr);" @endif>
                                <div class="{{ $compare ? 'hv-name' : '' }}" style="font-weight:700;">{{ $row['label'] }}</div>
                                @if ($compare)<div><span class="hv-small">Lúc nhận</span>{{ $row['before'] }}</div>@endif
                                <div><span class="hv-small">{{ $compare ? 'Lúc trả' : 'Ghi nhận' }}</span><strong>{{ $row['after'] }}</strong></div>
                                @if ($compare)<div class="hv-wide">@if ($row['status'])<span class="hv-pill" style="{{ $pill($row['changed']) }}">{{ $row['status'] }}</span>@endif</div>@endif
                            </div>
                        @endforeach
                    </section>

                    <section class="hv-section">
                        <h2>{{ $personLabel }}</h2>
                        <div class="hv-row" style="grid-template-columns: minmax(0,1fr) minmax(0,1fr);">
                            <div><span style="display:block;font-size:12px;color:#7B8794;">Họ tên</span><strong>{{ $personName }}</strong></div>
                            <div><span style="display:block;font-size:12px;color:#7B8794;">Quan hệ</span><strong>{{ $personRelation }}</strong></div>
                        </div>
                    </section>

                    @foreach ($groups as $group)
                        <section class="hv-section">
                            <h2>{{ $group['title'] }} <span style="font-weight:400;color:#7B8794;">({{ count($group['rows']) }})</span></h2>
                            @php $class = $group['withQuantity'] ? 'qty' : ''; @endphp
                            @if ($compare)
                                <div class="hv-head {{ $class }}"><span>Hạng mục</span><span>Lúc nhận</span><span>Lúc trả</span>@if ($group['withQuantity'])<span>Số lượng</span>@endif<span>Trạng thái</span></div>
                            @endif
                            @foreach ($group['rows'] as $row)
                                <div class="hv-row {{ $class }}" @if (! $compare) style="grid-template-columns: minmax(0,1fr) minmax(0,1fr) {{ $group['withQuantity'] ? '70px' : '' }};" @endif>
                                    <div class="hv-name">{{ $row['label'] }}</div>
                                    @if ($compare)
                                        <div><span class="hv-small">Lúc nhận</span>{{ $row['before'] }}@if ($row['beforeNote'])<span style="display:block;font-size:12px;font-weight:500;color:#52606D;">{{ $row['beforeNote'] }}</span>@endif</div>
                                    @endif
                                    <div><span class="hv-small">{{ $compare ? 'Lúc trả' : 'Tình trạng' }}</span><strong style="color: {{ $row['bad'] ? '#B4141F' : '#1F7A4D' }};">{{ $row['after'] }}</strong></div>
                                    @if ($group['withQuantity'])<div><span class="hv-small">Số lượng</span>{{ $row['quantity'] ?? '—' }}</div>@endif
                                    @if ($compare)<div class="hv-wide"><span class="hv-pill" style="{{ $pill($row['changed']) }}">{{ $row['status'] }}</span></div>@endif
                                    @if ($row['note'])<div class="hv-note">Ghi chú: {{ $row['note'] }}</div>@endif
                                </div>
                            @endforeach
                        </section>
                    @endforeach

                    <section class="hv-section">
                        <h2>Ghi nhận khác</h2>
                        @if ($compare)
                            <div class="hv-head two"><span>Hạng mục</span><span>Lúc nhận</span><span>Lúc trả</span></div>
                        @endif
                        @foreach ($notes as $row)
                            <div class="hv-row two" @if (! $compare) style="grid-template-columns: minmax(0,.8fr) minmax(0,2fr);" @endif>
                                <div class="hv-name">{{ $row['label'] }}</div>
                                @if ($compare)<div class="hv-wide"><span class="hv-small">Lúc nhận</span><span style="white-space:pre-wrap;font-weight:500;">{{ $row['before'] }}</span></div>@endif
                                <div class="hv-wide"><span class="hv-small">{{ $compare ? 'Lúc trả' : 'Ghi nhận' }}</span><span style="white-space:pre-wrap;font-weight:500;">{{ $row['after'] }}</span></div>
                            </div>
                        @endforeach
                    </section>

                    <section class="hv-section">
                        <h2>Ảnh tình trạng xe <span style="font-weight:400;color:#7B8794;">({{ count($photos) }})</span></h2>
                        @if ($photos)
                            <div class="hv-photos">
                                @foreach ($photos as $photo)
                                    <a href="{{ $photo['url'] }}" target="_blank" rel="noopener noreferrer"><img src="{{ $photo['url'] }}" alt="{{ $photo['caption'] }}" loading="lazy"><span>{{ $photo['caption'] }}</span></a>
                                @endforeach
                            </div>
                        @else
                            <p style="margin: 0;">Biên bản không có ảnh đính kèm.</p>
                        @endif
                    </section>

                    @unless ($confirmed)
                        <p style="margin: 26px 0 0; padding: 12px 14px; border-radius: 12px; background: #FEF2F3; color: #B4141F; font-size: 13px; font-weight: 600;">
                            Nội dung đúng thì đọc mã trong email cho cố vấn (trực tiếp hoặc qua điện thoại). Nếu có gì sai, đừng cung cấp mã và hãy báo gara.
                        </p>
                    @endunless
                @endif
            </div>
        </div>
    </div>
</body>
</html>
