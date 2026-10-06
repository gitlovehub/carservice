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
            'vehicle_id'           => ['sometimes', 'integer'],
            'appointment_date'     => ['sometimes', 'date', 'after_or_equal:today'],
            'appointment_time'     => ['sometimes', 'date_format:H:i,H:i:s'],
            'request_type'         => ['sometimes', Rule::in(['DIAGNOSIS', 'REPAIR', 'MAINTENANCE', 'REPLACEMENT'])],
            'symptom_description' => ['nullable', 'string', 'max:1000'],
            'note'                 => ['nullable', 'string', 'max:500'],
            'service_ids'          => ['nullable', 'array'],
            'service_ids.*'        => ['integer', 'exists:services,id'],
            'package_ids'          => ['nullable', 'array'],
            'package_ids.*'        => ['integer', 'exists:maintenance_packages,id'],
        ];
    }
}