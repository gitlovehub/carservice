@extends('emails.layout')

@section('title', 'Đặt lại mật khẩu')

@section('content')
    <p style="margin: 0;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>CarService</strong> của bạn. Vui lòng sử dụng mã OTP bên dưới để tiến hành thiết lập mật khẩu mới:</p>

    @include('emails.partials.otp-box', ['code' => $otp, 'minutes' => 5, 'once' => false])

    <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #7B8794;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.</p>
@endsection
