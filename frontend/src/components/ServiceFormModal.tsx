import { useState } from 'react';
import ModalShell from './ModalShell';
import {
  EMPTY_SERVICE_FORM,
  SERVICE_CATEGORIES,
  type IService,
  type IServiceFormValues,
} from '../interfaces/IService';
import { formatCurrency } from '../utils/format';

/**
 * ============================================================================
 * MODAL THÊM / SỬA DỊCH VỤ
 * ============================================================================
 *
 * CẤU TRÚC FILE CÓ 2 PHẦN:
 *
 *   1. ServiceFormBody  — chứa toàn bộ form và state. CHỈ được render khi
 *                         modal đang mở.
 *   2. ServiceFormModal — component mặc định export, làm nhiệm vụ đóng/mở.
 *
 * VÌ SAO PHẢI TÁCH 2 PHẦN (vấn đề quan trọng nhất của file này):
 *   Form cần được RESET về trạng thái ban đầu mỗi lần mở:
 *     - Mở "Thêm dịch vụ" -> các ô phải trống
 *     - Mở "Sửa dịch vụ A" -> các ô phải đầy dữ liệu của A
 *
 *   Cách sai (bản đầu tiên của file này) là dùng useEffect để setState lại:
 *       useEffect(() => { setValues(toFormValues(service)) }, [open, service])
 *   Cách này SAI về mặt hiệu năng: React phải render 2 lần mỗi lần mở modal
 *   (1 lần render với state cũ, rồi mới render lại với state mới) và dễ sinh
 *   lỗi "setState trong effect". ESLint cũng chặn cách này
 *   (react-hooks/set-state-in-effect).
 *
 *   Cách đúng ở đây: ServiceFormModal return null khi đóng, nên khi mở lại
 *   ServiceFormBody được GẮN LẠI (mount mới) và useState chạy lại từ đầu với
 *   dữ liệu mới. React tự lo phần reset, không cần effect, chỉ render 1 lần.
 */

interface ServiceFormModalProps {
  // true -> render form, false -> return null (không render gì ra DOM).
  open: boolean;

  // null  -> chế độ THÊM MỚI (form trống)
  // khác null -> chế độ SỬA (form đổ đầy dữ liệu của dịch vụ này)
  // Chính cách dùng `service === null` này quyết định tiêu đề và nút bấm.
  service: IService | null;

  onClose: () => void;
  onSubmit: (values: IServiceFormValues) => void;
}

// Lỗi validation: mỗi field có thể có tối đa 1 thông báo lỗi.
// Partial = tất cả field đều tuỳ chọn (field nào hợp lệ thì không có key).
type Errors = Partial<Record<keyof IServiceFormValues, string>>;

// Class input dùng chung cho mọi ô, gom ra 1 hằng để đồng bộ giao diện.
// bg-gray-50/50 -> nền xám nhạt, khi focus đổi thành nền trắng (focus:bg-white)
// focus:ring-2 + focus:border-gray-900 -> viền đậm và quầng sáng khi đang gõ.
const inputClass =
  'w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all';

// Class label dùng chung: chữ nhỏ đậm, cách nhãn cách ô 4px.
const labelClass = 'block text-xs font-semibold text-gray-700 mb-1';

/**
 * Đổ dữ liệu dịch vụ thành giá trị khởi tạo cho form.
 *
 * @param service null -> trả về EMPTY_SERVICE_FORM (toàn bộ chuỗi rỗng)
 *              khác null -> map từng field của dịch vụ sang form
 *
 * Ba chỗ phải xử lý riêng:
 *   - category / description: kiểu `string | null` của DB.
 *     Đổi null thành '' để <input> và <select> nhận giá trị.
 *     (Truyền null vào value của input sẽ bị React cảnh báo.)
 *   - base_price: có thể là string "750000.00" từ Laravel -> String() để chắc chắn là string.
 *   - estimated_minutes: null -> '' để ô nhập trống thay vì hiện 0.
 *
 * Hàm này KHÔNG chứa setState, nên có thể gọi trực tiếp trong
 * useState(() => ...) để lấy giá trị khởi tạo.
 */
function toFormValues(service: IService | null): IServiceFormValues {
  if (!service) return EMPTY_SERVICE_FORM;
  return {
    name: service.name,
    category: service.category ?? '',
    description: service.description ?? '',
    base_price: String(service.base_price ?? ''),
    estimated_minutes:
      service.estimated_minutes === null ? '' : String(service.estimated_minutes),
    status: service.status,
  };
}

