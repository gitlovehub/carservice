<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\GarageSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Thông tin gara (admin sửa, công khai đọc) + gợi ý địa chỉ Goong / OpenStreetMap qua backend (Http::fake, không gọi mạng). */
class GarageSettingTest extends TestCase
{
    use RefreshDatabase;

    private Account $admin;

    private Account $advisor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = Account::factory()->create(['role' => Account::ROLE_ADMIN]);
        $this->advisor = Account::factory()->advisor()->create();
        Employee::factory()->create(['account_id' => $this->advisor->id]);
    }

    private function payload(array $overrides = []): array
    {
        return [
            'name' => 'CarService Thủ Đức', 'phone' => '028 3812 3456', 'email' => 'lienhe@carservicevn.xyz',
            'address_line' => '12 Võ Văn Ngân', 'ward' => 'Linh Chiểu', 'district' => 'Thủ Đức', 'province' => 'TP. Hồ Chí Minh',
            'latitude' => 10.8506, 'longitude' => 106.7720, 'place_provider' => 'goong', 'place_id' => 'abc', ...$overrides,
        ];
    }

    public function test_admin_updates_and_public_reads_garage_info(): void
    {
        $this->getJson('/api/garage-settings')->assertOk()->assertJsonPath('data', null);

        $this->actingAs($this->admin)->putJson('/api/admin/garage-settings', $this->payload())->assertOk();
        $this->actingAs($this->admin)->putJson('/api/admin/garage-settings', $this->payload(['address_line' => '15 Võ Văn Ngân']))->assertOk();
        $this->assertSame(1, GarageSetting::query()->count());

        auth()->forgetGuards();
        $this->getJson('/api/garage-settings')->assertOk()
            ->assertJsonPath('data.address_line', '15 Võ Văn Ngân')
            ->assertJsonPath('data.latitude', 10.8506)
            ->assertJsonMissingPath('data.place_id')
            ->assertJsonMissingPath('data.updated_by_account_id');
    }

    public function test_validation_and_permissions(): void
    {
        $this->actingAs($this->admin)->putJson('/api/admin/garage-settings', $this->payload(['address_line' => '']))->assertUnprocessable();
        $this->actingAs($this->admin)->putJson('/api/admin/garage-settings', $this->payload(['latitude' => 120]))->assertUnprocessable();
        $this->actingAs($this->admin)->putJson('/api/admin/garage-settings', $this->payload(['longitude' => null]))->assertUnprocessable();
        $this->actingAs($this->advisor)->putJson('/api/admin/garage-settings', $this->payload())->assertForbidden();
    }

    public function test_suggest_uses_goong_when_key_is_configured_and_never_exposes_key(): void
    {
        config(['services.goong.key' => 'secret-goong-key']);
        Http::fake([
            'rsapi.goong.io/Place/AutoComplete*' => Http::response(['predictions' => [[
                'place_id' => 'p1', 'description' => '12 Võ Văn Ngân, Linh Chiểu, Thủ Đức, Hồ Chí Minh',
                'structured_formatting' => ['main_text' => '12 Võ Văn Ngân', 'secondary_text' => 'Linh Chiểu, Thủ Đức, Hồ Chí Minh'],
            ]]]),
            'rsapi.goong.io/Place/Detail*' => Http::response(['result' => ['formatted_address' => '12 Võ Văn Ngân, Thủ Đức', 'geometry' => ['location' => ['lat' => 10.85, 'lng' => 106.77]]]]),
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/address/suggest?q=12 vo van ngan')->assertOk()
            ->assertJsonPath('data.0.provider', 'goong')->assertJsonPath('data.0.main_text', '12 Võ Văn Ngân');
        $this->assertStringNotContainsString('secret-goong-key', $response->getContent());

        $this->actingAs($this->admin)->getJson('/api/address/place?place_id=p1')->assertOk()
            ->assertJsonPath('data.latitude', 10.85)->assertJsonPath('data.longitude', 106.77);
        Http::assertSent(fn ($request) => str_contains($request->url(), 'AutoComplete') && $request['api_key'] === 'secret-goong-key');
    }

    public function test_suggest_falls_back_to_openstreetmap_without_key(): void
    {
        config(['services.goong.key' => null]);
        Http::fake([
            'photon.komoot.io/*' => Http::response(['features' => [[
                'geometry' => ['coordinates' => [106.7, 10.77]],
                'properties' => ['osm_type' => 'N', 'osm_id' => 1, 'housenumber' => '1', 'street' => 'Lê Lợi', 'district' => 'Quận 1', 'city' => 'Hồ Chí Minh'],
            ]]]),
        ]);

        $this->actingAs($this->advisor)->getJson('/api/address/suggest?q=1 le loi')->assertOk()
            ->assertJsonPath('data.0.provider', 'osm')->assertJsonPath('data.0.main_text', '1 Lê Lợi')
            ->assertJsonPath('data.0.latitude', 10.77);
        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'goong'));
        $this->actingAs($this->advisor)->getJson('/api/address/place?place_id=x')->assertNotFound();
    }

    public function test_short_query_and_guest_are_rejected(): void
    {
        Http::fake();
        $this->actingAs($this->admin)->getJson('/api/address/suggest?q=ab')->assertUnprocessable();
        auth()->forgetGuards();
        $this->getJson('/api/address/suggest?q=abcd')->assertUnauthorized();
        $customer = Account::factory()->create();
        Customer::factory()->create(['account_id' => $customer->id]);
        $this->actingAs($this->admin)->putJson('/api/admin/garage-settings', [])->assertUnprocessable();
        Http::assertNothingSent();
    }
}
