<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Gợi ý địa chỉ kiểu app đặt xe. Có GOONG_API_KEY → Goong (bản đồ Việt Nam, chính xác số nhà / hẻm);
 * không có key hoặc Goong lỗi → OpenStreetMap (Photon, miễn phí). Gọi từ backend nên key không lộ ra trình duyệt.
 */
class AddressSuggestService
{
    private const GOONG = 'https://rsapi.goong.io';

    private const PHOTON = 'https://photon.komoot.io/api/';

    /** Khung Việt Nam để ưu tiên kết quả trong nước (lon/lat). */
    private const VN_BBOX = '102.1,8.2,109.5,23.4';

    /**
     * @return list<array{provider: string, place_id: ?string, description: string, main_text: string, secondary_text: string, latitude: ?float, longitude: ?float}>
     */
    public function suggest(string $query, ?float $lat = null, ?float $lng = null): array
    {
        $query = trim($query);
        if (mb_strlen($query) < 3) {
            return [];
        }
        $key = 'addr:'.md5(mb_strtolower($query).'|'.$lat.'|'.$lng);

        return Cache::remember($key, now()->addHours(12), function () use ($query, $lat, $lng): array {
            if ($this->goongKey()) {
                $goong = $this->goongSuggest($query, $lat, $lng);
                if ($goong !== null) {
                    return $goong;
                }
            }

            return $this->photonSuggest($query, $lat, $lng);
        });
    }

    /** Tọa độ + địa chỉ đầy đủ của một gợi ý Goong (Photon đã có sẵn tọa độ trong gợi ý). */
    public function goongPlace(string $placeId): ?array
    {
        if (! $this->goongKey()) {
            return null;
        }
        $response = Http::timeout(6)->get(self::GOONG.'/Place/Detail', ['place_id' => $placeId, 'api_key' => $this->goongKey()]);
        $result = $response->ok() ? $response->json('result') : null;
        if (! $result) {
            return null;
        }

        return [
            'provider' => 'goong',
            'place_id' => $placeId,
            'description' => $result['formatted_address'] ?? ($result['name'] ?? ''),
            'latitude' => isset($result['geometry']['location']['lat']) ? (float) $result['geometry']['location']['lat'] : null,
            'longitude' => isset($result['geometry']['location']['lng']) ? (float) $result['geometry']['location']['lng'] : null,
        ];
    }

    private function goongKey(): ?string
    {
        $key = config('services.goong.key');

        return is_string($key) && $key !== '' ? $key : null;
    }

    private function goongSuggest(string $query, ?float $lat, ?float $lng): ?array
    {
        try {
            $params = ['api_key' => $this->goongKey(), 'input' => $query, 'limit' => 6];
            if ($lat !== null && $lng !== null) {
                $params['location'] = "$lat,$lng";
            }
            $response = Http::timeout(6)->get(self::GOONG.'/Place/AutoComplete', $params);
            if (! $response->ok()) {
                Log::warning('Goong AutoComplete lỗi', ['status' => $response->status()]);

                return null;
            }

            return collect($response->json('predictions') ?? [])->map(fn (array $p) => [
                'provider' => 'goong',
                'place_id' => $p['place_id'] ?? null,
                'description' => $p['description'] ?? '',
                'main_text' => $p['structured_formatting']['main_text'] ?? ($p['description'] ?? ''),
                'secondary_text' => $p['structured_formatting']['secondary_text'] ?? '',
                'latitude' => null,
                'longitude' => null,
            ])->filter(fn ($p) => $p['description'] !== '')->values()->all();
        } catch (\Throwable $e) {
            Log::warning('Goong AutoComplete lỗi', ['error' => $e->getMessage()]);

            return null;
        }
    }

    private function photonSuggest(string $query, ?float $lat, ?float $lng): array
    {
        try {
            $params = ['q' => $query, 'limit' => 6, 'bbox' => self::VN_BBOX];
            if ($lat !== null && $lng !== null) {
                $params['lat'] = $lat;
                $params['lon'] = $lng;
            }
            $response = Http::timeout(6)->withHeaders(['User-Agent' => 'CarService-Garage/1.0'])->get(self::PHOTON, $params);
            if (! $response->ok()) {
                return [];
            }

            return collect($response->json('features') ?? [])->map(function (array $feature): array {
                $p = $feature['properties'] ?? [];
                $street = trim(implode(' ', array_filter([$p['housenumber'] ?? null, $p['street'] ?? null])));
                $hasName = ! empty($p['name']);
                $main = $hasName ? $p['name'] : ($street ?: ($p['city'] ?? ''));
                // Có tên địa điểm thì số nhà + đường đưa xuống dòng phụ.
                $secondary = implode(', ', array_filter([$hasName ? $street : null, $p['district'] ?? null, $p['city'] ?? null, $p['state'] ?? null]));

                return [
                    'provider' => 'osm',
                    'place_id' => isset($p['osm_id']) ? ($p['osm_type'] ?? '').$p['osm_id'] : null,
                    'description' => implode(', ', array_filter([$main, $secondary])),
                    'main_text' => $main,
                    'secondary_text' => $secondary,
                    'latitude' => isset($feature['geometry']['coordinates'][1]) ? (float) $feature['geometry']['coordinates'][1] : null,
                    'longitude' => isset($feature['geometry']['coordinates'][0]) ? (float) $feature['geometry']['coordinates'][0] : null,
                ];
            })->filter(fn ($p) => $p['main_text'] !== '')->values()->all();
        } catch (\Throwable $e) {
            Log::warning('Photon lỗi', ['error' => $e->getMessage()]);

            return [];
        }
    }
}
