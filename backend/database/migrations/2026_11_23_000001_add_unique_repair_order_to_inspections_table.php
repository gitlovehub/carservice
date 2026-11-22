<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const UNIQUE_INDEX = 'uq_inspections_repair_order_id';

    public function up(): void
    {
        $duplicates = DB::table('inspections')
            ->select('repair_order_id')
            ->selectRaw('COUNT(*) AS inspection_count')
            ->groupBy('repair_order_id')
            ->havingRaw('COUNT(*) > 1')
            ->limit(20)
            ->get();

        if ($duplicates->isNotEmpty()) {
            $details = $duplicates
                ->map(fn (object $duplicate): string => "{$duplicate->repair_order_id} ({$duplicate->inspection_count})")
                ->implode(', ');

            throw new RuntimeException(
                'Cannot add the unique inspections.repair_order_id index. '
                ."Duplicate repair orders must be reviewed and resolved without deleting records: {$details}."
            );
        }

        Schema::table('inspections', function (Blueprint $table): void {
            $table->unique('repair_order_id', self::UNIQUE_INDEX);
        });
    }

    public function down(): void
    {
        Schema::table('inspections', function (Blueprint $table): void {
            $table->dropUnique(self::UNIQUE_INDEX);
        });
    }
};
