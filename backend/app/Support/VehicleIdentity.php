<?php

namespace App\Support;

use App\Models\Vehicle;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;
use Illuminate\Validation\ValidationException;

/**
 * Biển số / VIN là duy nhất trong các xe ĐANG hoạt động (PO 26/11/2026).
 *
 * - Xe đã xoá (mềm) giữ nguyên biển số / VIN để lịch sử sửa chữa, hoá đơn, biên bản không mất.
 * - Khách thêm lại xe của chính mình → khôi phục hồ sơ cũ kèm lịch sử (không tạo bản trùng).
 * - Xe đã bán cho chủ mới → chủ mới đăng ký bình thường; lịch sử của chủ cũ vẫn thuộc chủ cũ.
 *
 * Ràng buộc DB tương ứng: cột ảo active_license_plate / active_vin (unique), migration 2026_11_26_100000.
 */
final class VehicleIdentity
{
    public static function plateUnique(?int $ignoreVehicleId = null): Unique
    {
        return Rule::unique('vehicles', 'license_plate')->whereNull('deleted_at')->ignore($ignoreVehicleId);
    }

    public static function vinUnique(?int $ignoreVehicleId = null): Unique
    {
        return Rule::unique('vehicles', 'vin')->whereNull('deleted_at')->ignore($ignoreVehicleId);
    }

    /** Xe đã xoá của chính khách này có cùng biển số (ưu tiên) hoặc cùng VIN. */
    public static function findDeletedOwned(int $customerId, ?string $plate, ?string $vin): ?Vehicle
    {
        $plate = $plate === null ? '' : mb_strtoupper(trim($plate));
        $vin = $vin === null ? '' : VehicleVin::normalize($vin);
        if ($plate === '' && $vin === '') {
            return null;
        }

        return Vehicle::onlyTrashed()
            ->where('customer_id', $customerId)
            ->where(fn ($query) => $query
                ->when($plate !== '', fn ($q) => $q->orWhere('license_plate', $plate))
                ->when($vin !== '', fn ($q) => $q->orWhere('vin', $vin)))
            ->orderByRaw('CASE WHEN license_plate = ? THEN 0 ELSE 1 END', [$plate])
            ->latest('deleted_at')
            ->lockForUpdate()
            ->first();
    }

    /**
     * Khôi phục xe đã xoá — chặn nếu trong lúc đó biển số / VIN đã được đăng ký cho một xe khác đang hoạt động.
     *
     * @param  array{plate?: string, vin?: string}  $fields  tên trường để báo lỗi
     *
     * @throws ValidationException
     */
    public static function restore(Vehicle $vehicle, array $fields = []): Vehicle
    {
        $active = fn (string $column, ?string $value) => filled($value)
            && Vehicle::query()->where($column, $value)->whereKeyNot($vehicle->getKey())->exists();

        $errors = [];
        if ($active('license_plate', $vehicle->license_plate)) {
            $errors[$fields['plate'] ?? 'license_plate'] = 'Biển số này đã được đăng ký cho một xe khác đang hoạt động. Vui lòng liên hệ gara.';
        }
        if ($active('vin', $vehicle->vin)) {
            $errors[$fields['vin'] ?? 'vin'] = VehicleVin::TAKEN_MESSAGE;
        }
        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        $vehicle->restore();

        return $vehicle;
    }
}
