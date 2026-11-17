<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Vehicle;
use App\Support\VehicleCatalogSelection;
use Illuminate\Validation\Rule;

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
            'customer.phone' => ['required_with:customer', 'string', 'max:20', 'regex:/^[0-9+\s.\-]{8,20}$/', Rule::unique('customers', 'phone')],
            'customer.email' => ['nullable', 'email', 'max:150', Rule::unique('customers', 'email')],
            'vehicle_id' => ['required_without:vehicle', 'nullable', 'integer', 'exists:vehicles,id'],
            'vehicle' => ['required_without:vehicle_id', 'prohibits:vehicle_id', 'array'],
            'vehicle.model_id' => ['required_with:vehicle', 'integer', 'exists:vehicle_models,id'],
            'vehicle.trim_id' => ['nullable', 'integer'],
            'vehicle.license_plate' => ['required_with:vehicle', 'string', 'max:20', Rule::unique('vehicles', 'license_plate')],
            'vehicle.year' => ['nullable', 'integer', 'min:1900', 'max:'.(date('Y') + 1)],
        ];
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
                'license_plate' => mb_strtoupper(trim($data['vehicle']['license_plate'])),
                'year' => $data['vehicle']['year'] ?? null,
                'mileage' => $mileage,
            ])->id;
        }
        unset($data['customer'], $data['vehicle']);

        return $data;
    }
}
