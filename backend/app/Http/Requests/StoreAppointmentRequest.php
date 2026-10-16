<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'vehicle_id' => ['nullable', 'required_without:new_vehicle', 'integer', 'exists:vehicles,id'],
            'new_vehicle' => ['required_without:vehicle_id', 'array'],
            'new_vehicle.brand' => ['required_with:new_vehicle', 'string', 'max:100'],
            'new_vehicle.model' => ['required_with:new_vehicle', 'string', 'max:100'],
            'new_vehicle.license_plate' => ['required_with:new_vehicle', 'string', 'max:20', 'unique:vehicles,license_plate'],
            'new_vehicle.vehicle_type' => ['required_with:new_vehicle', Rule::in([
                'Sedan / Hatchback (4-5 chỗ)',
                'SUV / Crossover (5-7 chỗ)',
                'Bán tải / MPV (7-8 chỗ)',
            ])],
            'appointment_date' => ['required', 'date', 'after_or_equal:today'],
            'appointment_time' => ['required', 'date_format:H:i,H:i:s'],
            'request_type' => ['required', Rule::in(['DIAGNOSIS', 'REPAIR', 'MAINTENANCE', 'REPLACEMENT'])],
            'symptom_description' => ['nullable', 'string', 'max:1000'],
            'note' => ['nullable', 'string', 'max:500'],
            'service_name' => ['nullable', 'string', Rule::in([
                'Bảo dưỡng định kỳ',
                'Kiểm tra tổng quát',
                'Thay dầu động cơ',
            ])],
            'service_ids' => ['nullable', 'array'],
            'service_ids.*' => ['integer', 'exists:services,id'],
            'package_ids' => ['nullable', 'array'],
            'package_ids.*' => ['integer', 'exists:maintenance_packages,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'vehicle_id.required_without' => 'Vui lòng chọn xe đã lưu hoặc nhập thông tin xe mới.',
            'new_vehicle.required_without' => 'Vui lòng chọn xe đã lưu hoặc nhập thông tin xe mới.',
            'new_vehicle.license_plate.required_with' => 'Vui lòng nhập biển số xe.',
            'appointment_date.required' => 'Vui lòng chọn ngày hẹn.',
            'appointment_date.after_or_equal' => 'Ngày hẹn không được ở quá khứ.',
            'appointment_time.required' => 'Vui lòng chọn khung giờ hẹn.',
            'request_type.required' => 'Vui lòng chọn loại yêu cầu tiếp nhận.',
            'request_type.in' => 'Loại yêu cầu không hợp lệ.',
            'service_ids.*.exists' => 'Dịch vụ đã chọn không tồn tại trong hệ thống.',
            'service_name.in' => 'Dịch vụ đã chọn không hợp lệ.',
            'package_ids.*.exists' => 'Gói bảo dưỡng đã chọn không tồn tại trong hệ thống.',
        ];
    }
}
