<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\Vehicle;
use App\Models\VehicleModel;
use Database\Factories\Support\VietnameseData;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Chuẩn hoá dữ liệu mẫu do factory cũ sinh (faker en_US) cho giống thực tế (chạy riêng):
 *   php artisan db:seed --class=NormalizeSampleDataSeeder
 *
 * Chỉ đụng tới bản ghi nhận diện chắc chắn là dữ liệu mẫu:
 * - tài khoản email "@example.*" → khách/nhân viên gắn với nó: họ tên, SĐT tiếng Việt, email mới;
 * - khách vãng lai sinh cùng đợt với các khách trên (không tài khoản, không email, cùng thời điểm tạo);
 * - "dòng xe" tên là một từ Latin viết thường do factory tạo (source NULL) → xe chuyển sang dòng xe thật
 *   cùng hãng (+ phiên bản nếu có), biển số lỗi được thay; dòng xe rác không còn dùng thì xoá.
 * Cập nhật tại chỗ nên lịch hẹn, phiếu, hoá đơn, đánh giá vẫn trỏ đúng. Chạy lại không đổi gì thêm.
 */
class NormalizeSampleDataSeeder extends Seeder
{
    private const PLATE = '/^\d{2}[A-Z]{1,2}-\d{3}\.\d{2}$/';

    public function run(): void
    {
        fake()->seed(20261109);

        $stats = DB::transaction(fn () => [
            'staff' => $this->normalizeStaff(),
            'customers' => $this->normalizeCustomers(),
            'vehicles' => $this->normalizeVehicles(),
            'models_removed' => $this->removeOrphanModels(),
        ]);

        $this->command?->info(sprintf('Chuẩn hoá dữ liệu mẫu: %d nhân viên, %d khách hàng, %d xe, xoá %d dòng xe rác.',
            $stats['staff'], $stats['customers'], $stats['vehicles'], $stats['models_removed']));
    }

    private function sampleAccounts(): Collection
    {
        return Account::query()->where('email', 'like', '%@example.%')->get();
    }

    private function normalizeStaff(): int
    {
        $count = 0;
        foreach (Employee::query()->whereIn('account_id', $this->sampleAccounts()->pluck('id'))->with('account')->get() as $employee) {
            $name = VietnameseData::fullName();
            $employee->update(['full_name' => $name, 'phone' => VietnameseData::phone()]);
            $employee->account->update(['email' => $this->uniqueEmail($name, 'carservice.vn')]);
            $count++;
        }

        return $count;
    }

    private function normalizeCustomers(): int
    {
        $sample = Customer::query()->whereIn('account_id', $this->sampleAccounts()->pluck('id'))->with('account')->get();
        $batches = $sample->pluck('created_at')->map(fn ($at) => $at?->toDateTimeString())->filter()->unique();

        $walkIns = $batches->isEmpty() ? collect() : Customer::query()
            ->whereNull('account_id')->whereNull('email')
            ->whereIn('created_at', $batches->all())
            ->get();

        foreach ($sample as $customer) {
            $name = VietnameseData::fullName();
            $email = $this->uniqueEmail($name, 'gmail.com');
            $customer->update(['full_name' => $name, 'phone' => VietnameseData::phone(), 'email' => $email, 'address' => VietnameseData::address()]);
            $customer->account?->update(['email' => $email]);
        }
        foreach ($walkIns as $customer) {
            $customer->update(['full_name' => VietnameseData::fullName(), 'phone' => VietnameseData::phone(), 'address' => VietnameseData::address()]);
        }

        return $sample->count() + $walkIns->count();
    }

    private function normalizeVehicles(): int
    {
        $garbage = $this->garbageModelIds();
        $real = VehicleModel::query()->where('status', 'ACTIVE')->whereNotIn('id', $garbage)->with('trims:id,model_id,name,status')->get()->groupBy('brand_id');
        $usedPlates = Vehicle::withTrashed()->pluck('license_plate')->filter()->flip();

        $count = 0;
        $vehicles = Vehicle::withTrashed()->with('model:id,brand_id')
            ->where(fn ($q) => $q->whereIn('model_id', $garbage)->orWhere('license_plate', 'like', '%?%'))
            ->get();

        foreach ($vehicles as $vehicle) {
            $changes = [];
            if ($garbage->contains($vehicle->model_id)) {
                $pool = $real->get($vehicle->model?->brand_id) ?? $real->flatten(1);
                /** @var VehicleModel $model */
                $model = $pool->random();
                $trims = $model->trims->where('status', 'ACTIVE');
                $trim = $trims->isEmpty() ? null : $trims->random();
                $changes += ['model_id' => $model->id, 'trim_id' => $trim?->id, 'variant' => $trim?->name ?? $vehicle->variant];
            }
            if (! preg_match(self::PLATE, (string) $vehicle->license_plate)) {
                do {
                    $plate = VietnameseData::plate();
                } while ($usedPlates->has($plate));
                $usedPlates[$plate] = true;
                $changes['license_plate'] = $plate;
            }
            if ($changes) {
                $vehicle->forceFill($changes)->saveQuietly();
                $count++;
            }
        }

        return $count;
    }

    private function removeOrphanModels(): int
    {
        $removed = 0;
        foreach ($this->garbageModelIds() as $id) {
            $used = Vehicle::withTrashed()->where('model_id', $id)->exists()
                || DB::table('maintenance_packages')->where('vehicle_model_id', $id)->exists()
                || DB::table('part_compatibilities')->where('vehicle_model_id', $id)->exists()
                || DB::table('vehicle_trims')->where('model_id', $id)->exists();
            if (! $used) {
                VehicleModel::query()->whereKey($id)->delete();
                $removed++;
            }
        }

        return $removed;
    }

    /** Dòng xe do factory cũ sinh: không có nguồn và tên là một từ Latin viết thường (vd "perspiciatis"). */
    private function garbageModelIds(): Collection
    {
        return VehicleModel::query()->whereNull('source')->get(['id', 'name'])
            ->filter(fn (VehicleModel $m) => preg_match('/^[a-z]+$/', $m->name) === 1)
            ->pluck('id')->values();
    }

    private function uniqueEmail(string $name, string $domain): string
    {
        $base = Str::of(Str::ascii($name))->lower()->replaceMatches('/[^a-z ]/', '')->squish()->replace(' ', '.');
        for ($i = 0; ; $i++) {
            $email = $base.($i ? $i + 1 : '').'@'.$domain;
            if (! Account::query()->where('email', $email)->exists() && ! Customer::query()->where('email', $email)->exists()) {
                return $email;
            }
        }
    }
}