/**
 * Kiểm tra dữ liệu form TRƯỚC khi gửi đi.
 *
 * @returns Object rỗng = hợp lệ. Có phần tử = field đó đang lỗi.
 *
 * DÙNG THÔNG LỆ: trả về object lỗi thay vì trả về true/false, vì cần biết
 * lỗi nằm ở field nào để hiển thị đúng chữ dưới ô đó.
 *
 * Quy tắc kiểm tra bám theo ràng buộc của database
 * (xem migration create_services_table):
 *   - name: bắt buộc, tối đa 150 ký tự (string(150))
 *   - base_price: phải là số >= 0. Cho phép để trống vì DB có default 0.
 *   - estimated_minutes: nếu có thì phải là số nguyên > 0 (cột integer)
 *
 * Vì sao validate ở frontend mà vẫn cần validate ở backend:
 *   Frontend chỉ chặn lỗi NHÌN THẤY được qua giao diện.
 *   Người dùng vẫn gọi thẳng API bằng Postman hoặc sửa request trong DevTools.
 *   Backend PHẢI validate lại. Đây chỉ là lớp bảo vệ thứ hai cho trải nghiệm.
 */
function validate(values: IServiceFormValues): Errors {
  const errors: Errors = {};

  if (!values.name.trim()) {
    errors.name = 'Vui lòng nhập tên dịch vụ.';
  } else if (values.name.trim().length > 150) {
    errors.name = 'Tên dịch vụ tối đa 150 ký tự.';
  }

  if (values.base_price !== '') {
    const price = Number(values.base_price);
    if (Number.isNaN(price) || price < 0) {
      errors.base_price = 'Giá phải là số lớn hơn hoặc bằng 0.';
    }
  }

  if (values.estimated_minutes !== '') {
    const minutes = Number(values.estimated_minutes);
    if (!Number.isInteger(minutes) || minutes <= 0) {
      errors.estimated_minutes = 'Thời gian phải là số nguyên lớn hơn 0.';
    }
  }

  if (values.description.length > 2000) {
    errors.description = 'Mô tả quá dài (tối đa 2000 ký tự).';
  }

  return errors;
}

/**
 * Thân form. Chỉ tồn tại khi modal đang mở.
 *
 * @param service Dịch vụ đang sửa, hoặc null nếu đang thêm mới.
 */
