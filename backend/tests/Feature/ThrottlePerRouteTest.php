<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Mỗi route có hạn mức `throttle:X,Y` riêng — xem trang công khai không được làm hết lượt đăng nhập. */
class ThrottlePerRouteTest extends TestCase
{
    use RefreshDatabase;

    private function login(): int
    {
        return $this->postJson('/api/login', ['email' => 'khong-ton-tai@example.com', 'password' => 'sai-mat-khau'])->status();
    }

    public function test_browsing_public_catalog_does_not_use_up_login_attempts(): void
    {
        foreach (range(1, 10) as $i) {
            $this->getJson('/api/vehicle-catalog/brands')->assertOk();
        }

        $this->assertSame(422, $this->login(), 'Lần đăng nhập đầu tiên không bị chặn bởi lượt xem danh mục');
    }

    public function test_each_route_still_enforces_its_own_limit(): void
    {
        foreach (range(1, 5) as $i) {
            $this->assertSame(422, $this->login());
        }

        $this->assertSame(429, $this->login(), 'Đăng nhập vẫn giới hạn 5 lần/phút');
        $this->getJson('/api/vehicle-catalog/brands')->assertOk();
    }
}
