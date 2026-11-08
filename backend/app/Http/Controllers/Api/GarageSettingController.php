<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GarageSetting;
use App\Services\AddressSuggestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Thông tin gara (công khai đọc, admin sửa) + gợi ý địa chỉ (Goong / OpenStreetMap). */
class GarageSettingController extends Controller
{
    public function __construct(private readonly AddressSuggestService $addresses) {}

    /** GET /garage-settings — công khai (Footer, Liên hệ). */
    public function show(): JsonResponse
    {
        $setting = GarageSetting::current();

        return response()->json(['data' => $setting?->only(['name', 'phone', 'email', 'address_line', 'ward', 'district', 'province', 'latitude', 'longitude'])]);
    }

    /** PUT /admin/garage-settings */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+ .()-]{6,30}$/'],
            'email' => ['nullable', 'email', 'max:150'],
            'address_line' => ['required', 'string', 'max:255'],
            'ward' => ['nullable', 'string', 'max:120'],
            'district' => ['nullable', 'string', 'max:120'],
            'province' => ['nullable', 'string', 'max:120'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'place_provider' => ['nullable', Rule::in(['goong', 'osm'])],
            'place_id' => ['nullable', 'string', 'max:255'],
        ]);

        $setting = GarageSetting::current() ?? new GarageSetting;
        $setting->fill([...$data, 'updated_by_account_id' => $request->user()->id])->save();

        return response()->json(['message' => 'Đã lưu thông tin gara.', 'data' => $setting->fresh()]);
    }

    /** GET /address/suggest?q=&lat=&lng= — gợi ý địa chỉ (đăng nhập, có throttle). */
    public function suggest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'min:3', 'max:200'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        return response()->json(['data' => $this->addresses->suggest(
            $data['q'], isset($data['lat']) ? (float) $data['lat'] : null, isset($data['lng']) ? (float) $data['lng'] : null,
        )]);
    }

    /** GET /address/place?place_id= — tọa độ của gợi ý Goong. */
    public function place(Request $request): JsonResponse
    {
        $data = $request->validate(['place_id' => ['required', 'string', 'max:255']]);
        $place = $this->addresses->goongPlace($data['place_id']);
        abort_if($place === null, 404, 'Không lấy được vị trí của địa chỉ này.');

        return response()->json(['data' => $place]);
    }
}
