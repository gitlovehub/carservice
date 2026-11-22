<?php

namespace App\Services;

use App\Models\MediaAttachment;
use App\Models\VehicleHandover;
use Illuminate\Support\Facades\URL;

/**
 * Trang xem biên bản từ email (không cần đăng nhập, chỉ đọc): link có chữ ký, hết hạn sau 3 ngày,
 * gắn với đúng nội dung đã khóa. Trang chỉ dùng snapshot nên luôn khớp nội dung khách được yêu cầu xác nhận,
 * và không hiện số điện thoại hay 4 số cuối giấy tờ phòng khi email bị chuyển tiếp.
 */
class HandoverEmailViewService
{
    public const TTL_DAYS = 3;

    public const PHOTO_TTL_MINUTES = 60;

    public const CONDITION_TEXT = ['OK' => 'Bình thường', 'SCRATCH' => 'Xước', 'DENT' => 'Móp', 'BROKEN' => 'Vỡ / hỏng', 'MISSING' => 'Thiếu', 'PRESENT' => 'Có'];

    public const FUEL_TEXT = ['EMPTY' => 'Cạn', 'QUARTER' => '1/4', 'HALF' => '1/2', 'THREE_QUARTER' => '3/4', 'FULL' => 'Đầy'];

    private const RELATION_TEXT = ['OWNER' => 'Chủ xe', 'AUTHORIZED' => 'Người được ủy quyền', 'OTHER' => 'Người khác'];

    private const POSITION_TEXT = ['FRONT' => 'Đầu xe', 'REAR' => 'Đuôi xe', 'LEFT' => 'Bên trái', 'RIGHT' => 'Bên phải', 'INTERIOR' => 'Nội thất', 'ODOMETER' => 'Đồng hồ km', 'OTHER' => 'Khác'];

    private const GROUPS = ['EXTERIOR' => 'Ngoại thất', 'INTERIOR' => 'Nội thất', 'KEY' => 'Chìa khóa', 'DOCUMENT' => 'Giấy tờ', 'ACCESSORY' => 'Vật dụng'];

    public function url(VehicleHandover $handover): string
    {
        // Ký đường dẫn tương đối rồi gắn APP_URL (như link duyệt báo giá): không phụ thuộc host lúc gửi / lúc mở.
        $path = URL::temporarySignedRoute('handovers.email-view', now()->addDays(self::TTL_DAYS), [
            'handover' => $handover->id,
            'rev' => $this->revision($handover),
        ], false);

        return rtrim((string) config('app.url'), '/').$path;
    }

    public function matchesRevision(VehicleHandover $handover, string $revision): bool
    {
        return $handover->snapshot_sha256 !== null && hash_equals($this->revision($handover), $revision);
    }

    /** Ảnh thuộc đúng nội dung đã khóa của biên bản; ảnh khác trả về null. */
    public function photo(VehicleHandover $handover, int $mediaId): ?MediaAttachment
    {
        $allowed = collect($handover->snapshot['photos'] ?? [])->pluck('id')->map(fn ($id) => (int) $id);
        if (! $allowed->contains($mediaId)) {
            return null;
        }

        return MediaAttachment::query()
            ->where('attachable_type', VehicleHandover::class)->where('attachable_id', $handover->id)
            ->find($mediaId);
    }

    /** @return array<string, mixed> */
    public function viewData(VehicleHandover $handover): array
    {
        $handover->loadMissing('vehicle.model.brand', 'comparedHandover');
        $snapshot = $handover->snapshot ?? [];
        $isCheckOut = $handover->type === VehicleHandover::TYPE_CHECK_OUT;
        $before = $isCheckOut ? $handover->comparedHandover?->snapshot : null;
        $vehicle = $handover->vehicle;
        $changes = [];

        $groups = [];
        foreach (self::GROUPS as $category => $title) {
            $rows = $this->rows($snapshot['items'] ?? [], $before['items'] ?? [], $category, $before !== null, $changes);
            if ($rows) {
                $groups[] = ['title' => $title, 'withQuantity' => ! in_array($category, ['EXTERIOR', 'INTERIOR'], true), 'rows' => $rows];
            }
        }

        $mileage = $snapshot['mileage'] ?? null;
        $beforeMileage = $before['mileage'] ?? null;
        $mileageDiff = $mileage !== null && $beforeMileage !== null ? (int) $mileage - (int) $beforeMileage : null;
        if ($mileageDiff) {
            array_unshift($changes, 'Số km '.($mileageDiff > 0 ? '+' : '').$this->number($mileageDiff).' km');
        }
        $fuel = $snapshot['fuel_level'] ?? null;
        $beforeFuel = $before['fuel_level'] ?? null;
        if ($before !== null && $fuel !== null && $fuel !== $beforeFuel) {
            array_splice($changes, $mileageDiff ? 1 : 0, 0, 'Nhiên liệu '.(self::FUEL_TEXT[$beforeFuel] ?? 'không ghi').' → '.(self::FUEL_TEXT[$fuel] ?? $fuel));
        }

        return [
            'title' => $isCheckOut ? 'trả xe' : 'nhận xe',
            'compare' => $before !== null,
            'orderCode' => $snapshot['repair_order_code'] ?? '',
            'vehicleText' => $this->vehicleText($handover),
            'carName' => trim(($vehicle?->model?->brand?->name ?? '').' '.($vehicle?->model?->name ?? '')),
            'submittedAt' => $handover->submitted_at?->format('H:i d/m/Y'),
            'confirmed' => $handover->status === VehicleHandover::STATUS_CONFIRMED,
            'personLabel' => $isCheckOut ? 'Người nhận xe' : 'Người giao xe',
            'personName' => $snapshot['person']['name'] ?? '',
            'personRelation' => self::RELATION_TEXT[$snapshot['person']['relation'] ?? ''] ?? '',
            'info' => [
                [
                    'label' => 'Số km (ODO)', 'before' => $this->km($beforeMileage), 'after' => $this->km($mileage),
                    'status' => $before === null || $mileageDiff === null ? null : ($mileageDiff === 0 ? 'Nguyên trạng' : ($mileageDiff > 0 ? '+' : '').$this->number($mileageDiff).' km'),
                    'changed' => (bool) $mileageDiff,
                ],
                [
                    'label' => 'Nhiên liệu', 'before' => self::FUEL_TEXT[$beforeFuel] ?? 'Không ghi', 'after' => self::FUEL_TEXT[$fuel] ?? 'Không ghi',
                    'status' => $before === null || $fuel === null ? null : ($fuel === $beforeFuel ? 'Nguyên trạng' : 'Thay đổi'),
                    'changed' => $before !== null && $fuel !== null && $fuel !== $beforeFuel,
                ],
            ],
            'groups' => $groups,
            'notes' => array_values(array_filter([
                ($before['general_condition'] ?? null) || ($snapshot['general_condition'] ?? null)
                    ? ['label' => 'Tình trạng xe', 'before' => $before['general_condition'] ?? '—', 'after' => $snapshot['general_condition'] ?? '—'] : null,
                ['label' => 'Đồ có giá trị', 'before' => ($before['valuables_note'] ?? null) ?: 'Không có', 'after' => ($snapshot['valuables_note'] ?? null) ?: 'Không có'],
            ])),
            'photos' => $this->photos($handover, $snapshot['photos'] ?? []),
            'changes' => $changes,
        ];
    }

