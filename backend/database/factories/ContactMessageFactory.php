<?php

namespace Database\Factories;

use App\Models\ContactMessage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContactMessage>
 */
class ContactMessageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'phone' => '09'.fake()->numerify('########'),
            'email' => fake()->optional()->safeEmail(),
            'message' => fake()->sentence(12),
            'status' => ContactMessage::NEW,
        ];
    }

    /** Tin đã được admin xử lý. */
    public function handled(): static
    {
        return $this->state(fn () => ['status' => ContactMessage::HANDLED, 'handled_at' => now()]);
    }
}
