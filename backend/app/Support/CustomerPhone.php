<?php

namespace App\Support;

use App\Models\Customer;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

/**
 * PO 26/11/2026: mỗi số điện thoại chỉ thuộc một hồ sơ khách (không tính hồ sơ đã xoá).
 * Dùng chung cho đăng ký, hồ sơ cá nhân, cố vấn tạo / sửa khách và tiếp nhận khách vãng lai.
 */
final class CustomerPhone
{
    public const TAKEN_MESSAGE = 'Số điện thoại này đã thuộc một hồ sơ khách khác. Vui lòng dùng số khác hoặc liên hệ gara.';

    public static function unique(?int $ignoreCustomerId = null): Unique
    {
        return Rule::unique('customers', 'phone')->whereNull('deleted_at')->ignore($ignoreCustomerId);
    }

    /**
     * Quy tắc khi SỬA hồ sơ: chỉ kiểm tra trùng khi số thật sự đổi, để hồ sơ cũ đang trùng số
     * (dữ liệu trước quy tắc này) vẫn lưu được các thông tin khác.
     *
     * @return list<Unique>
     */
    public static function uniqueWhenChanged(Customer $customer, mixed $newPhone): array
    {
        return is_string($newPhone) && trim($newPhone) !== (string) $customer->phone
            ? [self::unique($customer->id)]
            : [];
    }
}