function ServiceFormBody({
  service,
  onClose,
  onSubmit,
}: Omit<ServiceFormModalProps, 'open'>) {
  /**
   * useState với hàm khởi tạo (lazy initializer):
   *   useState(() => toFormValues(service))
   *
   * Dấu () => rất quan trọng. Hàm này CHỈ chạy lần đầu khi component mount,
   * nên đây là nơi đúng để đổ dữ liệu vào form.
   * (Nếu viết useState(toFormValues(service)) thì hàm sẽ chạy mỗi lần render
   * dù kết quả bị React bỏ qua — lãng phí, và dễ gây hiểu nhầm.)
   */
  const [values, setValues] = useState<IServiceFormValues>(() => toFormValues(service));

  // Danh sách lỗi hiện tại. Rỗng = form đang sạch.
  const [errors, setErrors] = useState<Errors>({});

  // isEdit quyết định chế độ: có service = sửa, không có = thêm mới.
  const isEdit = service !== null;

  /**
   * Gán giá trị cho 1 field của form.
   *
   * <K extends keyof IServiceFormValues> là GENERIC: cho phép truyền bất kỳ
   * tên field hợp lệ. Nhờ đó handleChange('base_price', ...) vẫn đúng kiểu,
   * và gọi sai tên field sẽ bị TypeScript báo lỗi ngay khi code.
   * (Không có generic thì phải viết 7 hàm riêng cho 7 field.)
   *
   * setValues(prev => ({ ...prev, [key]: value })):
   *   - Dùng prev thay vì values để không bị mất dữ liệu khi bấm nhanh nhiều lần.
   *   - {...prev} giữ nguyên các field khác, chỉ ghi đè field này.
   *
   * Đồng thời XOÁ lỗi của field đó: người dùng vừa sửa thì lỗi cũ không còn
   * đúng nữa, giữ lại sẽ gây khó chịu.
   */
  const handleChange = <K extends keyof IServiceFormValues>(
    key: K,
    value: IServiceFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /**
   * Xử lý khi bấm nút "Tạo dịch vụ" / "Lưu thay đổi".
   *
   * Luồng: chặn reload trang -> kiểm tra -> có lỗi thì dừng và hiện chữ báo
   *         -> không lỗi thì đưa dữ liệu lên cho page cha xử lý.
   *
   * @param e Sự kiện submit của form. Bắt buộc gọi e.preventDefault(),
   *           nếu không trình duyệt sẽ tải lại trang và mất toàn bộ state.
   *
   * Gửi dữ liệu đã trim(): bỏ khoảng trắng thừa ở đầu/cuối do vô tình gõ.
   * Quan trọng vì " Thay dầu " và "Thay dầu" phải là cùng một dịch vụ,
   * nếu lưu nguyên sẽ tạo ra 2 bản ghi trùng nhau.
   *
   * Form modal KHÔNG tự cập nhật danh sách dịch vụ — việc đó thuộc về page cha
   * qua props.onSubmit. Nhờ vậy modal không cần biết dữ liệu nằm ở đâu.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      ...values,
      name: values.name.trim(),
      category: values.category.trim(),
      description: values.description.trim(),
    });
  };

  /**
   * Xem trước giá tiền sẽ hiển thị thế nào ngay dưới ô nhập giá.
   * Ở đây giá đang là chuỗi, nên cần kiểm tra Nao/NaN trước khi format,
   * tránh hiện "NaN ₫" khi người dùng đang gõ dở ("12", "12500", ...).
   */
  const previewPrice =
    values.base_price !== '' && !Number.isNaN(Number(values.base_price))
      ? formatCurrency(values.base_price)
      : null;

  return (
    // <ModalShell open> — luôn truyền open vì tới được đây nghĩa là modal đang mở.
    <ModalShell
      open
      title={isEdit ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ mới'}
      description={
        isEdit
          ? `Đang sửa dịch vụ #${String(service.id).padStart(3, '0')}`
          : 'Điền thông tin dịch vụ sẽ hiển thị cho khách khi đặt lịch.'
      }
      onClose={onClose}
      footer={
        <>
          {/* Nút phụ: huỷ, gọi onClose, không gửi dữ liệu. */}
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Huỷ bỏ
          </button>
          {/*
            Nút chính nằm NGOÀI thẻ <form> nhưng lại gắn form="service-form".
            Nhờ vậy nó vẫn kích hoạt submit của form (Enter trong ô cũng được).
            Nếu đặt nút này bên trong form thì ModalShell không có chỗ đặt,
            và form sẽ vỡ khi ModalShell thêm/bớt thẻ bao bọc.
          */}
          <button
            type="submit"
            form="service-form"
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-[0.99] cursor-pointer"
          >
            {isEdit ? 'Lưu thay đổi' : 'Tạo dịch vụ'}
          </button>
        </>
      }
    >
      {/* id="service-form" khớp với form="service-form" ở nút bấm trên. */}
      <form id="service-form" onSubmit={handleSubmit} className="space-y-4">
        {/* ---- Ô TÊN DỊCH VỤ (bắt buộc) ---- */}
        <div>
          {/* htmlFor khớp với id của input để khi bấm vào chữ nhãn thì
              con trỏ nhảy vào ô nhập (bắt buộc với trình đọc màn hình). */}
          <label htmlFor="service-name" className={labelClass}>
            Tên dịch vụ <span className="text-red-600">*</span>
          </label>
          <input
            id="service-name"
            type="text"
            // value luôn bám theo state -> đây là ô ĐIỀU KHIỂN (controlled).
            // Không dùng value thì gõ sẽ không hiện lên màn hình.
            value={values.name}
            // onChange: cập nhật state mỗi lần gõ -> form re-render.
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Ví dụ: Thay dầu máy & lọc gió"
            className={inputClass}
          />
          {/* Hiện lỗi ngay dưới ô, chỉ khi field này đang lỗi. */}
          {errors.name && <p className="mt-1 text-[11px] text-red-600">{errors.name}</p>}
        </div>

        {/* ---- NHÓM DỊCH VỤ + TRẠNG THÁI ----
            grid-cols-2 trên màn hình lớn (sm:), 1 cột trên điện thoại. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="service-category" className={labelClass}>
              Nhóm dịch vụ
            </label>
            {/* Giá trị rỗng '' tương ứng option "Chưa phân loại",
                tức khớp với category = null trong database. */}
            <select
              id="service-category"
              value={values.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className={inputClass}
            >
              <option value="">-- Chưa phân loại --</option>
              {/* Duyệt danh sách nhóm dịch vụ khai báo trong interfaces/IService.ts */}
              {SERVICE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="service-status" className={labelClass}>
              Trạng thái
            </label>
            <select
              id="service-status"
              value={values.status}
              // as ServiceStatus: giá trị từ <select> là string, cần ép kiểu
              // vì ServiceStatus chỉ nhận 'ACTIVE' | 'INACTIVE'.
              onChange={(e) =>
                handleChange('status', e.target.value as IServiceFormValues['status'])
              }
              className={inputClass}
            >
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
            </select>
          </div>
        </div>

        {/* ---- GIÁ CƠ BẢN + THỜI GIAN ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="service-price" className={labelClass}>
              Giá cơ bản (VNĐ) <span className="text-red-600">*</span>
            </label>
            <input
              id="service-price"
              // type="number": hiện bàn phím số trên điện thoại và chặn ký tự
              // không phải số ngay từ trình duyệt. Giá trị vẫn là string.
              type="number"
              // min=0: chặn nhập số âm ở tầng UI (vẫn cần validate vì có thể bypass).
              min={0}
              // step: bước nhảy của nút mũi tên tăng/giảm. 1000 vì giá dịch vụ
              // thường làm tròn nghìn.
              step={1000}
              value={values.base_price}
              onChange={(e) => handleChange('base_price', e.target.value)}
              placeholder="0"
              className={inputClass}
            />
            {/* Dòng xem trước: "750.000 ₫" cho admin biết khách sẽ thấy gì. */}
            {previewPrice && (
              <p className="mt-1 text-[11px] text-gray-400">Hiển thị: {previewPrice}</p>
            )}
            {errors.base_price && (
              <p className="mt-1 text-[11px] text-red-600">{errors.base_price}</p>
            )}
          </div>

          <div>
            <label htmlFor="service-duration" className={labelClass}>
              Thời gian (phút)
            </label>
            <input
              id="service-duration"
              type="number"
              min={1}
              step={5}
              value={values.estimated_minutes}
              onChange={(e) => handleChange('estimated_minutes', e.target.value)}
              placeholder="Ví dụ: 45"
              className={inputClass}
            />
            {errors.estimated_minutes && (
              <p className="mt-1 text-[11px] text-red-600">{errors.estimated_minutes}</p>
            )}
          </div>
        </div>

        {/* ---- MÔ TẢ ---- */}
        <div>
          <label htmlFor="service-description" className={labelClass}>
            Mô tả
          </label>
          <textarea
            id="service-description"
            rows={4}
            value={values.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Mô tả công việc thực hiện, vật tư có thể dùng thêm (giá thực tế chốt qua báo giá)."
            // resize-y: cho phép người dùng kéo giãn chiều cao ô bằng chuột,
            // nhưng không nhỏ hơn rows=4.
            className={`${inputClass} resize-y`}
          />
          {/* flex justify-between: đẩy bộ đếm ký tự sang bên phải cùng hàng với lỗi. */}
          <div className="mt-1 flex items-center justify-between">
            {errors.description ? (
              <p className="text-[11px] text-red-600">{errors.description}</p>
            ) : (
              // Rỗng thay vì null để giữ đúng chiều cao hàng, tránh nhảy layout.
              <span />
            )}
            <span className="text-[11px] text-gray-400">
              {values.description.length}/2000
            </span>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

/**
 * Component xuất ra ngoài — vòng cổng của file này.
 *
 * if (!open) return null là phần quan trọng nhất:
 *   Khi đóng, KHÔNG render ServiceFormBody -> component bị gỡ khỏi cây ->
 *   state trong form bị huỷ -> lần sau mở lại sẽ có state sạch.
 *
 * Hàm này nhận `open` làm prop (thay vì tự quản lý), để page cha kiểm soát
 * lúc nào modal được phép xuất hiện — ví dụ chỉ mở khi admin bấm nút Sửa.
 */
export default function ServiceFormModal({ open, service, onClose, onSubmit }: ServiceFormModalProps) {
  if (!open) return null;
  return <ServiceFormBody service={service} onClose={onClose} onSubmit={onSubmit} />;
}
