<?php

namespace App\Http\Controllers\Concerns;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Sắp xếp danh sách theo `?sort=<khoá>&dir=asc|desc` cho các bảng Admin.
 * Chỉ nhận khoá khai báo trong $columns (không cho người dùng gửi tên cột tuỳ ý).
 * Mặc định: mới tạo lên đầu (`created`, giảm dần). Luôn thêm khoá phụ (id) để thứ tự ổn định khi trùng giá trị.
 */
trait AppliesSort
{
    /** Khoá sắp xếp kiểu chữ: mặc định A→Z khi không gửi `dir`. */
    private const TEXT_SORT_KEYS = ['name', 'code', 'sku', 'email', 'phone', 'category', 'unit', 'brand', 'model', 'customer', 'body', 'role', 'type', 'status', 'order'];

    /**
     * @param  array<string, string|Closure(Builder, string): void>  $columns  khoá → tên cột hoặc hàm tự sắp
     * @return array{sort: string, dir: string}
     */
    protected function applySort(Builder $query, Request $request, array $columns, string $default = 'created', string $defaultDir = 'desc', string $tieBreaker = 'id'): array
    {
        $key = $request->query('sort');
        if (! is_string($key) || ! array_key_exists($key, $columns)) {
            $key = $default;
        }
        $dir = strtolower((string) $request->query('dir', ''));
        if (! in_array($dir, ['asc', 'desc'], true)) {
            // Không gửi chiều: cột chữ A→Z, cột số / ngày lớn (mới) nhất trước.
            $dir = $key === $default ? $defaultDir : (in_array($key, self::TEXT_SORT_KEYS, true) ? 'asc' : 'desc');
        }

        $column = $columns[$key];
        if ($column instanceof Closure) {
            $column($query, $dir);
        } else {
            $query->orderBy($column, $dir);
        }
        $query->orderBy($tieBreaker, $dir);

        return ['sort' => $key, 'dir' => $dir];
    }
}
