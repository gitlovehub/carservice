<?php

namespace Database\Seeders;

use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use Illuminate\Database\Seeder;

/**
 * Danh mục hãng xe và dòng xe phổ biến tại thị trường Việt Nam.
 *
 * Mỗi dòng: [tên model, body_type, year_from, year_to].
 * - year_from / year_to là khoảng năm model được bán chính hãng tại VN (ước lượng, nên rà soát định kỳ).
 * - year_to = null nghĩa là model vẫn đang được bán.
 * - Model đã ngừng bán vẫn để ACTIVE vì khách hàng vẫn còn sử dụng và mang xe tới bảo dưỡng.
 *
 * Seeder chạy lại nhiều lần không tạo trùng (khóa theo hãng + tên model).
 */
class VietnamVehicleCatalogSeeder extends Seeder
{
    /**
     * @return array<string, list<array{0: string, 1: string, 2: int|null, 3: int|null}>>
     */
    public static function catalog(): array
    {
        return [
            'Toyota' => [
                ['Wigo', 'HATCHBACK', 2018, null],
                ['Yaris', 'HATCHBACK', 2014, 2023],
                ['Vios', 'SEDAN', 2003, null],
                ['Corolla Altis', 'SEDAN', 2001, null],
                ['Camry', 'SEDAN', 1998, null],
                ['Raize', 'SUV', 2022, null],
                ['Yaris Cross', 'SUV', 2023, null],
                ['Corolla Cross', 'SUV', 2020, null],
                ['Rush', 'SUV', 2018, 2023],
                ['Fortuner', 'SUV', 2009, null],
                ['Land Cruiser Prado', 'SUV', 2010, null],
                ['Land Cruiser', 'SUV', 1995, null],
                ['Avanza', 'MPV', 2018, null],
                ['Veloz Cross', 'MPV', 2022, null],
                ['Innova', 'MPV', 2006, 2023],
                ['Innova Cross', 'MPV', 2023, null],
                ['Alphard', 'MPV', 2016, null],
                ['Hilux', 'PICKUP', 2005, null],
                ['Hiace', 'OTHER', 2000, null],
            ],
            'Honda' => [
                ['Brio', 'HATCHBACK', 2019, 2023],
                ['Jazz', 'HATCHBACK', 2018, 2020],
                ['City', 'SEDAN', 2013, null],
                ['Civic', 'SEDAN', 2006, null],
                ['Accord', 'SEDAN', 2007, null],
                ['HR-V', 'SUV', 2018, null],
                ['CR-V', 'SUV', 2008, null],
                ['BR-V', 'MPV', 2023, null],
            ],
            'Hyundai' => [
                ['Grand i10', 'HATCHBACK', 2014, null],
                ['Accent', 'SEDAN', 2011, null],
                ['Elantra', 'SEDAN', 2016, null],
                ['Venue', 'SUV', 2023, null],
                ['Creta', 'SUV', 2022, null],
                ['Kona', 'SUV', 2018, 2023],
                ['Tucson', 'SUV', 2010, null],
                ['Santa Fe', 'SUV', 2010, null],
                ['Palisade', 'SUV', 2023, null],
                ['Stargazer', 'MPV', 2022, null],
                ['Custin', 'MPV', 2023, null],
            ],
            'Kia' => [
                ['Morning', 'HATCHBACK', 2008, null],
                ['Soluto', 'SEDAN', 2019, null],
                ['K3', 'SEDAN', 2013, null],
                ['K5', 'SEDAN', 2021, null],
                ['Sonet', 'SUV', 2021, null],
                ['Seltos', 'SUV', 2020, null],
                ['Sportage', 'SUV', 2022, null],
                ['Sorento', 'SUV', 2010, null],
                ['Carens', 'MPV', 2022, null],
                ['Sedona', 'MPV', 2015, 2020],
                ['Carnival', 'MPV', 2021, null],
            ],
            'Mazda' => [
                ['Mazda 2', 'SEDAN', 2015, null],
                ['Mazda 3', 'SEDAN', 2009, null],
                ['Mazda 6', 'SEDAN', 2014, null],
                ['CX-3', 'SUV', 2021, null],
                ['CX-30', 'SUV', 2021, null],
                ['CX-5', 'SUV', 2012, null],
                ['CX-8', 'SUV', 2019, null],
                ['BT-50', 'PICKUP', 2012, null],
            ],
            'Mitsubishi' => [
                ['Mirage', 'HATCHBACK', 2013, 2019],
                ['Attrage', 'SEDAN', 2014, null],
                ['Xforce', 'SUV', 2024, null],
                ['Outlander', 'SUV', 2016, null],
                ['Pajero Sport', 'SUV', 2010, null],
                ['Xpander', 'MPV', 2018, null],
                ['Xpander Cross', 'MPV', 2020, null],
                ['Triton', 'PICKUP', 2009, null],
            ],
            'Ford' => [
                ['Fiesta', 'HATCHBACK', 2010, 2018],
                ['Focus', 'SEDAN', 2006, 2019],
                ['EcoSport', 'SUV', 2014, 2022],
                ['Territory', 'SUV', 2022, null],
                ['Everest', 'SUV', 2005, null],
                ['Ranger', 'PICKUP', 2001, null],
                ['Transit', 'OTHER', 2006, null],
            ],
            'VinFast' => [
                ['Fadil', 'HATCHBACK', 2019, 2022],
                ['Lux A2.0', 'SEDAN', 2019, 2022],
                ['Lux SA2.0', 'SUV', 2019, 2022],
                ['VF 3', 'OTHER', 2024, null],
                ['VF 5', 'SUV', 2023, null],
                ['VF e34', 'SUV', 2021, 2023],
                ['VF 6', 'SUV', 2024, null],
                ['VF 7', 'SUV', 2024, null],
                ['VF 8', 'SUV', 2022, null],
                ['VF 9', 'SUV', 2023, null],
            ],
            'Suzuki' => [
                ['Swift', 'HATCHBACK', 2013, null],
                ['Ciaz', 'SEDAN', 2016, null],
                ['Jimny', 'SUV', 2024, null],
                ['Ertiga', 'MPV', 2014, null],
                ['XL7', 'MPV', 2020, null],
                ['Carry Pro', 'PICKUP', 2016, null],
            ],
            'Nissan' => [
                ['Sunny', 'SEDAN', 2013, 2020],
                ['Almera', 'SEDAN', 2021, null],
                ['Kicks', 'SUV', 2022, null],
                ['X-Trail', 'SUV', 2014, null],
                ['Terra', 'SUV', 2019, null],
                ['Navara', 'PICKUP', 2015, null],
            ],
            'Isuzu' => [
                ['mu-X', 'SUV', 2016, null],
                ['D-Max', 'PICKUP', 2007, null],
            ],
            'MG' => [
                ['MG5', 'SEDAN', 2021, null],
                ['MG4', 'HATCHBACK', 2024, null],
                ['ZS', 'SUV', 2020, null],
                ['HS', 'SUV', 2020, null],
            ],
            'Peugeot' => [
                ['408', 'SEDAN', 2023, null],
                ['2008', 'SUV', 2021, null],
                ['3008', 'SUV', 2017, null],
                ['5008', 'SUV', 2017, null],
            ],
            'Volkswagen' => [
                ['Virtus', 'SEDAN', 2023, null],
                ['Tiguan', 'SUV', 2017, null],
                ['Teramont', 'SUV', 2022, null],
            ],
            'Subaru' => [
                ['Forester', 'SUV', 2016, null],
                ['Outback', 'SUV', 2016, null],
            ],
            'BYD' => [
                ['Dolphin', 'HATCHBACK', 2024, null],
                ['Seal', 'SEDAN', 2024, null],
                ['Atto 3', 'SUV', 2024, null],
                ['M6', 'MPV', 2024, null],
            ],
            'Wuling' => [
                ['Hongguang Mini EV', 'HATCHBACK', 2023, null],
            ],
            'Lynk & Co' => [
                ['01', 'SUV', 2023, null],
                ['05', 'SUV', 2023, null],
                ['06', 'SUV', 2023, null],
            ],
            'Mercedes-Benz' => [
                ['C-Class', 'SEDAN', 2001, null],
                ['E-Class', 'SEDAN', 2001, null],
                ['S-Class', 'SEDAN', 2001, null],
                ['GLC', 'SUV', 2016, null],
                ['GLE', 'SUV', 2016, null],
                ['GLS', 'SUV', 2016, null],
            ],
            'BMW' => [
                ['3 Series', 'SEDAN', 2005, null],
                ['5 Series', 'SEDAN', 2005, null],
                ['7 Series', 'SEDAN', 2005, null],
                ['X3', 'SUV', 2010, null],
                ['X5', 'SUV', 2010, null],
            ],
            'Audi' => [
                ['A4', 'SEDAN', 2008, null],
                ['A6', 'SEDAN', 2008, null],
                ['Q5', 'SUV', 2010, null],
                ['Q7', 'SUV', 2008, null],
            ],
            'Lexus' => [
                ['ES', 'SEDAN', 2008, null],
                ['NX', 'SUV', 2015, null],
                ['RX', 'SUV', 2008, null],
                ['LX', 'SUV', 2008, null],
            ],
            // Các hãng đã ngừng phân phối chính hãng nhưng xe vẫn còn lưu hành nhiều.
            'Chevrolet' => [
                ['Spark', 'HATCHBACK', 2009, 2019],
                ['Aveo', 'SEDAN', 2011, 2019],
                ['Cruze', 'SEDAN', 2009, 2019],
                ['Captiva', 'SUV', 2007, 2019],
                ['Trailblazer', 'SUV', 2018, 2019],
                ['Colorado', 'PICKUP', 2012, 2019],
            ],
            'Daewoo' => [
                ['Matiz', 'HATCHBACK', 1998, 2011],
                ['Lacetti', 'SEDAN', 2004, 2011],
                ['Gentra', 'SEDAN', 2006, 2011],
            ],
        ];
    }

    public function run(): void
    {
        foreach (self::catalog() as $brandName => $models) {
            $brand = VehicleBrand::firstOrCreate(['name' => $brandName], ['status' => 'ACTIVE']);

            foreach ($models as [$modelName, $bodyType, $yearFrom, $yearTo]) {
                VehicleModel::updateOrCreate([
                    'brand_id' => $brand->id,
                    'name' => $modelName,
                ], [
                    'body_type' => $bodyType,
                    'year_from' => $yearFrom,
                    'year_to' => $yearTo,
                    'status' => 'ACTIVE',
                ]);
            }
        }
    }
}