<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->role === 'CUSTOMER';
    }

    public function rules(): array
    {
        return [
            'vehicle_id' => ['required_without:new_vehicle', 'prohibited_with:new_vehicle', 'integer', 'exists:vehicles,id'],
            'new_vehicle' => ['required_without:vehicle_id', 'prohibited_with:vehicle_id', 'array'],
            'new_vehicle.brand' => ['required_with:new_vehicle', 'string', 'max:100'],
            'new_vehicle.model' => ['required_with:new_vehicle', 'string', 'max:100'],
            'new_vehicle.vehicle_type' => ['required_with:new_vehicle', Rule::in(['Sedan / Hatchback (4-5 chỗ)', 'SUV / Crossover (5-7 chỗ)', 'MPV', 'PICKUP'])],
            'new_vehicle.license_plate' => ['nullable', 'string', 'max:20', 'unique:vehicles,license_plate'],
            'appointment_date' => ['required', 'date_format:Y-m-d'],
            'appointment_time' => ['required', 'date_format:H:i'],
            'request_type' => ['required', Rule::in(['DIAGNOSIS', 'REPAIR', 'MAINTENANCE', 'REPLACEMENT'])],
            'symptom_description' => ['nullable', 'string', 'max:5000'],
            'note' => ['nullable', 'string', 'max:5000'],
            'service_ids' => ['sometimes', 'array'],
            'service_ids.*' => ['integer', 'distinct', Rule::exists('services', 'id')->where('status', 'ACTIVE')],
            'package_ids' => ['sometimes', 'array'],
            'package_ids.*' => ['integer', 'distinct', 'exists:maintenance_packages,id'],
            'service_name' => ['sometimes', Rule::in(['Bảo dưỡng định kỳ', 'Kiểm tra tổng quát', 'Thay dầu động cơ'])],
        ];
    }
}
