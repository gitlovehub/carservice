<?php

namespace Tests\Feature;

use App\Models\Vehicle;
use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleTrim;
use Database\Seeders\VietnamVehicleCatalogSeeder;
use Database\Seeders\VietnamVehicleCsvSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class VietnamVehicleCsvSeederTest extends TestCase
{
    use RefreshDatabase;

    /** Đếm độc lập từ file CSV thật (không dùng parser của seeder). */
    private function csvCounts(): array
    {
        $lines = file(VietnamVehicleCsvSeeder::defaultPath(), FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        array_shift($lines);
        $brands = $models = $trims = [];
        foreach ($lines as $line) {
            [$b, $m, $t] = str_getcsv($line, ',', '"', '');
            $brands[mb_strtolower($b)] = true;
            $models[mb_strtolower("$b|$m")] = true;
            $trims[mb_strtolower("$b|$m|$t")] = true;
        }

        return [count($brands), count($models), count($trims)];
    }

    public function test_seeds_every_row_of_the_real_csv_once(): void
    {
        [$brands, $models, $trims] = $this->csvCounts();

        $this->seed(VietnamVehicleCsvSeeder::class);

        $this->assertSame($brands, VehicleBrand::count());
        $this->assertSame($models, VehicleModel::count());
        $this->assertSame($trims, VehicleTrim::count());
        $this->assertSame($trims, VehicleTrim::where('source', 'CSV')->where('status', 'ACTIVE')->count());

        $vios = VehicleModel::where('name', 'Vios')->whereHas('brand', fn ($q) => $q->where('name', 'Toyota'))->firstOrFail();
        $this->assertEqualsCanonicalizing(['1.5E-CVT', '1.5E-MT', '1.5G-CVT'], $vios->trims()->pluck('name')->all());

        // Tên tiếng Việt và ký tự đặc biệt giữ nguyên.
        $this->assertDatabaseHas('vehicle_trims', ['name' => 'Premium 18 chỗ']);
        $this->assertDatabaseHas('vehicle_trims', ['name' => '1.6L Premium (Nội thất Đen)']);
        $this->assertDatabaseHas('vehicle_trims', ['name' => 'Nâng cao + Cửa trượt']);
        $this->assertDatabaseHas('vehicle_brands', ['name' => 'Lynk & Co']);
        $this->assertDatabaseHas('vehicle_trims', ['name' => 'e:HEV RS']);
    }

    public function test_running_twice_creates_no_duplicates(): void
    {
        $this->seed(VietnamVehicleCsvSeeder::class);
        $counts = [VehicleBrand::count(), VehicleModel::count(), VehicleTrim::count()];

        $stats = (new VietnamVehicleCsvSeeder)->seedFromFile(VietnamVehicleCsvSeeder::defaultPath());

        $this->assertSame($counts, [VehicleBrand::count(), VehicleModel::count(), VehicleTrim::count()]);
        $this->assertSame(0, $stats['created_brands'] + $stats['created_models'] + $stats['created_trims']);
    }

    public function test_reuses_existing_catalog_rows_and_keeps_admin_changes(): void
    {
        $this->seed(VietnamVehicleCatalogSeeder::class);
        $legacyVios = VehicleModel::where('name', 'Vios')->firstOrFail();
        $legacyBrands = VehicleBrand::count();

        $this->seed(VietnamVehicleCsvSeeder::class);

        // Hãng/dòng xe cũ được dùng lại, giữ nguyên năm và nguồn.
        $this->assertSame(1, VehicleModel::where('name', 'Vios')->count());
        $this->assertSame($legacyVios->id, VehicleTrim::where('name', '1.5G-CVT')->value('model_id'));
        $this->assertSame(2003, $legacyVios->fresh()->year_from);
        $this->assertNull($legacyVios->fresh()->source);
        $this->assertSame(1, VehicleBrand::where('name', 'Toyota')->count());
        $this->assertGreaterThan($legacyBrands, VehicleBrand::count());

        // Admin tắt một phiên bản CSV, đổi tên hiển thị và tự thêm phiên bản mới.
        $hidden = VehicleTrim::where('name', '1.5E-MT')->firstOrFail();
        $hidden->update(['status' => 'INACTIVE']);
        $manual = VehicleTrim::create(['model_id' => $legacyVios->id, 'name' => '1.5 G (bản cũ)', 'status' => 'ACTIVE']);
        $vehicle = Vehicle::factory()->create(['model_id' => $legacyVios->id, 'trim_id' => $manual->id]);
        $before = VehicleTrim::count();

        $this->seed(VietnamVehicleCsvSeeder::class);

        $this->assertSame($before, VehicleTrim::count());
        $this->assertSame('INACTIVE', $hidden->fresh()->status);
        $this->assertNotNull($manual->fresh());
        $this->assertSame($manual->id, $vehicle->fresh()->trim_id);
    }

    public function test_parser_cleans_duplicates_whitespace_and_invalid_rows(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'csv');
        file_put_contents($path, "\u{FEFF}brand,model,trim\r\n"
            ."Toyota,Vios,1.5G-CVT\r\n"
            ."  toyota , VIOS ,  1.5g-cvt \r\n"   // trùng khác hoa/thường + khoảng trắng
            ."Toyota,Vios,1.5E   MT\r\n"           // gộp khoảng trắng
            ."Toyota,,Thiếu dòng xe\r\n"           // lỗi: thiếu dòng xe
            .'Toyota,Vios,'.str_repeat('x', 151)."\r\n" // lỗi: quá dài
            ."\r\n"
            ."\"Lynk & Co\",\"01\",\"Hyper, Pro\"\r\n");

        try {
            $parsed = VietnamVehicleCsvSeeder::parse($path);
            $this->assertSame([
                ['Toyota', 'Vios', '1.5G-CVT'],
                ['Toyota', 'Vios', '1.5E MT'],
                ['Lynk & Co', '01', 'Hyper, Pro'],
            ], $parsed['rows']);
            $this->assertSame(1, $parsed['duplicates']);
            $this->assertSame(2, $parsed['invalid']);

            $stats = (new VietnamVehicleCsvSeeder)->seedFromFile($path);
            $this->assertSame(2, $stats['created_brands']);
            $this->assertSame(3, $stats['created_trims']);
        } finally {
            @unlink($path);
        }
    }

    public function test_rejects_file_without_expected_header(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'csv');
        file_put_contents($path, "hang,dong,phien_ban\nToyota,Vios,G\n");

        try {
            $this->expectException(RuntimeException::class);
            VietnamVehicleCsvSeeder::parse($path);
        } finally {
            @unlink($path);
        }
    }
}
