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
            'vehicle_id'           => ['required', 'integer'],
            'appointment_date'     => ['required', 'date', 'after_or_equal:today'],
            'appointment_time'     => ['required', 'date_format:H:i,H:i:s'],
            'request_type'         => ['required', Rule::in(['DIAGNOSIS', 'REPAIR', 'MAINTENANCE', 'REPLACEMENT'])],
            'symptom_description' => ['nullable', 'string', 'max:1000'],
            'note'                 => ['nullable', 'string', 'max:500'],
            'service_ids'          => ['nullable', 'array'],
            'service_ids.*'        => ['integer', 'exists:services,id'],
            'package_ids'          => ['nullable', 'array'],
            'package_ids.*'        => ['integer', 'exists:maintenance_packages,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'vehicle_id.required'             => 'Vui lòng chọn xe cần làm dịch vụ.',
            'appointment_date.required'       => 'Vui lòng chọn ngày hẹn.',
            'appointment_date.after_or_equal' => 'Ngày hẹn không được ở trong quá khứ.',
            'appointment_time.required'       => 'Vui lòng chọn khung giờ hẹn.',
            'request_type.required'           => 'Vui lòng chọn loại yêu cầu tiếp nhận.',
            'request_type.in'                 => 'Loại yêu cầu không hợp lệ.',
            'service_ids.*.exists'            => 'Dịch vụ đã chọn không tồn tại trong hệ thống.',
            'package_ids.*.exists'            => 'Gói bảo dưỡng đã chọn không tồn tại trong hệ thống.',
        ];
    }
}