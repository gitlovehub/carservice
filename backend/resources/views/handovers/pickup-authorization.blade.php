@php
    $copy = [
        'ready' => ['Ủy quyền người nhận xe', 'Nhập thông tin người sẽ đến nhận xe thay bạn. Người này phải xuất trình giấy tờ gốc tại gara.', '#20252B'],
        'done' => ['Đã ghi nhận ủy quyền', 'Gara sẽ đối chiếu giấy tờ khi người được ủy quyền đến nhận xe. Bạn vẫn cần xác nhận biên bản trả xe bằng mã gửi qua email.', '#1F7A4D'],
        'expired' => ['Link không còn hiệu lực', 'Link đã hết hạn hoặc đã được sử dụng. Vui lòng liên hệ gara để được gửi link mới.', '#D7192A'],
    ][$state];
    $input = 'display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:11px 13px;border-radius:10px;font-size:15px;color:#20252B;background:#FFFFFF;outline:none;';
    $border = fn (string $field) => 'border:1px solid '.($errors->has($field) ? '#D7192A' : '#CBD2D9').';';
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
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #20252B;">
    <div style="padding: 32px 12px;">
        <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E1E4E6; overflow: hidden;">
            <div style="background-color: #0F1115; border-bottom: 3px solid #E11D2E; padding: 24px 32px 26px; text-align: center;">
                @include('emails.partials.logo')
                <h1 style="margin: 14px 0 0; font-size: 26px; line-height: 1.25; font-weight: 800; color: #FFFFFF;">{{ $copy[0] }}</h1>
                @isset($orderCode)<p style="margin: 6px 0 0; font-size: 14px; color: #C5CDD5;">Phiếu {{ $orderCode }}</p>@endisset
            </div>
            <div style="padding: 28px 32px; font-size: 15px; line-height: 1.6; color: #52606D;">
                <p style="margin: 0; color: {{ $state === 'ready' ? '#52606D' : $copy[2] }}; {{ $state === 'ready' ? '' : 'font-weight:600;' }}">{{ $copy[1] }}</p>
                @if ($state === 'done')
                    <p style="margin: 14px 0 0;">Người được ủy quyền: <strong style="color:#20252B;">{{ $personName }}</strong></p>
                @endif
                @if ($state === 'ready')
                    <form method="POST" action="{{ $action }}" novalidate style="margin: 20px 0 0;">
                        @foreach ([['full_name', 'Họ tên người nhận xe', 'text', 150, 'name'], ['phone', 'Số điện thoại', 'tel', 20, 'tel'], ['id_last4', '4 số cuối CCCD / giấy tờ', 'text', 4, 'off']] as [$field, $label, $type, $max, $autocomplete])
                            <label style="display:block;margin-top:14px;font-size:14px;font-weight:700;color:#20252B;">{{ $label }} <span style="color:#D7192A;">*</span>
                                <input name="{{ $field }}" type="{{ $type }}" maxlength="{{ $max }}" autocomplete="{{ $autocomplete }}" @if ($field === 'id_last4') inputmode="numeric" @endif value="{{ $field === 'id_last4' ? '' : old($field) }}" aria-invalid="{{ $errors->has($field) ? 'true' : 'false' }}" style="{{ $input }}{{ $border($field) }}">
                                @error($field)<span role="alert" style="display:block;margin-top:4px;font-size:13px;font-weight:500;color:#D7192A;">{{ $message }}</span>@enderror
                            </label>
                        @endforeach
                        <button type="submit" style="display:block;width:100%;margin-top:22px;padding:13px 18px;border:0;border-radius:12px;background:#E11D2E;color:#FFFFFF;font-size:15px;font-weight:800;cursor:pointer;">Xác nhận ủy quyền</button>
                    </form>
                @endif
            </div>
        </div>
    </div>
</body>
</html>
