<?php

namespace App\Support;

use App\Models\Vehicle;
use App\Models\VehicleModel;
use App\Models\VehicleTrim;
use Illuminate\Validation\ValidationException;

/**
 * Kiểm tra lựa chọn Dòng xe / Phiên bản gửi lên từ bộ chọn xe.
 *
 * - Phiên bản (nếu có) phải thuộc đúng dòng xe.
 * - Khách hàng chỉ chọn MỚI được bản ghi đang hiển thị (ACTIVE, hãng ACTIVE);
 *   giữ nguyên lựa chọn cũ của xe đã lưu thì không bắt buộc (admin có thể đã ẩn).
 * - Nhân viên ($allowHidden) được chọn cả bản ghi đã ẩn để khai báo xe đời cũ.
 */
final class VehicleCatalogSelection
{
    /**
     * @param  string  $field  tiền tố khóa lỗi, ví dụ '' hoặc 'new_vehicle.'
     * @return array{model: VehicleModel, trim: VehicleTrim|null}
     */
    public static function resolve(
        int $modelId,
        ?int $trimId,
        string $field = '',
        ?Vehicle $current = null,
        bool $allowHidden = false,
    ): array {
        $model = VehicleModel::query()->with('brand:id,status')->find($modelId);
        $keepsModel = $allowHidden || ($current !== null && (int) $current->model_id === $modelId);

        if (! $model) {
            throw ValidationException::withMessages([$field.'model_id' => 'Dòng xe không tồn tại.']);
        }

        if (! $keepsModel && ($model->status !== 'ACTIVE' || $model->brand?->status !== 'ACTIVE')) {
            throw ValidationException::withMessages([$field.'model_id' => 'Dòng xe đã ngừng hiển thị, vui lòng chọn dòng xe khác.']);
        }

        if ($trimId === null) {
            return ['model' => $model, 'trim' => null];
        }

        $trim = VehicleTrim::query()->find($trimId);
        if (! $trim || (int) $trim->model_id !== (int) $model->id) {
            throw ValidationException::withMessages([$field.'trim_id' => 'Phiên bản không thuộc dòng xe đã chọn.']);
        }

        $keepsTrim = $allowHidden || ($current !== null && (int) $current->trim_id === $trimId);
        if (! $keepsTrim && $trim->status !== 'ACTIVE') {
            throw ValidationException::withMessages([$field.'trim_id' => 'Phiên bản đã ngừng hiển thị, vui lòng chọn phiên bản khác.']);
        }

        return ['model' => $model, 'trim' => $trim];
    }

    /**
     * Áp lựa chọn vào dữ liệu đã validate của hồ sơ xe:
     * - đổi dòng xe mà không gửi phiên bản → bỏ phiên bản cũ;
     * - có phiên bản mà không gửi variant → variant = tên phiên bản (để màn hình cũ vẫn hiển thị).
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    public static function apply(array $validated, ?Vehicle $current = null, bool $allowHidden = false): array
    {
        if (! array_key_exists('model_id', $validated) && ! array_key_exists('trim_id', $validated)) {
            return $validated;
        }

        $modelId = (int) ($validated['model_id'] ?? $current?->model_id);
        $modelChanged = $current === null || $modelId !== (int) $current->model_id;

        $trimId = array_key_exists('trim_id', $validated)
            ? ($validated['trim_id'] === null ? null : (int) $validated['trim_id'])
            : ($modelChanged ? null : $current->trim_id);

        ['model' => $model, 'trim' => $trim] = self::resolve($modelId, $trimId, '', $current, $allowHidden);

        $validated['model_id'] = $model->id;
        $validated['trim_id'] = $trim?->id;

        if (! array_key_exists('variant', $validated)) {
            if ($trim) {
                $validated['variant'] = $trim->name;
            } elseif ($current?->trim_id && $current->variant === $current->trim?->name) {
                $validated['variant'] = null; // variant cũ chỉ là tên phiên bản vừa bỏ
            }
        }

        return $validated;
    }
}
