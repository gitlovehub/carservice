<?php

namespace App\Http\Middleware;

use Illuminate\Routing\Middleware\ThrottleRequests;

/**
 * `throttle:X,Y` theo TỪNG route.
 *
 * Mặc định Laravel tạo khóa giới hạn chỉ từ IP (khách) hoặc tài khoản (đã đăng nhập), nên mọi route có
 * `throttle` dùng chung một bộ đếm: 5 lần xem danh mục xe đã chặn luôn lần đăng nhập đầu tiên (throttle:5,1).
 * Lớp này thêm phương thức + mẫu URI vào khóa để mỗi route có hạn mức riêng. Limiter có tên
 * (vd. `throttle:booking-create`) không đi qua hàm này nên giữ nguyên.
 */
class ThrottleRequestsPerRoute extends ThrottleRequests
{
    protected function resolveRequestSignature($request)
    {
        $route = $request->route();
        $scope = $route ? implode('|', $route->methods()).' '.$route->uri() : '';

        return sha1($scope.'#'.parent::resolveRequestSignature($request));
    }
}
