<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Danh mục dịch vụ (Bảo dưỡng, Phanh, Điều hoà…) — tên, icon hiển thị và thứ tự trong cột danh mục. */
#[Fillable(['name', 'icon', 'sort_order'])]
class ServiceCategory extends Model
{
    /** Icon hợp lệ (tên trong bộ icon SVG của frontend). */
    public const ICONS = ['droplet', 'engine', 'disc', 'snowflake', 'tire', 'bolt', 'battery', 'search', 'sparkle', 'wrench', 'tools', 'gauge'];

    protected function casts(): array
    {
        return ['sort_order' => 'integer'];
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class, 'category_id');
    }

    /** Tìm hoặc tạo danh mục theo tên (dùng khi API cũ gửi chuỗi category). */
    public static function findOrCreateByName(string $name): self
    {
        $name = self::normalizeName($name);

        return self::query()->firstOrCreate(['name' => $name], [
            'icon' => self::guessIcon($name),
            'sort_order' => (int) self::query()->max('sort_order') + 1,
        ]);
    }

    public static function normalizeName(string $name): string
    {
        $name = trim(preg_replace('/\s+/u', ' ', $name) ?? $name);

        return class_exists(\Normalizer::class) ? (\Normalizer::normalize($name, \Normalizer::FORM_C) ?: $name) : $name;
    }

    public static function guessIcon(string $name): string
    {
        $n = mb_strtolower($name);

        return match (true) {
            str_contains($n, 'lạnh') || str_contains($n, 'điều hoà') || str_contains($n, 'điều hòa') => 'snowflake',
            str_contains($n, 'ắc quy') => 'battery',
            str_contains($n, 'điện') => 'bolt',
            str_contains($n, 'phanh') || str_contains($n, 'gầm') => 'disc',
            str_contains($n, 'lốp') || str_contains($n, 'mâm') => 'tire',
            str_contains($n, 'động cơ') || str_contains($n, 'hộp số') => 'engine',
            str_contains($n, 'bảo dưỡng') => 'droplet',
            str_contains($n, 'kiểm tra') => 'search',
            str_contains($n, 'chăm sóc') || str_contains($n, 'detailing') || str_contains($n, 'rửa') => 'sparkle',
            default => 'wrench',
        };
    }
}
