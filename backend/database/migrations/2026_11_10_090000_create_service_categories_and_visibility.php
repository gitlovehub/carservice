<?php

use App\Models\ServiceCategory;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Danh mục dịch vụ thành bảng riêng (tên + icon + thứ tự) thay cho chuỗi tự do,
 * và cờ "hiển thị cho khách khi đặt lịch" tách khỏi trạng thái áp dụng của dịch vụ.
 * Cột services.category (chuỗi) vẫn giữ, luôn đồng bộ theo tên danh mục cho các màn hình cũ.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('icon', 40)->default('wrench');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('services', function (Blueprint $table): void {
            $table->foreignId('category_id')->nullable()->after('category')->constrained('service_categories')->nullOnDelete();
            $table->boolean('is_visible')->default(true)->after('status');
        });

        // Chuyển chuỗi danh mục cũ sang bảng mới (chuẩn hoá khoảng trắng + Unicode NFC).
        $names = DB::table('services')->whereNotNull('category')->distinct()->pluck('category');
        $order = 0;
        foreach ($names as $raw) {
            $name = $this->normalize((string) $raw);
            if ($name === '') {
                continue;
            }
            $id = DB::table('service_categories')->where('name', $name)->value('id')
                ?? DB::table('service_categories')->insertGetId([
                    'name' => $name, 'icon' => $this->guessIcon($name), 'sort_order' => ++$order,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            DB::table('services')->where('category', $raw)->update(['category' => $name, 'category_id' => $id]);
        }
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('category_id');
            $table->dropColumn('is_visible');
        });
        Schema::dropIfExists('service_categories');
    }

    private function normalize(string $name): string
    {
        return ServiceCategory::normalizeName($name);
    }

    private function guessIcon(string $name): string
    {
        return ServiceCategory::guessIcon($name);
    }
};
