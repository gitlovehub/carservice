<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInternalAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['ADVISOR', 'ADMIN'], true);
    }

    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'vehicle_id' => ['required', 'integer', 'exists:vehicles,id'],
            'appointment_date' => ['required', 'date_format:Y-m-d'],
            'appointment_time' => ['required', 'date_format:H:i'],
            'request_type' => ['required', Rule::in(['DIAGNOSIS', 'REPAIR', 'MAINTENANCE', 'REPLACEMENT'])],
            'symptom_description' => ['nullable', 'string', 'max:5000'],
            'note' => ['nullable', 'string', 'max:5000'],
            'service_ids' => ['sometimes', 'array'],
            'service_ids.*' => ['integer', 'distinct', Rule::exists('services', 'id')->where('status', 'ACTIVE')],
            'package_ids' => ['sometimes', 'array'],
            'package_ids.*' => ['integer', 'distinct', 'exists:maintenance_packages,id'],
        ];
    }
}
