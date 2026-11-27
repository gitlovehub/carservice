<?php

namespace Database\Seeders;

use App\Models\MaintenancePackage;
use App\Models\Part;
use App\Models\Service;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Danh mục dịch vụ và gói bảo dưỡng dùng cho trang đặt lịch.
 * Giá dịch vụ là tiền công; phụ tùng tính riêng theo bảng phụ tùng.
 * Chạy lại được: cập nhật theo tên, gộp bản trùng và ẩn tên cũ không còn dùng.
 */
class ServiceCatalogSeeder extends Seeder
{
    /**
     * @var array<int, array{name: string, category: string, price: int, minutes: int, popular?: bool, description: string}>
     */
    private const SERVICES = [
        ['name' => 'Kiểm tra tổng quát', 'category' => 'Kiểm tra - Chẩn đoán', 'price' => 200000, 'minutes' => 45, 'popular' => true,
            'description' => 'Kiểm tra phanh, lốp, đèn, dầu, nước làm mát và gầm xe.'],
        ['name' => 'Chẩn đoán lỗi bằng máy', 'category' => 'Kiểm tra - Chẩn đoán', 'price' => 300000, 'minutes' => 45,
            'description' => 'Đọc mã lỗi động cơ, hộp số và hệ thống điện.'],
        ['name' => 'Thay dầu động cơ', 'category' => 'Bảo dưỡng', 'price' => 100000, 'minutes' => 30, 'popular' => true,
            'description' => 'Xả dầu cũ, thay dầu mới. Dầu và lọc dầu tính riêng.'],
        ['name' => 'Thay lọc gió động cơ', 'category' => 'Bảo dưỡng', 'price' => 50000, 'minutes' => 15,
            'description' => 'Giúp động cơ hút khí sạch, đỡ hao nhiên liệu.'],
        ['name' => 'Đảo lốp xe', 'category' => 'Lốp - Gầm', 'price' => 100000, 'minutes' => 30,
            'description' => 'Đổi vị trí lốp để lốp mòn đều.'],
        ['name' => 'Cân bằng động & chỉnh độ chụm', 'category' => 'Lốp - Gầm', 'price' => 300000, 'minutes' => 60,
            'description' => 'Hết rung vô lăng, xe chạy thẳng, lốp mòn đều.'],
        ['name' => 'Kiểm tra phanh', 'category' => 'Phanh', 'price' => 150000, 'minutes' => 30,
            'description' => 'Đo độ mòn má phanh, đĩa phanh và kiểm tra dầu phanh.'],
        ['name' => 'Bảo dưỡng phanh 4 bánh', 'category' => 'Phanh', 'price' => 300000, 'minutes' => 60, 'popular' => true,
            'description' => 'Vệ sinh, bôi trơn cơ cấu phanh cả 4 bánh.'],
        ['name' => 'Thay má phanh', 'category' => 'Phanh', 'price' => 150000, 'minutes' => 45,
            'description' => 'Công thay má phanh. Má phanh tính riêng.'],
        ['name' => 'Thay dầu phanh', 'category' => 'Phanh', 'price' => 150000, 'minutes' => 30,
            'description' => 'Xả và thay dầu phanh, nên làm mỗi 2 năm.'],
        ['name' => 'Kiểm tra điều hòa', 'category' => 'Điều hòa', 'price' => 150000, 'minutes' => 30, 'popular' => true,
            'description' => 'Đo nhiệt độ gió, áp suất gas và kiểm tra rò rỉ.'],
        ['name' => 'Nạp gas điều hòa', 'category' => 'Điều hòa', 'price' => 350000, 'minutes' => 45,
            'description' => 'Hút chân không và nạp lại gas đúng định lượng.'],
        ['name' => 'Thay lọc gió điều hòa', 'category' => 'Điều hòa', 'price' => 50000, 'minutes' => 15,
            'description' => 'Giảm bụi và mùi trong khoang xe.'],
        ['name' => 'Vệ sinh dàn lạnh', 'category' => 'Điều hòa', 'price' => 600000, 'minutes' => 90,
            'description' => 'Làm sạch dàn lạnh, khử mùi, điều hòa mát hơn.'],
        ['name' => 'Kiểm tra động cơ', 'category' => 'Động cơ', 'price' => 200000, 'minutes' => 45,
            'description' => 'Kiểm tra tiếng máy, rò rỉ dầu, dây curoa và chân máy.'],
        ['name' => 'Thay bugi', 'category' => 'Động cơ', 'price' => 150000, 'minutes' => 30,
            'description' => 'Thay bộ bugi theo định kỳ. Bugi tính riêng.'],
        ['name' => 'Thay nước làm mát', 'category' => 'Động cơ', 'price' => 150000, 'minutes' => 30,
            'description' => 'Xả và châm nước làm mát mới, chống quá nhiệt.'],
        ['name' => 'Vệ sinh họng hút kim phun', 'category' => 'Động cơ', 'price' => 500000, 'minutes' => 60,
            'description' => 'Làm sạch muội than, xe chạy êm và đỡ hao xăng.'],
        ['name' => 'Kiểm tra ắc quy, máy phát', 'category' => 'Điện - Ắc quy', 'price' => 50000, 'minutes' => 20,
            'description' => 'Đo điện áp ắc quy và dòng sạc. Ắc quy tính riêng.'],
        ['name' => 'Thay gạt mưa', 'category' => 'Chăm sóc xe', 'price' => 30000, 'minutes' => 10,
            'description' => 'Thay cặp lưỡi gạt mưa mới.'],
        ['name' => 'Rửa xe, hút bụi nội thất', 'category' => 'Chăm sóc xe', 'price' => 150000, 'minutes' => 45,
            'description' => 'Rửa ngoài, hút bụi và lau sạch nội thất.'],
    ];

