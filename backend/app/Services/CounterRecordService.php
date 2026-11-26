<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Vehicle;
use App\Support\CustomerPhone;
use App\Support\VehicleCatalogSelection;
use App\Support\VehicleIdentity;
use App\Support\VehicleVin;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Hồ sơ tạo tại quầy (ADV-02/03/04): khách mới (`customer{}`) và xe chưa có trong hệ thống (`vehicle{}`)
 * gửi kèm phiếu tiếp nhận hoặc lịch đặt hộ. Gọi `resolve()` TRONG transaction của thao tác chính
 * để lỗi ở bước sau không để lại hồ sơ dở dang.
 */
class CounterRecordService
{
    /**
     * Luật validate dùng chung (nơi gọi tự thêm điều kiện riêng, ví dụ cấm khách mới khi đã có lịch hẹn).
     *
     * @return array<string, mixed>
     */
    public static function rules(): array
    {
        return [
            'customer_id' => ['required_without:customer', 'nullable', 'integer', 'exists:customers,id'],
            'customer' => ['required_without:customer_id', 'prohibits:customer_id', 'array'],
            'customer.full_name' => ['required_with:customer', 'string', 'max:100'],
            'customer.phone' => ['required_with:customer', 'string', 'max:20', 'regex:/^[0-9+\s.\-]{8,20}$/', CustomerPhone::unique()],
            'customer.email' => ['nullable', 'email', 'max:150', Rule::unique('customers', 'email')],
            'vehicle_id' => ['required_without:vehicle', 'nullable', 'integer', 'exists:vehicles,id'],
            'vehicle' => ['required_without:vehicle_id', 'prohibits:vehicle_id', 'array'],
            'vehicle.model_id' => ['required_with:vehicle', 'integer', 'exists:vehicle_models,id'],
            'vehicle.trim_id' => ['nullable', 'integer'],
            'vehicle.license_plate' => ['required_with:vehicle', 'string', 'max:20', VehicleIdentity::plateUnique()],
            'vehicle.year' => ['nullable', 'integer', 'min:1900', 'max:'.(date('Y') + 1)],
        ];
    }

    /**
     * Luật riêng khi tiếp nhận xe: bắt buộc ODO, năm sản xuất, VIN; biển số không bắt buộc.
     * Xe có sẵn còn thiếu năm / VIN thì gửi `vehicle_year`, `vehicle_vin` để bổ sung vào hồ sơ.
     *
     * @return array<string, mixed>
     */
    public static function receptionRules(): array
    {
        $maxYear = date('Y') + 1;

        return [
            'mileage_received' => ['required', 'integer', 'min:0'],
            'vehicle.license_plate' => ['nullable', 'string', 'max:20', VehicleIdentity::plateUnique()],
            'vehicle.year' => ['required_with:vehicle', 'integer', 'min:1900', "max:{$maxYear}"],
            'vehicle.vin' => ['required_with:vehicle', 'string', 'regex:'.VehicleVin::PATTERN, VehicleIdentity::vinUnique()],
            'vehicle_year' => ['nullable', 'integer', 'min:1900', "max:{$maxYear}"],
            'vehicle_vin' => ['nullable', 'string', 'regex:'.VehicleVin::PATTERN, VehicleIdentity::vinUnique()],
            'customer_request' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /** @return array<string, string> */
    public static function receptionMessages(): array
    {
        $vinFormat = VehicleVin::INVALID_MESSAGE;
        $vinTaken = VehicleVin::TAKEN_MESSAGE;

        return [
            'mileage_received.required' => 'Nhập số ODO khi tiếp nhận xe.',
            'vehicle.year.required_with' => 'Nhập năm sản xuất của xe.',
            'vehicle.vin.required_with' => 'Nhập số VIN của xe.',
            'vehicle.vin.regex' => $vinFormat,
            'vehicle.vin.unique' => $vinTaken,
            'vehicle_vin.regex' => $vinFormat,
            'vehicle_vin.unique' => $vinTaken,
        ];
    }

    /**
     * VIN viết hoa, bỏ khoảng trắng trước khi kiểm tra trùng.
     *
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public static function normalizedVins(array $input): array
    {
        $normalized = [];
        if (is_string($input['vehicle_vin'] ?? null)) {
            $normalized['vehicle_vin'] = self::normalizeVin($input['vehicle_vin']);
        }
        if (is_array($input['vehicle'] ?? null) && is_string($input['vehicle']['vin'] ?? null)) {
            $normalized['vehicle'] = [...$input['vehicle'], 'vin' => self::normalizeVin($input['vehicle']['vin'])];
        }

        return $normalized;
    }

    /**
     * Bổ sung năm / VIN còn thiếu của xe, không ghi đè dữ liệu đã có. Gọi trong transaction tiếp nhận.
     *
     * @param  array<string, mixed>  $data
     *
     * @throws ValidationException
     */
    public function completeVehicleProfile(int $vehicleId, array $data): void
    {
        $vehicle = Vehicle::query()->lockForUpdate()->findOrFail($vehicleId);
        $missing = [];
        if (empty($vehicle->year)) {
            $vehicle->year = $data['vehicle_year'] ?? null;
            if (empty($vehicle->year)) {
                $missing['vehicle_year'] = 'Xe chưa có năm sản xuất: nhập để lưu vào hồ sơ.';
            }
        }
        if (trim((string) $vehicle->vin) === '') {
            $vehicle->vin = $data['vehicle_vin'] ?? null;
            if (empty($vehicle->vin)) {
                $missing['vehicle_vin'] = 'Xe chưa có số VIN: nhập để lưu vào hồ sơ.';
            }
        }
        if ($missing !== []) {
            throw ValidationException::withMessages($missing);
        }
        $vehicle->save();
    }

    private static function normalizeVin(string $vin): string
    {
        return VehicleVin::normalize($vin);
    }

    /** @return array<string, string> */
    public static function messages(): array
    {
        return [
            'customer.phone.unique' => 'Số điện thoại đã có hồ sơ khách — tìm và chọn khách có sẵn.',
            'customer.phone.regex' => 'Số điện thoại không hợp lệ.',
            'customer.email.unique' => 'Email đã thuộc hồ sơ khách khác.',
            'vehicle.license_plate.unique' => 'Biển số đã có trong hệ thống — tìm theo biển số để chọn xe có sẵn.',
        ];
    }

    /**
     * Tạo khách / xe mới nếu có, trả dữ liệu đã thay bằng `customer_id` / `vehicle_id`.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function resolve(array $data, ?int $mileage = null): array
    {
        if (! empty($data['customer'])) {
            $data['customer_id'] = Customer::query()->create([
                'full_name' => trim($data['customer']['full_name']),
                'phone' => trim($data['customer']['phone']),
                'email' => $data['customer']['email'] ?? null,
            ])->id;
        }
        if (! empty($data['vehicle'])) {
            $catalog = VehicleCatalogSelection::apply([
                'model_id' => $data['vehicle']['model_id'],
                'trim_id' => $data['vehicle']['trim_id'] ?? null,
            ], allowHidden: true);
            $data['vehicle_id'] = Vehicle::query()->create($catalog + [
                'customer_id' => $data['customer_id'],
                'license_plate' => filled($data['vehicle']['license_plate'] ?? null) ? mb_strtoupper(trim($data['vehicle']['license_plate'])) : null,
                'vin' => $data['vehicle']['vin'] ?? null,
                'year' => $data['vehicle']['year'] ?? null,
                'mileage' => $mileage,
            ])->id;
        }
        unset($data['customer'], $data['vehicle']);

        return $data;
    }
}
