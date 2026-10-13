<?php

namespace Tests\Feature;

use App\Exceptions\InvalidStatusTransitionException;
use Illuminate\Support\Facades\Route;
// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }

    public function test_invalid_status_transition_returns_a_json_422_response(): void
    {
        Route::get('/api/test/invalid-status-transition', function () {
            throw InvalidStatusTransitionException::because('Chuyển trạng thái không hợp lệ.');
        });

        $this->getJson('/api/test/invalid-status-transition')
            ->assertUnprocessable()
            ->assertExactJson(['message' => 'Chuyển trạng thái không hợp lệ.']);
    }
}
