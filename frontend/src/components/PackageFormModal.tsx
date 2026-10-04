import { useMemo, useState } from 'react';
import ModalShell from './ModalShell';
import type {
  IPackage,
  IPackageFormValues,
  IPackageServiceItem,
  IVehicleModelOption,
} from '../interfaces/IPackage';
import type { IService } from '../interfaces/IService';
import { formatCurrency, formatDuration } from '../utils/format';

/**
 * ============================================================================
 * MODAL THÊM / SỬA GÓI BẢO DƯỠNG
 * ============================================================================
 *
 * CÙNG CÁCH TỔ CHỨC VỚI ServiceFormModal.tsx:
 *   1. PackageFormBody  — chứa form + state, chỉ tồn tại khi modal mở.
 *   2. PackageFormModal — component export, quyết định mở/đóng.
 *   Lý do tách 2 phần (reset state bằng cách remount thay vì useEffect)
 *   được giải thích đầy đủ trong ServiceFormModal.tsx — đọc file đó trước.
 *
 * PHẦN RIÊNG CỦA GÓI BẢO DƯỠNG:
 *   Ngoài thông tin cơ bản (tên, mốc km/tháng, mô tả), gói còn có một
 *   DANH SÁCH DỊCH VỤ kèm số lượng. Đây là phần phức tạp nhất của modal:
 *     - danh sách dịch vụ đã chọn (có ô nhập số lượng)
 *     - danh sách dịch vụ có thể chọn (checkbox, có ô tìm kiếm)
 *     - tổng giá và tổng thời gian cập nhật TẠI CHỖ theo lựa chọn
 */

interface PackageFormModalProps {
  open: boolean;
  // null -> thêm mới, khác null -> sửa gói này.
  pkg: IPackage | null;
  // Danh sách dịch vụ đầy đủ để admin tick chọn.
  services: IService[];
  // Danh sách model xe cho dropdown "Áp dụng cho".
  vehicleModels: IVehicleModelOption[];
  onClose: () => void;
  onSubmit: (values: IPackageFormValues) => void;
}

type Errors = Partial<Record<keyof IPackageFormValues, string>>;

const inputClass =
  'w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all';
const labelClass = 'block text-xs font-semibold text-gray-700 mb-1';

// Bộ rỗng cho chế độ thêm mới. Tách thành hằng để không tạo object mới
// mỗi lần gọi toFormValues(null).
const EMPTY_FORM: IPackageFormValues = {
  vehicle_model_id: '',
  name: '',
  mileage_milestone: '',
  month_milestone: '',
  description: '',
  status: 'ACTIVE',
  services: [],
};

/**
 * Đổ gói bảo dưỡng thành giá trị khởi tạo cho form.
 *
 * Xử lý null cho 3 field:
 *   - vehicle_model_id: null (áp dụng chung) -> '' (chưa chọn ở dropdown)
 *   - mileage_milestone / month_milestone: null -> '' (ô nhập trống)
 *
 * Riêng `services` dùng .map() tạo object MỚI cho mỗi phần tử:
 *   Nếu dùng thẳng pkg.services thì khi sửa số lượng, form sẽ ghi đè luôn
 *   vào object của gói gốc. Sau khi bấm Huỷ, dữ liệu gốc cũng đã bị đổi.
 */
function toFormValues(pkg: IPackage | null): IPackageFormValues {
  if (!pkg) return EMPTY_FORM;
  return {
    vehicle_model_id: pkg.vehicle_model_id === null ? '' : String(pkg.vehicle_model_id),
    name: pkg.name,
    mileage_milestone: pkg.mileage_milestone === null ? '' : String(pkg.mileage_milestone),
    month_milestone: pkg.month_milestone === null ? '' : String(pkg.month_milestone),
    description: pkg.description ?? '',
    status: pkg.status,
    services: pkg.services.map((s) => ({ ...s })),
  };
}

/**
 * Kiểm tra dữ liệu form trước khi gửi.
 *
 * Quy tắc riêng của gói bảo dưỡng:
 *   - Bắt buộc có ít nhất 1 mốc (km HOẶC tháng), vì gói không có mốc thì
 *     không biết áp dụng khi nào.
 *     LƯU Ý: quy tắc này chặt hơn dữ liệu đang có — mock gói id 5
 *     ("Gói kiểm tra an toàn trước chuyến đi dài") cố ý để cả 2 mốc rỗng
 *     để kiểm tra formatMilestone trả về "—". Hệ quả: mở gói đó ra sửa
 *     rồi bấm Lưu mà không nhập mốc sẽ bị chặn. Đây là chủ ý — dữ liệu
 *     mới sinh ra từ form luôn nhất quán; bản ghi cũ thiếu mốc thì admin
 *     phải bổ sung khi chạm vào.
 *   - Bắt buộc có ít nhất 1 dịch vụ, vì gói rỗng thì vô nghĩa.
 *
 * Vòng lặp kiểm tra cả 2 ô mốc bằng cách duyệt mảng cặp [tên field, giá trị]:
 *   Tránh viết lặp 2 khối if gần như giống hệt nhau.
 */
