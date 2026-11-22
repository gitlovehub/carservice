@extends('emails.layout')

@section('title', 'Xác thực tài khoản')

@section('content')
    <p style="margin: 0;">Cảm ơn bạn đã đăng ký tài khoản tại <strong>CarService</strong>. Vui lòng sử dụng mã xác thực (OTP) bên dưới để hoàn tất quá trình kích hoạt tài khoản:</p>

    @include('emails.partials.otp-box', ['code' => $otp, 'minutes' => 5, 'once' => false])

    <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.5; color: #7B8794;">Nếu bạn không thực hiện yêu cầu đăng ký này, vui lòng bỏ qua email hoặc liên hệ với chúng tôi để được hỗ trợ. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
@endsection