    /**
     * Tên dịch vụ cũ trùng ý với gói bảo dưỡng hoặc quá chung chung.
     *
     * @var array<int, string>
     */
    private const RETIRED_SERVICES = ['Bảo dưỡng định kỳ', 'Chăm sóc xe'];

    /**
     * Gói dùng chung cho mọi dòng xe; 'parts' tham chiếu SKU trong PartInventorySeeder.
     *
     * @var array<int, array{name: string, aliases: array<int, string>, km: int, months: int, description: string, services: array<int, string>, parts: array<string, int>}>
     */
    private const PACKAGES = [
        [
            'name' => 'Bảo dưỡng 5.000 km',
            'aliases' => ['Bảo dưỡng cấp 1 (5.000km)', 'Gói bảo dưỡng định kỳ 5.000 km'],
            'km' => 5000, 'months' => 6,
            'description' => 'Bảo dưỡng nhỏ: thay dầu, lọc dầu và kiểm tra tổng quát.',
            'services' => ['Thay dầu động cơ', 'Kiểm tra tổng quát'],
            'parts' => ['OIL-5W30-4L' => 1, 'FLT-OIL-01' => 1],
        ],
        [
            'name' => 'Bảo dưỡng 10.000 km',
            'aliases' => ['Bảo dưỡng cấp 2 (10.000km)', 'Gói bảo dưỡng định kỳ 10.000 km'],
            'km' => 10000, 'months' => 12,
            'description' => 'Bảo dưỡng trung bình: thêm lọc gió điều hòa, đảo lốp, vệ sinh phanh.',
            'services' => ['Thay dầu động cơ', 'Kiểm tra tổng quát', 'Thay lọc gió điều hòa', 'Đảo lốp xe', 'Bảo dưỡng phanh 4 bánh'],
            'parts' => ['OIL-5W30-4L' => 1, 'FLT-OIL-01' => 1, 'FLT-CAB-01' => 1],
        ],
        [
            'name' => 'Bảo dưỡng 20.000 km',
            'aliases' => ['Bảo dưỡng cấp 3 (20.000km)', 'Gói bảo dưỡng định kỳ 20.000 km'],
            'km' => 20000, 'months' => 24,
            'description' => 'Bảo dưỡng lớn hơn: thêm lọc gió động cơ, cân bằng động.',
            'services' => ['Thay dầu động cơ', 'Kiểm tra tổng quát', 'Thay lọc gió điều hòa', 'Thay lọc gió động cơ', 'Bảo dưỡng phanh 4 bánh', 'Cân bằng động & chỉnh độ chụm'],
            'parts' => ['OIL-5W30-4L' => 1, 'FLT-OIL-01' => 1, 'FLT-CAB-01' => 1, 'FLT-AIR-01' => 1],
        ],
        [
            'name' => 'Bảo dưỡng 40.000 km',
            'aliases' => ['Bảo dưỡng lớn (40.000km)', 'Gói bảo dưỡng định kỳ 40.000 km'],
            'km' => 40000, 'months' => 48,
            'description' => 'Bảo dưỡng toàn diện: thêm dầu phanh, nước làm mát, bugi, vệ sinh kim phun.',
            'services' => ['Thay dầu động cơ', 'Kiểm tra tổng quát', 'Thay lọc gió điều hòa', 'Thay lọc gió động cơ', 'Bảo dưỡng phanh 4 bánh', 'Thay dầu phanh', 'Thay nước làm mát', 'Thay bugi', 'Vệ sinh họng hút kim phun'],
            'parts' => ['OIL-5W30-4L' => 1, 'FLT-OIL-01' => 1, 'FLT-CAB-01' => 1, 'FLT-AIR-01' => 1, 'BRK-FLD-01' => 1, 'CLT-01' => 4, 'SPK-PLG-01' => 4],
        ],
    ];