    public function vehicleText(VehicleHandover $handover): string
    {
        $handover->loadMissing('vehicle.model.brand');
        $vehicle = $handover->vehicle;
        $name = trim(($vehicle?->model?->brand?->name ?? '').' '.($vehicle?->model?->name ?? ''));
        $plate = ($handover->snapshot['vehicle']['license_plate'] ?? null) ?: 'xxx.xx';

        return $name !== '' ? "{$name} · {$plate}" : $plate;
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @param  array<int, array<string, mixed>>  $beforeItems
     * @param  array<int, string>  $changes
     * @return array<int, array<string, mixed>>
     */
    private function rows(array $items, array $beforeItems, string $category, bool $compare, array &$changes): array
    {
        $key = fn (array $item) => mb_strtolower(trim((string) $item['label']));
        $priorByLabel = collect($beforeItems)->keyBy($key);
        $rows = [];

        foreach ($items as $item) {
            if ($item['category'] !== $category) {
                continue;
            }
            $prior = $priorByLabel->get($key($item));
            $changed = $compare && (! $prior || $prior['condition'] !== $item['condition'] || (int) ($prior['quantity'] ?? 0) !== (int) ($item['quantity'] ?? 0));
            if ($changed) {
                $changes[] = $item['label'];
            }
            $rows[] = [
                'label' => $item['label'],
                'before' => $prior ? $this->conditionWithQuantity($prior) : 'Không có',
                'beforeNote' => $prior['note'] ?? null,
                'after' => self::CONDITION_TEXT[$item['condition']] ?? $item['condition'],
                'bad' => in_array($item['condition'], ['SCRATCH', 'DENT', 'BROKEN', 'MISSING'], true),
                'quantity' => $item['quantity'] ?? null,
                'note' => $item['note'] ?? null,
                'status' => ! $compare ? null : (! $prior ? 'Đã bổ sung' : ($changed ? 'Thay đổi' : 'Nguyên trạng')),
                'changed' => $changed,
            ];
        }

        // Mục đã ghi lúc nhận nhưng biên bản trả xe không có (biên bản cũ).
        $labels = collect($items)->map($key);
        foreach ($beforeItems as $prior) {
            if ($compare && $prior['category'] === $category && ! $labels->contains($key($prior))) {
                $changes[] = $prior['label'].' (không ghi lúc trả)';
                $rows[] = [
                    'label' => $prior['label'], 'before' => $this->conditionWithQuantity($prior), 'beforeNote' => $prior['note'] ?? null,
                    'after' => 'Không ghi', 'bad' => true, 'quantity' => null, 'note' => null, 'status' => 'Không ghi', 'changed' => true,
                ];
            }
        }

        return $rows;
    }

    /**
     * @param  array<int, array<string, mixed>>  $photos
     * @return array<int, array{url: string, caption: string}>
     */
    private function photos(VehicleHandover $handover, array $photos): array
    {
        return array_map(fn (array $photo) => [
            'url' => URL::temporarySignedRoute('handovers.email-view.photo', now()->addMinutes(self::PHOTO_TTL_MINUTES), [
                'handover' => $handover->id,
                'media' => $photo['id'],
                'rev' => $this->revision($handover),
            ], false),
            'caption' => self::POSITION_TEXT[$photo['position_code'] ?? ''] ?? 'Ảnh xe',
        ], $photos);
    }

    /** @param  array<string, mixed>  $item */
    private function conditionWithQuantity(array $item): string
    {
        return (self::CONDITION_TEXT[$item['condition']] ?? $item['condition']).(! empty($item['quantity']) ? ' × '.$item['quantity'] : '');
    }

    private function km(mixed $value): string
    {
        return $value === null ? 'Không ghi' : $this->number((int) $value).' km';
    }

    private function number(int $value): string
    {
        return number_format($value, 0, ',', '.');
    }

    private function revision(VehicleHandover $handover): string
    {
        return substr((string) $handover->snapshot_sha256, 0, 16);
    }
}
