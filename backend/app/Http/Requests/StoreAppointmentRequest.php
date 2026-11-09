<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->role === 'CUSTOMER';
    }

    public function rules(): array
    {
        return [
            'vehicle_id' => [
                'required_without:new_vehicle',
                'prohibited_unless:new_vehicle,null',
                'integer',
                'exists:vehicles,id',
            ],

            'new_vehicle' => [
                'required_without:vehicle_id',
                'prohibited_unless:vehicle_id,null',
                'array',
            ],

            // Chọn từ danh mục (model_id, trim_id tùy chọn) hoặc gửi tên hãng/dòng xe như trước.
            'new_vehicle.model_id' => ['nullable', 'integer'],
            'new_vehicle.trim_id' => ['nullable', 'integer'],
            'new_vehicle.brand' => [Rule::requiredIf($this->needsVehicleNames()), 'nullable', 'string', 'max:100'],
            'new_vehicle.model' => [Rule::requiredIf($this->needsVehicleNames()), 'nullable', 'string', 'max:100'],
            'new_vehicle.license_plate' => ['nullable', 'string', 'max:20'],
            'appointment_date' => ['required', 'date_format:Y-m-d'],
            'appointment_time' => ['required', 'date_format:H:i'],
            'request_type' => ['sometimes', Rule::in(['DIAGNOSIS', 'REPAIR', 'MAINTENANCE', 'REPLACEMENT'])],
            'symptom_description' => ['nullable', 'string', 'max:5000'],
            'note' => ['nullable', 'string', 'max:5000'],
            'service_ids' => ['sometimes', 'array'],
            'service_ids.*' => ['integer', 'distinct', Rule::exists('services', 'id')->where('status', 'ACTIVE')->where('is_visible', true)],
            'package_ids' => ['sometimes', 'array', 'max:1'],
            'package_ids.*' => ['integer', 'distinct', Rule::exists('maintenance_packages', 'id')->where('status', 'ACTIVE')],
        ];
    }

    private function needsVehicleNames(): bool
    {
        return $this->has('new_vehicle') && ! $this->filled('new_vehicle.model_id');
    }

    /**
     * Khách phải chọn ít nhất một gói, một dịch vụ, hoặc mô tả triệu chứng.
     *
     * @return array<int, \Closure>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $hasNeed = ! empty($this->input('service_ids'))
                    || ! empty($this->input('package_ids'))
                    || trim((string) $this->input('symptom_description')) !== '';

                if (! $hasNeed) {
                    $validator->errors()->add('service_ids', 'Vui lòng chọn dịch vụ, gói bảo dưỡng hoặc mô tả tình trạng xe.');
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'vehicle_id.required_without' => 'Vui lòng chọn xe có sẵn hoặc khai báo xe mới.',
            'vehicle_id.prohibited_unless' => 'Chỉ chọn xe có sẵn hoặc khai báo xe mới, không chọn cả hai.',
            'vehicle_id.integer' => 'Xe đã chọn không hợp lệ.',
            'vehicle_id.exists' => 'Xe không tồn tại hoặc đã bị xóa.',
            'new_vehicle.required_without' => 'Vui lòng chọn xe có sẵn hoặc khai báo xe mới.',
            'new_vehicle.prohibited_unless' => 'Chỉ chọn xe có sẵn hoặc khai báo xe mới, không chọn cả hai.',
            'new_vehicle.brand.required' => 'Vui lòng chọn hãng xe.',
            'new_vehicle.model.required' => 'Vui lòng chọn dòng xe.',
            'new_vehicle.model_id.integer' => 'Dòng xe đã chọn không hợp lệ.',
            'new_vehicle.trim_id.integer' => 'Phiên bản đã chọn không hợp lệ.',
            'new_vehicle.license_plate.unique' => 'Biển số đã tồn tại.',
            'new_vehicle.license_plate.max' => 'Biển số không được quá 20 ký tự.',
            'appointment_date.required' => 'Vui lòng chọn ngày hẹn.',
            'appointment_date.date_format' => 'Ngày hẹn phải đúng định dạng YYYY-MM-DD.',
            'appointment_date.after_or_equal' => 'Ngày hẹn không được ở quá khứ.',
            'appointment_time.required' => 'Vui lòng chọn giờ hẹn.',
            'appointment_time.date_format' => 'Giờ hẹn phải đúng định dạng HH:MM (ví dụ 09:00).',
            'request_type.required' => 'Vui lòng chọn loại yêu cầu.',
            'request_type.in' => 'Loại yêu cầu không hợp lệ.',
            'symptom_description.max' => 'Mô tả triệu chứng quá dài.',
            'note.max' => 'Ghi chú quá dài.',
            'service_ids.*.exists' => 'Dịch vụ đã chọn không tồn tại hoặc ngừng hoạt động.',
            'service_ids.*.distinct' => 'Dịch vụ bị chọn trùng.',
            'package_ids.max' => 'Mỗi lịch hẹn chỉ chọn một gói bảo dưỡng.',
            'package_ids.*.exists' => 'Gói bảo dưỡng không tồn tại hoặc đã ngừng áp dụng.',
            'package_ids.*.distinct' => 'Gói bảo dưỡng bị chọn trùng.',
        ];
    }
}
