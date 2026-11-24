<?php

namespace Database\Factories\Support;

use Illuminate\Support\Str;

/**
 * Dữ liệu mẫu kiểu Việt Nam cho factory/seeder: họ tên, số điện thoại, biển số, địa chỉ.
 * Dùng fake() của Laravel để vẫn theo seed ngẫu nhiên của test.
 */
final class VietnameseData
{
    private const FAMILY = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];

    private const MIDDLE_MALE = ['Văn', 'Minh', 'Đức', 'Quốc', 'Thành', 'Hoàng', 'Anh', 'Hữu', 'Gia', 'Tuấn'];

    private const MIDDLE_FEMALE = ['Thị', 'Thu', 'Ngọc', 'Thanh', 'Minh', 'Phương', 'Kim', 'Bảo', 'Hồng', 'Diệu'];

    private const GIVEN_MALE = ['Hùng', 'Dũng', 'Nam', 'Quân', 'Huy', 'Khoa', 'Long', 'Phúc', 'Tùng', 'Sơn', 'Hải', 'Bình', 'Trung', 'Đạt', 'Khánh', 'Thắng'];

    private const GIVEN_FEMALE = ['Hà', 'Lan', 'Linh', 'Trang', 'Hương', 'Mai', 'Thảo', 'Ngân', 'Vy', 'Yến', 'Hạnh', 'Nhung', 'Quỳnh', 'Hoa'];

    private const STREETS = ['Cầu Giấy', 'Xuân Thủy', 'Trần Duy Hưng', 'Nguyễn Trãi', 'Láng Hạ', 'Kim Mã', 'Phạm Hùng', 'Lê Văn Lương', 'Hoàng Quốc Việt', 'Giải Phóng', 'Tây Sơn', 'Nguyễn Chí Thanh'];

    private const DISTRICTS = ['Cầu Giấy', 'Đống Đa', 'Ba Đình', 'Thanh Xuân', 'Nam Từ Liêm', 'Hai Bà Trưng', 'Hoàng Mai', 'Tây Hồ'];

    private const PHONE_PREFIX = ['090', '091', '093', '094', '096', '097', '098', '086', '088', '070', '077', '083', '085'];

    /** Biển số tỉnh phổ biến (Hà Nội trước để dữ liệu gần thực tế của gara). */
    private const PROVINCES = ['30', '30', '30', '29', '29', '88', '99', '98', '17', '36', '51', '43'];

    public static function fullName(?bool $male = null): string
    {
        $male ??= fake()->boolean();

        return implode(' ', [
            fake()->randomElement(self::FAMILY),
            fake()->randomElement($male ? self::MIDDLE_MALE : self::MIDDLE_FEMALE),
            fake()->randomElement($male ? self::GIVEN_MALE : self::GIVEN_FEMALE),
        ]);
    }

    public static function phone(): string
    {
        return fake()->randomElement(self::PHONE_PREFIX).fake()->numerify('#######');
    }

    /** Biển số ô tô dạng 30A-123.45, không trùng trong một lần chạy. */
    public static function plate(): string
    {
        return fake()->unique()->regexify('('.implode('|', array_unique(self::PROVINCES)).')[ABCDEFGHK]-[1-9][0-9]{2}\.[0-9]{2}');
    }

    public static function address(): string
    {
        return sprintf('Số %d %s, %s, Hà Nội', fake()->numberBetween(1, 299), fake()->randomElement(self::STREETS), fake()->randomElement(self::DISTRICTS));
    }

    /** Email không dấu từ họ tên, ví dụ "tran.minh.quan27@gmail.com". */
    public static function email(string $fullName, string $domain = 'gmail.com'): string
    {
        $slug = Str::of(Str::ascii($fullName))->lower()->replaceMatches('/[^a-z ]/', '')->squish()->replace(' ', '.');

        return fake()->unique()->numerify($slug.'##').'@'.$domain;
    }
}
