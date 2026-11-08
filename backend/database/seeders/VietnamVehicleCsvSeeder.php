<?php

namespace Database\Seeders;

use App\Models\VehicleBrand;
use App\Models\VehicleModel;
use App\Models\VehicleTrim;
use App\Support\VehicleName;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Nạp danh mục Hãng → Dòng xe → Phiên bản từ database/data/vietnam_vehicles.csv (cột: brand,model,trim).
 *
 * - CSV chỉ là dữ liệu khởi tạo: không mặc định mọi phiên bản đang được bán.
 * - Chạy lại nhiều lần không tạo trùng (so khớp tên không phân biệt hoa/thường, đã chuẩn hóa khoảng trắng).
 * - Chỉ THÊM bản ghi còn thiếu, không sửa/xóa bản ghi đã có, nên dữ liệu admin tự thêm
 *   hoặc trạng thái admin đã tắt được giữ nguyên.
 * - Hãng/dòng xe đã có sẵn (seeder cũ) được dùng lại, không tạo bản sao.
 */
class VietnamVehicleCsvSeeder extends Seeder
{
    public const SOURCE = 'CSV';

    public const BRAND_MAX = 100;

    public const MODEL_MAX = 100;

    public const TRIM_MAX = 150;

    public static function defaultPath(): string
    {
        return database_path('data/vietnam_vehicles.csv');
    }

    public function run(): void
    {
        $stats = $this->seedFromFile(self::defaultPath());

        $this->command?->info(sprintf(
            'Danh mục xe CSV: %d dòng hợp lệ (%d trùng, %d lỗi bỏ qua) — thêm mới %d hãng, %d dòng xe, %d phiên bản.',
            $stats['rows'],
            $stats['duplicates'],
            $stats['invalid'],
            $stats['created_brands'],
            $stats['created_models'],
            $stats['created_trims'],
        ));
    }

    /**
     * @return array{rows: int, duplicates: int, invalid: int, created_brands: int, created_models: int, created_trims: int}
     */
    public function seedFromFile(string $path): array
    {
        $parsed = self::parse($path);
        $created = ['brands' => 0, 'models' => 0, 'trims' => 0];

        DB::transaction(function () use ($parsed, &$created): void {
            $brands = VehicleBrand::query()->get(['id', 'name'])
                ->keyBy(fn (VehicleBrand $brand) => self::key($brand->name));

            /** @var array<string, int> $models */
            $models = [];
            foreach (VehicleModel::query()->get(['id', 'brand_id', 'name']) as $model) {
                $models[$model->brand_id.'|'.self::key($model->name)] = $model->id;
            }

            /** @var array<string, true> $trims */
            $trims = [];
            foreach (VehicleTrim::query()->get(['model_id', 'name']) as $trim) {
                $trims[$trim->model_id.'|'.self::key($trim->name)] = true;
            }

            foreach ($parsed['rows'] as [$brandName, $modelName, $trimName]) {
                $brandKey = self::key($brandName);
                if (! $brands->has($brandKey)) {
                    $brands->put($brandKey, VehicleBrand::create([
                        'name' => $brandName,
                        'status' => 'ACTIVE',
                        'source' => self::SOURCE,
                    ]));
                    $created['brands']++;
                }
                $brandId = $brands->get($brandKey)->id;

                $modelKey = $brandId.'|'.self::key($modelName);
                if (! isset($models[$modelKey])) {
                    $models[$modelKey] = VehicleModel::create([
                        'brand_id' => $brandId,
                        'name' => $modelName,
                        'status' => 'ACTIVE',
                        'source' => self::SOURCE,
                    ])->id;
                    $created['models']++;
                }
                $modelId = $models[$modelKey];

                $trimKey = $modelId.'|'.self::key($trimName);
                if (! isset($trims[$trimKey])) {
                    VehicleTrim::create([
                        'model_id' => $modelId,
                        'name' => $trimName,
                        'status' => 'ACTIVE',
                        'source' => self::SOURCE,
                    ]);
                    $trims[$trimKey] = true;
                    $created['trims']++;
                }
            }
        });

        return [
            'rows' => count($parsed['rows']),
            'duplicates' => $parsed['duplicates'],
            'invalid' => $parsed['invalid'],
            'created_brands' => $created['brands'],
            'created_models' => $created['models'],
            'created_trims' => $created['trims'],
        ];
    }

    /**
     * Đọc và làm sạch CSV: bỏ BOM, chuẩn hóa khoảng trắng/Unicode, bỏ dòng trùng và dòng lỗi.
     *
     * @return array{rows: list<array{0: string, 1: string, 2: string}>, duplicates: int, invalid: int}
     */
    public static function parse(string $path): array
    {
        if (! is_file($path) || ($handle = fopen($path, 'rb')) === false) {
            throw new RuntimeException("Không đọc được file danh mục xe: {$path}");
        }

        $rows = [];
        $seen = [];
        $duplicates = 0;
        $invalid = 0;
        $header = null;

        try {
            while (($line = fgetcsv($handle, 0, ',', '"', '')) !== false) {
                if ($line === [null]) {
                    continue; // dòng trống
                }

                $cells = array_map(fn ($cell) => self::clean((string) $cell), $line);

                if ($header === null) {
                    $header = array_map('mb_strtolower', $cells);
                    if (array_slice($header, 0, 3) !== ['brand', 'model', 'trim']) {
                        throw new RuntimeException('CSV danh mục xe phải có tiêu đề: brand,model,trim');
                    }

                    continue;
                }

                [$brand, $model, $trim] = array_pad($cells, 3, '');

                if (count($cells) > 3 || ! self::valid($brand, self::BRAND_MAX)
                    || ! self::valid($model, self::MODEL_MAX) || ! self::valid($trim, self::TRIM_MAX)) {
                    $invalid++;

                    continue;
                }

                $key = self::key($brand).'|'.self::key($model).'|'.self::key($trim);
                if (isset($seen[$key])) {
                    $duplicates++;

                    continue;
                }

                $seen[$key] = true;
                $rows[] = [$brand, $model, $trim];
            }
        } finally {
            fclose($handle);
        }

        return ['rows' => $rows, 'duplicates' => $duplicates, 'invalid' => $invalid];
    }

    /**
     * Chuẩn hóa tên hiển thị: UTF-8 dạng NFC, bỏ BOM, gộp khoảng trắng.
     */
    public static function clean(string $value): string
    {
        return VehicleName::clean($value);
    }

    /**
     * Khóa so khớp trùng: không phân biệt hoa/thường.
     */
    public static function key(string $value): string
    {
        return VehicleName::key($value);
    }

    private static function valid(string $value, int $max): bool
    {
        return $value !== '' && mb_check_encoding($value, 'UTF-8') && mb_strlen($value) <= $max;
    }
}
