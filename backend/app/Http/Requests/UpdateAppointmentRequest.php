<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'vehicle_id'           => ['sometimes', 'integer', Rule::exists('vehicles', 'id')->whereNull('deleted_at')],
            'appointment_date'     => ['sometimes', 'date', 'after_or_equal:today'],
            'appointment_time'     => ['sometimes', 'date_format:H:i'],
            'request_type'         => ['sometimes', Rule::in(['DIAGNOSIS', 'REPAIR', 'MAINTENANCE', 'REPLACEMENT'])],
            'symptom_description' => ['nullable', 'string', 'max:1000'],
            'note'                 => ['nullable', 'string', 'max:500'],
            'service_ids'          => ['nullable', 'array'],
            'service_ids.*'        => ['integer', 'distinct', Rule::exists('services', 'id')->where('status', 'ACTIVE')],
            'package_ids'          => ['nullable', 'array'],
            'package_ids.*'        => ['integer', 'distinct', 'exists:maintenance_packages,id'],
        ];
    }
}