    public function run(): void
    {
        $servicesByName = [];

        foreach (self::SERVICES as $index => $data) {
            $service = $this->keepOneActive(Service::query()->where('name', $data['name'])->orderBy('id')->get())
                ?? new Service(['name' => $data['name']]);

            $service->fill([
                'category' => $data['category'],
                'description' => $data['description'],
                'base_price' => $data['price'],
                'estimated_minutes' => $data['minutes'],
                'is_popular' => $data['popular'] ?? false,
                'sort_order' => $index + 1,
                'status' => 'ACTIVE',
            ])->save();

            $servicesByName[$data['name']] = $service;
        }

        Service::query()->whereIn('name', self::RETIRED_SERVICES)->update(['status' => 'INACTIVE']);

        $partIdsBySku = Part::query()->pluck('id', 'sku');

        foreach (self::PACKAGES as $data) {
            $names = [$data['name'], ...$data['aliases']];
            $package = $this->keepOneActive(
                MaintenancePackage::query()->whereNull('vehicle_model_id')->whereIn('name', $names)->orderBy('id')->get()
            ) ?? new MaintenancePackage;

            $package->fill([
                'vehicle_model_id' => null,
                'name' => $data['name'],
                'mileage_milestone' => $data['km'],
                'month_milestone' => $data['months'],
                'description' => $data['description'],
                'status' => 'ACTIVE',
            ])->save();

            $package->services()->sync(collect($data['services'])->mapWithKeys(
                fn (string $name) => [$servicesByName[$name]->id => ['quantity' => 1]]
            )->all());

            $package->parts()->sync(collect($data['parts'])
                ->filter(fn (int $quantity, string $sku) => $partIdsBySku->has($sku))
                ->mapWithKeys(fn (int $quantity, string $sku) => [$partIdsBySku[$sku] => ['quantity' => $quantity]])
                ->all());
        }
    }

    /**
     * Giữ bản ghi đầu tiên, ẩn các bản trùng tên để danh mục khách thấy không bị lặp.
     *
     * @param  Collection<int, Model>  $records
     */
    private function keepOneActive(Collection $records): ?Model
    {
        $records->slice(1)->each(fn ($duplicate) => $duplicate->update(['status' => 'INACTIVE']));

        return $records->first();
    }
}
