<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Validation\ValidationException;

class Appointment extends Model
{
    use HasFactory;

    public const ACTIVE_STATUSES = [
        'PENDING',
        'CONFIRMED',
        'CHECKED_IN',
    ];

    protected $table = 'appointments';

    protected $fillable = [
        'appointment_code',
        'customer_id',
        'vehicle_id',
        'appointment_date',
        'appointment_time',
        'request_type',
        'symptom_description',
        'note',
        'status',
        'cancel_reason',
        'created_by_account_id',
        'handled_by_account_id',
    ];

    /** Nhân viên xử lý gần nhất (xác nhận / tiếp nhận / đổi / hủy). */
    public function handledBy(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'handled_by_account_id');
    }

    /** Nhân viên tạo lịch hộ khách (null = khách tự đặt). */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'created_by_account_id');
    }

    public function activities(): MorphMany
    {
        return $this->morphMany(AuditLog::class, 'auditable')->latest('id');
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'appointment_services', 'appointment_id', 'service_id')
            ->withPivot('estimated_price');
    }

    public function packages(): BelongsToMany
    {
        return $this->belongsToMany(
            MaintenancePackage::class,
            'appointment_packages',
            'appointment_id',
            'package_id'
        )->withPivot('estimated_price');
    }

    /**
     * Ghi dịch vụ và gói khách chọn kèm giá ước tính tại thời điểm đặt.
     * Gói riêng của một dòng xe chỉ được chọn cho đúng dòng xe đó.
     * Dịch vụ đã nằm trong gói được bỏ qua để không tính hai lần.
     *
     * @param  array<int, int>  $serviceIds
     * @param  array<int, int>  $packageIds
     *
     * @throws ValidationException
     */
    public function syncRequestedItems(array $serviceIds, array $packageIds): void
    {
        $packageIds = array_values(array_unique($packageIds));
        $vehicleModelId = Vehicle::withTrashed()->whereKey($this->vehicle_id)->value('model_id');

        $packages = MaintenancePackage::query()
            ->availableFor($vehicleModelId === null ? null : (int) $vehicleModelId)
            ->with([
                'services' => fn ($query) => $query->where('status', 'ACTIVE'),
                'parts',
            ])
            ->findMany($packageIds);

        if ($packages->count() !== count($packageIds)) {
            throw ValidationException::withMessages(['package_ids' => 'Gói bảo dưỡng không áp dụng cho dòng xe này.']);
        }

        $servicesInPackages = $packages->flatMap(fn (MaintenancePackage $package) => $package->services->modelKeys())->all();

        $services = Service::query()
            ->findMany(array_diff(array_unique($serviceIds), $servicesInPackages));

        $this->services()->sync(
            $services->mapWithKeys(fn (Service $service) => [
                $service->id => ['estimated_price' => $service->base_price],
            ])->all()
        );

        $this->packages()->sync(
            $packages->mapWithKeys(fn (MaintenancePackage $package) => [
                $package->id => ['estimated_price' => $package->calculateEstimatedPrice()],
            ])->all()
        );
    }
}
