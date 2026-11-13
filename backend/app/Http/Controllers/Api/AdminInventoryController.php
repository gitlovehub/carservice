<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AppliesSort;
use App\Http\Controllers\Controller;
use App\Models\Inventory;
use App\Models\InventoryTransaction;
use App\Models\Part;
use App\Support\VehicleName;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Admin quản lý phụ tùng & kho: danh mục phụ tùng (giá, dòng xe tương thích), tồn kho, nhập / xuất tay
 * và lịch sử nhập xuất (gồm cả xuất theo phiếu sửa chữa).
 */
class AdminInventoryController extends Controller
{
    use AppliesSort;

    /** GET /api/admin/parts?search=&category=&status=all|ACTIVE|INACTIVE|low|out&page= */
    public function parts(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['all', 'ACTIVE', 'INACTIVE', 'low', 'out'])],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);
        $status = $filters['status'] ?? 'all';

        $page = $this->partQuery()
            ->when($filters['category'] ?? null, fn (Builder $q, string $c) => $q->where('category', $c))
            ->when(in_array($status, ['ACTIVE', 'INACTIVE'], true), fn (Builder $q) => $q->where('status', $status))
            ->when($status === 'low', fn (Builder $q) => $q->whereHas('inventory', fn (Builder $i) => $i->where('quantity', '>', 0)->whereColumn('quantity', '<', 'min_quantity')))
            ->when($status === 'out', fn (Builder $q) => $q->where(fn (Builder $q) => $q->doesntHave('inventory')->orWhereHas('inventory', fn (Builder $i) => $i->where('quantity', '<=', 0))))
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q->where('name', 'like', $like)->orWhere('sku', 'like', $like)))
            ->tap(fn (Builder $q) => $this->applySort($q, $request, [
                'created' => 'parts.created_at', 'sku' => 'sku', 'name' => 'name', 'category' => 'category', 'unit' => 'unit',
                'cost' => 'cost_price', 'price' => 'sell_price', 'status' => 'status',
                'margin' => fn (Builder $q, string $dir) => $q->orderByRaw('(sell_price - cost_price) '.$dir),
                'stock' => fn (Builder $q, string $dir) => $q->orderBy(Inventory::query()->select('quantity')->whereColumn('inventories.part_id', 'parts.id')->limit(1), $dir),
                // Giá trị tồn = max(tồn, 0) × giá vốn (CASE chạy được cả MySQL lẫn SQLite).
                'value' => fn (Builder $q, string $dir) => $q->orderBy(Inventory::query()
                    ->selectRaw('CASE WHEN inventories.quantity > 0 THEN inventories.quantity ELSE 0 END * parts.cost_price')
                    ->whereColumn('inventories.part_id', 'parts.id')->limit(1), $dir),
                'updated' => 'parts.updated_at',
            ], tieBreaker: 'parts.id'))
            ->paginate($filters['per_page'] ?? 10);

        $stock = Inventory::query()->join('parts', 'parts.id', '=', 'inventories.part_id')
            ->get(['inventories.quantity', 'inventories.min_quantity', 'parts.cost_price']);

        return response()->json([
            'data' => $page->getCollection()->map(fn (Part $p) => $this->partRow($p))->values(),
            'meta' => $this->meta($page),
            'summary' => [
                'total' => Part::query()->count(),
                'active' => Part::query()->where('status', 'ACTIVE')->count(),
                'low' => $stock->filter(fn ($s) => $s->quantity > 0 && $s->quantity < $s->min_quantity)->count(),
                'out' => Part::query()->where(fn (Builder $q) => $q->doesntHave('inventory')->orWhereHas('inventory', fn (Builder $i) => $i->where('quantity', '<=', 0)))->count(),
                'stock_value' => round((float) $stock->sum(fn ($s) => max(0, $s->quantity) * (float) $s->cost_price), 2),
            ],
            'categories' => Part::query()->whereNotNull('category')->distinct()->orderBy('category')->pluck('category'),
            'units' => Part::query()->distinct()->orderBy('unit')->pluck('unit'),
        ]);
    }

    /** POST /api/admin/parts */
    public function storePart(Request $request): JsonResponse
    {
        $data = $this->validatePart($request);
        $part = DB::transaction(function () use ($data) {
            $part = Part::query()->create($this->partFields($data));
            Inventory::query()->create(['part_id' => $part->id, 'quantity' => 0, 'min_quantity' => $data['min_quantity'] ?? 0]);
            $part->compatibleModels()->sync($data['compat_model_ids'] ?? []);

            return $part;
        });

        return response()->json(['message' => 'Đã thêm phụ tùng.', 'data' => $this->partRow($this->partQuery()->findOrFail($part->id))], 201);
    }

    /** PATCH /api/admin/parts/{part} */
    public function updatePart(Request $request, Part $part): JsonResponse
    {
        $data = $this->validatePart($request, $part);
        DB::transaction(function () use ($part, $data): void {
            $part->update($this->partFields($data));
            Inventory::query()->updateOrCreate(['part_id' => $part->id], ['min_quantity' => $data['min_quantity'] ?? 0]);
            if (array_key_exists('compat_model_ids', $data)) {
                $part->compatibleModels()->sync($data['compat_model_ids'] ?? []);
            }
        });

        return response()->json(['message' => 'Đã cập nhật phụ tùng.', 'data' => $this->partRow($this->partQuery()->findOrFail($part->id))]);
    }

    /**
     * Admin upload image for a part. The file is validated by Laravel (MIME, size),
     * receives a server-generated name, and is stored on the public disk.
     */
    public function uploadImage(Request $request, Part $part): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ], [
            'image.mimes' => 'Chỉ nhận ảnh JPG, PNG hoặc WebP.',
            'image.max' => 'Ảnh không được vượt quá 4 MB.',
        ]);
        $previous = $part->image_path;
        $path = $request->file('image')->store('part-images', 'public');
        try {
            $part->update(['image_path' => $path]);
        } catch (\Throwable $error) {
            Storage::disk('public')->delete($path);
            throw $error;
        }
        if ($previous && str_starts_with($previous, 'part-images/')) {
            Storage::disk('public')->delete($previous);
        }

        return response()->json(['message' => 'Đã lưu ảnh phụ tùng.', 'data' => $this->partRow($this->partQuery()->findOrFail($part->id))]);
    }

    /** Admin can remove an image without deleting the part. */
    public function deleteImage(Part $part): JsonResponse
    {
        $old = $part->image_path;
        $part->update(['image_path' => null]);
        if ($old && str_starts_with($old, 'part-images/')) {
            Storage::disk('public')->delete($old);
        }
        return response()->json(['message' => 'Đã xóa ảnh phụ tùng.', 'data' => $this->partRow($this->partQuery()->findOrFail($part->id))]);
    }

    /** Public catalog image: controller streaming works without storage:link. */
    public function showImage(Part $part): StreamedResponse
    {
        abort_unless($part->image_path && str_starts_with($part->image_path, 'part-images/'), 404);
        $disk = Storage::disk('public');
        abort_unless($disk->exists($part->image_path), 404);
        return $disk->response($part->image_path, null, [
            'Content-Type' => $disk->mimeType($part->image_path) ?: 'image/jpeg',
            'Cache-Control' => 'public, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** POST /api/admin/parts/{part}/stock {type: IN|OUT, quantity, note} — nhập / xuất tay. */
    public function adjustStock(Request $request, Part $part): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in([InventoryTransaction::TYPE_IN, InventoryTransaction::TYPE_OUT])],
            'quantity' => ['required', 'integer', 'min:1', 'max:100000'],
            'note' => ['nullable', 'string', 'max:255'],
        ], ['quantity.min' => 'Số lượng phải lớn hơn 0.']);

        DB::transaction(function () use ($part, $data, $request): void {
            $inventory = Inventory::query()->lockForUpdate()->firstOrCreate(['part_id' => $part->id], ['quantity' => 0, 'min_quantity' => 0]);
            if ($data['type'] === InventoryTransaction::TYPE_OUT && $inventory->quantity < $data['quantity']) {
                throw ValidationException::withMessages(['quantity' => "Tồn kho chỉ còn {$inventory->quantity} {$part->unit}."]);
            }
            InventoryTransaction::query()->create([
                'inventory_id' => $inventory->id,
                'transaction_type' => $data['type'],
                'quantity' => $data['quantity'],
                'note' => $data['note'] ?? null,
                'created_by_account_id' => $request->user()?->id,
            ]);
            $inventory->quantity += $data['type'] === InventoryTransaction::TYPE_IN ? $data['quantity'] : -$data['quantity'];
            $inventory->save();
        });

        return response()->json([
            'message' => $data['type'] === InventoryTransaction::TYPE_IN ? 'Đã nhập kho.' : 'Đã xuất kho.',
            'data' => $this->partRow($this->partQuery()->findOrFail($part->id)),
        ]);
    }

    /** GET /api/admin/stock-moves?search=&type=IN|OUT&page= */
    public function moves(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', Rule::in([InventoryTransaction::TYPE_IN, InventoryTransaction::TYPE_OUT])],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $page = InventoryTransaction::query()
            ->with(['inventory.part:id,sku,name,unit', 'repairOrder:id,repair_order_code,advisor_id', 'repairOrder.advisor:id,full_name',
                'createdBy:id,email', 'createdBy.employee:id,account_id,full_name'])
            ->when($filters['type'] ?? null, fn (Builder $q, string $t) => $q->where('transaction_type', $t))
            ->when($this->term($filters), fn (Builder $q, string $like) => $q->where(fn (Builder $q) => $q
                ->where('note', 'like', $like)
                ->orWhereHas('inventory.part', fn (Builder $p) => $p->where('name', 'like', $like)->orWhere('sku', 'like', $like))
                ->orWhereHas('repairOrder', fn (Builder $r) => $r->where('repair_order_code', 'like', $like))))
            ->tap(fn (Builder $q) => $this->applySort($q, $request, ['created' => 'created_at', 'qty' => 'quantity', 'type' => 'transaction_type']))
            ->paginate($filters['per_page'] ?? 15);

        return response()->json([
            'data' => $page->getCollection()->map(fn (InventoryTransaction $t) => [
                'id' => $t->id,
                'at' => $t->created_at?->toIso8601String(),
                'type' => $t->transaction_type,
                'sku' => $t->inventory?->part?->sku,
                'name' => $t->inventory?->part?->name,
                'unit' => $t->inventory?->part?->unit,
                'quantity' => (int) $t->quantity,
                'ref' => $t->repairOrder?->repair_order_code ?? ($t->transaction_type === InventoryTransaction::TYPE_IN ? 'Phiếu nhập #'.$t->id : 'Phiếu xuất #'.$t->id),
                'note' => $t->note,
                'by' => $t->createdBy?->employee?->full_name ?? $t->createdBy?->email ?? $t->repairOrder?->advisor?->full_name ?? 'Kho',
            ])->values(),
            'meta' => $this->meta($page),
        ]);
    }

    /* ------------------------------------------------------------- Helpers */

    private function partQuery(): Builder
    {
        return Part::query()->with(['inventory', 'compatibleModels:id,brand_id,name', 'compatibleModels.brand:id,name']);
    }

    /** @return array<string, mixed> */
    private function validatePart(Request $request, ?Part $part = null): array
    {
        $data = $request->validate([
            'sku' => ['required', 'string', 'max:50', 'regex:/^[A-Za-z0-9._\-]+$/', Rule::unique('parts', 'sku')->ignore($part?->id)],
            'name' => ['required', 'string', 'max:150'],
            'category' => ['nullable', 'string', 'max:100'],
            'unit' => ['required', 'string', 'max:30'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'sell_price' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:2000'],
            'status' => ['sometimes', Rule::in(['ACTIVE', 'INACTIVE'])],
            'min_quantity' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'compat_model_ids' => ['sometimes', 'array', 'max:50'],
            'compat_model_ids.*' => ['integer', 'distinct', 'exists:vehicle_models,id'],
        ], [
            'sku.unique' => 'Mã SKU đã tồn tại.',
            'sku.regex' => 'SKU chỉ gồm chữ, số, dấu chấm, gạch ngang, gạch dưới.',
        ]);

        if ((float) $data['sell_price'] < (float) $data['cost_price']) {
            throw ValidationException::withMessages(['sell_price' => 'Giá bán không được thấp hơn giá vốn.']);
        }
        $data['sku'] = strtoupper(trim($data['sku']));

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function partFields(array $data): array
    {
        return array_intersect_key($data, array_flip(['sku', 'name', 'category', 'unit', 'cost_price', 'sell_price', 'description', 'status']));
    }

    /** @return array<string, mixed> */
    private function partRow(Part $p): array
    {
        $stock = (int) ($p->inventory?->quantity ?? 0);
        $min = (int) ($p->inventory?->min_quantity ?? 0);

        return [
            'id' => $p->id,
            'sku' => $p->sku,
            'name' => $p->name,
            'description' => $p->description,
            'image_url' => $p->image_path ? '/api/part-images/'.$p->id.'?v='.($p->updated_at?->timestamp ?? 0) : null,
            'category' => $p->category,
            'unit' => $p->unit,
            'cost' => (float) $p->cost_price,
            'price' => (float) $p->sell_price,
            'stock' => $stock,
            'min' => $min,
            'level' => $stock <= 0 ? 'out' : ($stock < $min ? 'low' : 'ok'),
            'status' => $p->status,
            'updated_at' => ($p->inventory?->updated_at ?? $p->updated_at)?->toIso8601String(),
            'compat' => $p->compatibleModels->map(fn ($m) => ['id' => $m->id, 'name' => trim(($m->brand?->name ?? '').' '.$m->name)])->values(),
        ];
    }

    /** @param array<string, mixed> $filters */
    private function term(array $filters): ?string
    {
        $search = VehicleName::clean((string) ($filters['search'] ?? ''));

        return $search === '' ? null : VehicleName::like($search);
    }

    /** @return array{current_page: int, last_page: int, per_page: int, total: int} */
    private function meta(LengthAwarePaginator $page): array
    {
        return ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()];
    }
}
