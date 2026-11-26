<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Sau reverse proxy, giới hạn số lần thử phải tính theo IP người dùng chứ không theo IP proxy. */
class TrustedProxyThrottleTest extends TestCase
{
    use RefreshDatabase;

    private function attemptLogin(string $forwardedFor): int
    {
        return $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])
            ->withHeader('X-Forwarded-For', $forwardedFor)
            ->postJson('/api/login', ['email' => 'khong-ton-tai@example.com', 'password' => 'sai-mat-khau'])
            ->status();
    }

    public function test_login_throttle_is_counted_per_forwarded_client_not_per_proxy(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->assertSame(422, $this->attemptLogin('203.0.113.10'), "Lần thử {$attempt} của khách A");
        }

        $this->assertSame(429, $this->attemptLogin('203.0.113.10'), 'Khách A vượt giới hạn');
        $this->assertSame(422, $this->attemptLogin('198.51.100.20'), 'Khách B đi qua cùng proxy không bị chặn theo khách A');
    }

    public function test_client_cannot_bypass_throttle_by_prepending_a_fake_forwarded_ip(): void
    {
        foreach (range(1, 5) as $attempt) {
            $this->attemptLogin('203.0.113.10');
        }

        // Proxy nối IP thật vào cuối; phần client tự chèn phía trước không được dùng làm khóa giới hạn.
        $this->assertSame(429, $this->attemptLogin('9.9.9.9, 203.0.113.10'));
    }
}
