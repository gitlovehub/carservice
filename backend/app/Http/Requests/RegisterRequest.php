<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $fullName = $this->input('full_name');
        $phone = $this->input('phone');
        $email = $this->input('email');

        if (is_string($fullName)) {
            $this->merge(['full_name' => trim($fullName)]);
        }

        if (is_string($phone)) {
            $this->merge(['phone' => trim($phone)]);
        }

        if (is_string($email)) {
            $this->merge(['email' => strtolower(trim($email))]);
        }
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:100'],
            'phone' => [
                'required',
                'string',
                'regex:/^(0|\+84)[3|5|7|8|9][0-9]{8}$/',
                'max:20',
            ],
            'email' => ['required', 'email', 'max:150', 'unique:accounts,email'],
            'password' => [
                'required',
                'string',
                'confirmed',
                'max:255',
                Password::min(10)
                    ->mixedCase()
                    ->letters()
                    ->numbers()
                    ->symbols(),
                'regex:/^\S*$/u' // Không có khoảng trắng
            ],
            'device_name' => ['nullable', 'string', 'max:100'],
            'accept_terms' => ['required', 'accepted'],
        ];
    }

    public function messages(): array
    {
        return [
            'full_name.required' => 'Họ và tên không được để trống.',
            'phone.required' => 'Số điện thoại không được để trống.',
            'phone.regex' => 'Số điện thoại không đúng định dạng Việt Nam.',
            'email.required' => 'Email không được để trống.',
            'email.email' => 'Email không đúng định dạng.',
            'email.unique' => 'Email này đã được sử dụng.',
            'password.required' => 'Mật khẩu không được để trống.',
            'password.min' => 'Mật khẩu phải có ít nhất 10 ký tự.',
            'password.mixed' => 'Mật khẩu phải chứa ít nhất 1 chữ hoa và 1 chữ thường.',
            'password.letters' => 'Mật khẩu phải chứa chữ cái.',
            'password.numbers' => 'Mật khẩu phải chứa ít nhất 1 số.',
            'password.symbols' => 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.',
            'password.regex' => 'Mật khẩu không được chứa khoảng trắng.',
            'password.confirmed' => 'Mật khẩu xác nhận không khớp.',
            'accept_terms.required' => 'Bạn phải đồng ý với điều khoản sử dụng.',
            'accept_terms.accepted' => 'Bạn phải đồng ý với điều khoản sử dụng.',
        ];
    }
}