function validate(values: IPackageFormValues): Errors {
  const errors: Errors = {};

  if (!values.name.trim()) {
    errors.name = 'Vui lòng nhập tên gói bảo dưỡng.';
  } else if (values.name.trim().length > 150) {
    errors.name = 'Tên gói tối đa 150 ký tự.';
  }

  if (!values.mileage_milestone && !values.month_milestone) {
    errors.mileage_milestone = 'Nhập ít nhất một mốc (km hoặc tháng) cho gói.';
  }

  for (const [field, value] of [
    ['mileage_milestone', values.mileage_milestone],
    ['month_milestone', values.month_milestone],
  ] as const) {
    if (value === '') continue;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors[field] = 'Phải là số nguyên lớn hơn 0.';
    }
  }

  if (values.services.length === 0) {
    errors.services = 'Chọn ít nhất một dịch vụ cho gói bảo dưỡng.';
  }

  return errors;
}

/**
 * Thân form — chỉ tồn tại khi modal đang mở.
 */
function PackageFormBody({
  pkg,
  services,
  vehicleModels,
  onClose,
  onSubmit,
}: Omit<PackageFormModalProps, 'open'>) {
  // Dữ liệu form. Lazy initializer: chỉ tính 1 lần lúc mount.
  const [values, setValues] = useState<IPackageFormValues>(() => toFormValues(pkg));

  // Lỗi validation theo từng field.
  const [errors, setErrors] = useState<Errors>({});

  // Từ khoá tìm kiếm trong danh sách dịch vụ (chỉ ảnh hưởng hiển thị,
  // không xoá dịch vụ đã chọn).
  const [pickerKeyword, setPickerKeyword] = useState('');

  const isEdit = pkg !== null;

  /**
   * useMemo tra cứu giá dịch vụ theo id.
   *
   * VÌ SAO DÙNG useMemo:
   *   Hàm render chạy lại mỗi khi người dùng tick thêm/bớt dịch vụ.
   *   Nếu tạo Map mới mỗi lần thì mọi lần gõ số lượng cũng tạo lại Map,
   *   tốn công vô ích. useMemo giữ lại Map cũ nếu `services` không đổi.
   *   (services là prop, chỉ đổi khi page cha thay cả danh sách dịch vụ.)
   */
  const priceById = useMemo(
    () => new Map(services.map((s) => [s.id, Number(s.base_price)])),
    [services],
  );

  // Tương tự: tra thời gian để cộng tổng.
  const durationById = useMemo(
    () => new Map(services.map((s) => [s.id, s.estimated_minutes ?? 0])),
    [services],
  );

  /**
   * Tổng giá gói = SUM(giá dịch vụ × số lượng).
   * Biến được tính lại ở mỗi lần render, nên khi admin đổi số lượng
   * con số này cập nhật ngay lập tức, không cần bấm nút nào.
   */
  const totalPrice = values.services.reduce(
    (sum, item) => sum + (priceById.get(item.service_id) ?? 0) * item.quantity,
    0,
  );

  /** Tổng thời gian dự kiến = SUM(thời gian dịch vụ × số lượng). */
  const totalMinutes = values.services.reduce(
    (sum, item) => sum + (durationById.get(item.service_id) ?? 0) * item.quantity,
    0,
  );

  /**
   * Tập id các dịch vụ ĐÃ chọn, để biết checkbox nào đang tick.
   * Tạo Set giúp tra cứu nhanh và viết gọn hơn services.includes().
   */
  const selectedIds = new Set(values.services.map((s) => s.service_id));

  /**
   * Lọc danh sách dịch vụ theo từ khoá tìm kiếm.
   *
   * So khớp KHÔNG phân biệt hoa thường (toLowerCase) và cắt khoảng trắng
   * (.trim) để tìm " phanh " cũng ra kết quả.
   * Tìm trong cả tên lẫn nhóm vì admin có thể nhớ "dịch vụ phanh" mà không
   * nhớ tên đầy đủ.
   */
  const filteredPickers = services.filter((service) => {
    const keyword = pickerKeyword.trim().toLowerCase();
    if (!keyword) return true;
    return (
      service.name.toLowerCase().includes(keyword) ||
      (service.category ?? '').toLowerCase().includes(keyword)
    );
  });

  /**
   * Gán giá trị cho 1 field của form, đồng thời xoá lỗi cũ của field đó.
   * (Dùng <K extends keyof ...> để TypeScript bắt lỗi nếu gọi sai tên field.)
   */
  const setValue = <K extends keyof IPackageFormValues>(
    key: K,
    value: IPackageFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /**
   * Bật/tắt một dịch vụ trong gói.
   *
   * Đây là thao tác quan trọng nhất của modal:
   *   - Đang chọn -> BỎ chọn (xoá khỏi danh sách)
   *   - Chưa chọn  -> THÊM vào danh sách với quantity mặc định = 1
   *
   * Dùng setValues(prev => ...) và đọc `prev.services.some(...)` bên trong
   * để lấy danh sách mới nhất. Viết setValue trực tiếp dựa vào `values`
   * sẽ sai khi bấm nhanh nhiều checkbox liên tiếp.
   */
  const toggleService = (serviceId: number) => {
    setValues((prev) => {
      const exists = prev.services.some((s) => s.service_id === serviceId);
      const next = exists
        ? prev.services.filter((s) => s.service_id !== serviceId)
        : [...prev.services, { service_id: serviceId, quantity: 1 }];
      return { ...prev, services: next };
    });
    setErrors((prev) => ({ ...prev, services: undefined }));
  };

  /**
   * Đổi số lượng của một dịch vụ đã chọn.
   *
   * Math.max(1, ...) chặn nhập 0 hoặc số âm — bảng maintenance_package_services
   * có cột quantity default 1, số lượng 0 sẽ làm tổng giá gói sai lệch.
   * Math.floor chặn số thập phân vì quantity là cột integer.
   */
  const changeQuantity = (serviceId: number, quantity: number) => {
    setValues((prev) => ({
      ...prev,
      services: prev.services.map((item) =>
        item.service_id === serviceId ? { ...item, quantity } : item,
      ),
    }));
  };

  /**
   * Xử lý nút "Tạo gói" / "Lưu thay đổi".
   * Cùng luồng với ServiceFormModal: chặn reload -> validate -> gửi lên cha.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      ...values,
      name: values.name.trim(),
      description: values.description.trim(),
      services: values.services.map((item) => ({ ...item })),
    });
  };

  return (
    // size="lg": modal rộng hơn vì cần 3 cột thông tin + danh sách dịch vụ.
    <ModalShell
      open
      size="lg"
      title={isEdit ? 'Cập nhật gói bảo dưỡng' : 'Thêm gói bảo dưỡng'}
      description={
        isEdit
          ? `Đang sửa gói #${String(pkg.id).padStart(3, '0')}`
          : 'Gói gom nhiều dịch vụ để khách đặt lịch nhanh hơn.'
      }
      onClose={onClose}
      footer={
        <>
          {/*
            mr-auto: đẩy khối thông tin tổng tiền sang bên TRÁI, tách khỏi
            cụm nút Huỷ/Lưu ở bên phải. Nhờ vậy admin luôn thấy tổng giá
            ngay cạnh nút xác nhận mà không phải cuộn lên trên xem.
          */}
          <div className="mr-auto text-[11px] text-gray-500 leading-tight">
            <div>
              Đã chọn{' '}
              <span className="font-semibold text-gray-900">{values.services.length}</span> hạng
              mục · <span className="font-semibold text-gray-900">{formatCurrency(totalPrice)}</span>
            </div>
            <div>Tổng thời gian dự kiến: {formatDuration(totalMinutes)}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Huỷ bỏ
          </button>
          <button
            type="submit"
            form="package-form"
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-[0.99] cursor-pointer"
          >
            {isEdit ? 'Lưu thay đổi' : 'Tạo gói'}
          </button>
        </>
      }
    >
      <form id="package-form" onSubmit={handleSubmit} className="space-y-5">
        {/* ---- TÊN GÓI + PHẠM VI ÁP DỤNG ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="package-name" className={labelClass}>
              Tên gói <span className="text-red-600">*</span>
            </label>
            <input
              id="package-name"
              type="text"
              value={values.name}
              onChange={(e) => setValue('name', e.target.value)}
              placeholder="Ví dụ: Gói bảo dưỡng cơ bản 10.000 km"
              className={inputClass}
            />
            {errors.name && <p className="mt-1 text-[11px] text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="package-model" className={labelClass}>
              Áp dụng cho model xe
            </label>
            {/*
              Option rỗng đầu tiên = "Mọi model xe".
              Giá trị '' này được page cha đổi thành null (áp dụng chung) khi lưu.
              Không bắt buộc chọn vì đa số gói là áp dụng chung.
            */}
            <select
              id="package-model"
              value={values.vehicle_model_id}
              onChange={(e) => setValue('vehicle_model_id', e.target.value)}
              className={inputClass}
            >
              <option value="">Mọi model xe (áp dụng chung)</option>
              {/* value là String(id) vì state đang lưu chuỗi. */}
              {vehicleModels.map((model) => (
                <option key={model.id} value={String(model.id)}>
                  {model.brand_name} {model.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ---- MỐC KM + MỐC THÁNG + TRẠNG THÁI ----
            3 cột vì cả 2 mốc có thể nhập cùng lúc. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="package-mileage" className={labelClass}>
              Mốc km
            </label>
            <input
              id="package-mileage"
              type="number"
              min={1}
              step={1000}
              value={values.mileage_milestone}
              onChange={(e) => setValue('mileage_milestone', e.target.value)}
              placeholder="10000"
              className={inputClass}
            />
            {errors.mileage_milestone && (
              <p className="mt-1 text-[11px] text-red-600">{errors.mileage_milestone}</p>
            )}
          </div>

          <div>
            <label htmlFor="package-month" className={labelClass}>
              Mốc tháng
            </label>
            <input
              id="package-month"
              type="number"
              min={1}
              step={1}
              value={values.month_milestone}
              onChange={(e) => setValue('month_milestone', e.target.value)}
              placeholder="6"
              className={inputClass}
            />
            {errors.month_milestone && (
              <p className="mt-1 text-[11px] text-red-600">{errors.month_milestone}</p>
            )}
          </div>

          <div>
            <label htmlFor="package-status" className={labelClass}>
              Trạng thái
            </label>
            <select
              id="package-status"
              value={values.status}
              onChange={(e) =>
                setValue('status', e.target.value as IPackageFormValues['status'])
              }
              className={inputClass}
            >
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
            </select>
          </div>
        </div>

        {/* ---- MÔ TẢ ---- */}
        <div>
          <label htmlFor="package-description" className={labelClass}>
            Mô tả
          </label>
          <textarea
            id="package-description"
            rows={3}
            value={values.description}
            onChange={(e) => setValue('description', e.target.value)}
            placeholder="Gói này phù hợp với xe dùng nhiều, khuyến nghị thực hiện theo lịch hãng."
            className={`${inputClass} resize-y`}
          />
        </div>

        {/* ==================================================================
            PHẦN CHỌN DỊCH VỤ — trái tim của modal gói bảo dưỡng
            Chia làm 3 khối theo thứ tự ưu tiên khi admin nhìn:
              1. Danh sách ĐÃ chọn (có số lượng, có giá) — thông tin đang chọn
              2. Ô tìm kiếm — lọc danh mục 12 dịch vụ
              3. Danh sách CÓ THỂ chọn (checkbox) — thông tin còn lại
            ================================================================== */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-gray-700">
              Dịch vụ kèm theo <span className="text-red-600">*</span>
            </label>
            {/* Bộ đếm "3/12": cho biết đã chọn bao nhiêu trong tổng số,
                kiểm tra nhanh mà không cần đếm. */}
            <span className="text-[11px] text-gray-400">
              {values.services.length}/{services.length} dịch vụ khả dụng
            </span>
          </div>

          {/* Ô tìm kiếm — CHỈ lọc khối danh sách có thể chọn bên dưới,
              không đụng tới những dịch vụ đã chọn. Nếu lọc cả danh sách đã
              chọn thì admin tìm "phanh" có thể làm mất dòng đang chỉnh số lượng. */}
          <input
            type="search"
            value={pickerKeyword}
            onChange={(e) => setPickerKeyword(e.target.value)}
            placeholder="Tìm dịch vụ theo tên hoặc nhóm..."
            className={`${inputClass} mb-2`}
          />

          {errors.services && <p className="mb-2 text-[11px] text-red-600">{errors.services}</p>}

          {/* ---- KHỐI 1: DỊCH VỤ ĐÃ CHỌN ----
              Chỉ render khi có ít nhất 1 dịch vụ (values.services.length > 0),
              tránh hiện khối rỗng vô nghĩa. */}
          {values.services.length > 0 && (
            <div className="mb-2 rounded-xl border border-gray-200 bg-gray-50/60 divide-y divide-gray-100">
              {values.services.map((item: IPackageServiceItem) => {
                // Tra dịch vụ tương ứng để hiện tên và giá.
                const service = services.find((s) => s.id === item.service_id);
                // Nếu không tìm thấy (ví dụ gói tham chiếu dịch vụ đã bị xoá
                // ở danh mục) thì bỏ qua dòng này thay vì crash cả modal.
                if (!service) return null;
                return (
                  <div
                    key={item.service_id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    {/* min-w-0: bắt buộc để truncate hoạt động trong flex,
                        nếu không tên dài sẽ đẩy ô số lượng ra ngoài. */}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">
                        {service.name}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {formatCurrency(service.base_price)} / lần
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label htmlFor={`qty-${item.service_id}`} className="text-[11px] text-gray-500">
                        SL
                      </label>
                      <input
                        // id khớp với htmlFor của nhãn phía trên.
                        id={`qty-${item.service_id}`}
                        type="number"
                        min={1}
                        max={99}
                        value={item.quantity}
                        onChange={(e) =>
                          changeQuantity(
                            item.service_id,
                            // Math.max chặn 0/số âm, Math.floor chặn số thập phân.
                            Math.max(1, Math.floor(Number(e.target.value) || 1)),
                          )
                        }
                        className="w-16 px-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-center focus:outline-none focus:border-gray-900"
                      />
                      {/* w-24 + text-right: cột thành tiền cố định bề rộng,
                          nên tổng tiền của các dòng thẳng hàng dọc. */}
                      <span className="w-24 text-right text-xs font-semibold text-gray-900">
                        {formatCurrency(Number(service.base_price) * item.quantity)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ---- KHỐI 3: DANH SÁCH DỊCH VỤ CÓ THỂ CHỌN ----
              max-h-56 + overflow-y-auto: giới hạn chiều cao và cho cuộn,
              vì danh sách dịch vụ có thể dài hàng chục dòng mà không
              làm modal dài quá màn hình. */}
          <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
            {filteredPickers.length === 0 ? (
              // Tìm không ra gì -> giải thích, không để trống im lặng.
              <div className="px-3 py-6 text-center text-xs text-gray-400">
                Không tìm thấy dịch vụ phù hợp.
              </div>
            ) : (
              filteredPickers.map((service) => {
                const checked = selectedIds.has(service.id);
                return (
                  // Cả dòng là <label> -> bấm vào chữ cũng tick được checkbox.
                  // Nhờ vậy vùng bấm rộng, dễ dùng trên điện thoại.
                  <label
                    key={service.id}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      // checked điều khiển từ state -> phải kèm onChange,
                      // nếu không React sẽ báo lỗi "read-only field".
                      checked={checked}
                      onChange={() => toggleService(service.id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900 shrink-0"
                    />
                    {/* min-w-0 flex-1 + truncate trên <span> bên trong:
                        cho phép tên dịch vụ dài bị cắt bằng "..." thay vì
                        làm hàng cao lên hoặc đẩy checkbox ra xa. */}
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-gray-900 truncate">
                        {service.name}
                      </span>
                      {/* 3 thông tin trên 1 dòng phụ: nhóm · thời gian · giá.
                          Giúp admin so sánh nhanh trước khi tick. */}
                      <span className="block text-[11px] text-gray-500">
                        {service.category ?? 'Chưa phân loại'} ·{' '}
                        {formatDuration(service.estimated_minutes)} ·{' '}
                        {formatCurrency(service.base_price)}
                      </span>
                    </span>
                    {/* Cảnh báo dịch vụ đang ngừng: admin vẫn cho chọn được
                        (lịch sử gói cũ vẫn cần) nhưng phải biết nó không
                        cho khách đặt mới. */}
                    {service.status === 'INACTIVE' && (
                      <span className="shrink-0 text-[11px] text-gray-400">Ngừng</span>
                    )}
                  </label>
                );
              })
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

/**
 * Component xuất ra ngoài — vòng cổng của file.
 * if (!open) return null: gỡ form khỏi cây để state tự reset khi mở lại.
 */
export default function PackageFormModal({
  open,
  pkg,
  services,
  vehicleModels,
  onClose,
  onSubmit,
}: PackageFormModalProps) {
  if (!open) return null;
  return (
    <PackageFormBody
      pkg={pkg}
      services={services}
      vehicleModels={vehicleModels}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
