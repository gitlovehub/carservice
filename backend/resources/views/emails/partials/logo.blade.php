{{-- Logo chính thức (public/brand/carservice-logo.png). Trong mail: nhúng thẳng (CID) để hiển thị cả khi backend chạy local; trang web: link ảnh. --}}
@php($logoPath = public_path('brand/carservice-logo.png'))
<img src="{{ isset($message) && method_exists($message, 'embed') ? $message->embed($logoPath) : asset('brand/carservice-logo.png') }}" alt="CarService" width="150" style="display: inline-block; width: 150px; max-width: 60%; height: auto; border: 0;">
