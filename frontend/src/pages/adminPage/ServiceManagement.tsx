import { useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import ServiceTable from '../../components/ServiceTable';
import ServiceFormModal from '../../components/ServiceFormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { StatCard } from '../../components/ui';
import { plusIcon } from '../../components/icons';
import { mockServices } from '../../mock/mockServices';
import {
  SERVICE_CATEGORIES,
  type IService,
  type IServiceFormValues,
} from '../../interfaces/IService';
import { formatCurrency } from '../../utils/format';

/**
 * ============================================================================
 * TRANG QUẢN LÝ DANH MỤC DỊCH VỤ
 * ============================================================================
 *
 * ĐÂY LÀ "TRUNG TÂM" CỦA MÀN HÌNH — mọi logic nằm ở đây:
 *   - giữ danh sách dịch vụ
 *   - tìm kiếm, lọc, phân trang
 *   - tính các con số thống kê
 *   - thêm / sửa / xoá / bật-tắt
 *
 * CÁC FILE KHÁC CHỈ LÀM MỘT VIỆC:
 *   AdminLayout        -> khung trang, header, menu
 *   ServiceTable       -> vẽ bảng (nhận data đã lọc sẵn)
 *   ServiceFormModal   -> thu thập dữ liệu, tự validate, gửi lên ở đây
 *   ConfirmDialog      -> hỏi lại trước khi xoá
 *   StatCard/StatusBadge/EmptyState -> mảnh giao diện nhỏ
 *
 * LUỒNG DỮ LIỆU (chiều điều khiển đi ngược chiều dữ liệu):
 *
 *   mockServices (file tĩnh)
 *        |
 *        v  khởi tạo 1 lần
 *   useState<IService[]>
 *        |
 *        +-- keyword / categoryFilter / statusFilter / page   (bộ lọc)
 *        |
 *        v  useMemo lọc + phân trang
 *   filtered -> paged
 *        |
 *        +---> ServiceTable : services={paged}        (đi xuống để vẽ)
 *        +---> StatCard     : các con số             (đi xuống để hiện)
 *
 *   Ngược lại, khi admin bấm nút:
 *   ServiceTable --gọi callback--> các hàm handle* ở file này
 *        |
 *        v  setServices(...)   cập nhật state
 *   useState đổi -> React render lại -> bảng vẽ lại từ đầu
 *
 * VÌ SAO DÙNG useState + hàm cập nhật thay vì useEffect gọi API:
 *   Sprint 1 chưa có API. Khi có API, thay dòng khởi tạo state bằng
 *   useEffect gọi fetch. Phần còn lại của file KHÔNG phải sửa.
 */

/**
 * Số dòng hiển thị mỗi trang.
 * Đặt ở đầu file dưới dạng hằng để dễ đổi, và để logic phân trang
 * không lặp magic number ở nhiều chỗ.
 */
const PAGE_SIZE = 8;

/**
 * Kiểu của bộ lọc trạng thái.
 * Có thêm 'ALL' vì giá trị mặc định của <select> cần một giá trị
 * không trùng với 'ACTIVE'/'INACTIVE'.
 */
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

/**
 * Class dùng chung cho ô nhập và ô chọn trên thanh công cụ.
 * Gom ra hằng để thanh lọc không bị dài dòng class lặp lại 3 lần.
 */
const toolbarClass =
  'px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all';

export default function ServiceManagement() {
  // ======================================================================
  // PHẦN 1 — STATE: danh sách dịch vụ
  // ======================================================================

  /**
   * Dữ liệu gốc của màn hình. Hiện lấy từ file mock.
   *
   *   useState(mockServices)
   *
   * Vì sao copy chứ không dùng thẳng mockServices:
   *     Mảng trong module là hằng bất biến về mặt tham chiếu. Khi gọi
   *     setServices(...) React sẽ thay bằng mảng MỚI, nên mảng mock gốc
   *     không bị đụng tới — điều này cần thiết vì cả 2 trang đều import
   *     chung một file mock.
   *
   *   Khi nối API:
   *     const [services, setServices] = useState<IService[]>([]);
   *     useEffect(() => { fetch(...).then(...) }, []);
   */
  const [services, setServices] = useState<IService[]>(mockServices);

  // ======================================================================
  // PHẦN 2 — STATE: bộ lọc
  // ======================================================================
  // 4 state độc lập thay vì 1 object, vì chúng được cập nhật ở 4 chỗ khác nhau
  // và tách riêng thì mỗi nút chỉ đẩy vào đúng state của nó.
  const [keyword, setKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Trang hiện tại, bắt đầu từ 1.
  const [page, setPage] = useState(1);

  // ======================================================================
  // PHẦN 3 — STATE: điều khiển modal và hộp thoại
  // ======================================================================
  // Cần 2 state thay vì 1 vì chúng phục vụ 2 mục đích khác nhau:
  //   formOpen    -> modal có mở hay không
  //   editing     -> đang sửa dòng nào (null = đang thêm mới)
  // Nếu gộp lại thành 1 object sẽ phải nhớ cập nhật cả 2 trong mọi hàm.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IService | null>(null);

  // Dịch vụ đang chờ xác nhận xoá. Dùng state thay vì hàm confirm() của
  // trình duyệt để mở được hộp thoại đẹp, đồng bộ giao diện.
  const [pendingDelete, setPendingDelete] = useState<IService | null>(null);

  // Nội dung thông báo nhỏ góc dưới bên phải sau khi thao tác.
  const [notice, setNotice] = useState<string | null>(null);

  // ======================================================================
  // PHẦN 4 — DỮ LIỆU ĐÃ TÍNH SẴN (useMemo)
  // ======================================================================
  // Nguyên tắc: tính 1 lần, thay vì tính lại trong JSX mỗi lần render.

  /**
   * Danh sách NHÓM dịch vụ đang có thật trong dữ liệu.
   *
   * Vì sao không dùng thẳng SERVICE_CATEGORIES làm danh sách option:
   *     Nếu hiện cả 10 nhóm kể cả nhóm chưa có dịch vụ nào, admin bấm
   *     chọn nhóm đó sẽ ra bảng trống và tưởng lỗi.
   *     Nên chỉ hiện nhóm đang có dữ liệu; nhóm chưa dùng gom vào <optgroup>.
   *
   * new Set loại trùng, sort + localeCompare 'vi' để nhóm tiếng Việt
   * được sắp xếp đúng thứ tự bảng chữ cái.
   */
  const usedCategories = useMemo(() => {
    const names = services
      .map((s) => s.category)
      // Filter loại bỏ null TRƯỚC khi xử lý tiếp. Dùng type predicate
      // (c): c is string để TypeScript hiểu sau filter là chuỗi,
      // nếu không tsc sẽ báo "có thể là null".
      .filter((c): c is string => Boolean(c));
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [services]);

  /**
   * ÁP DỤNG BỘ LỌC -> danh sách dịch vụ phù hợp điều kiện.
   *
   *   services (tất cả) -> filtered (đã lọc) -> paged (đã chia trang)
   *
   * Dùng useMemo vì đây là phép tính lặp qua mọi dịch vụ, chạy mỗi lần
   * gõ 1 ký tự. Có memo thì chỉ tính lại khi `services`, `keyword`,
   * `categoryFilter` hoặc `statusFilter` thực sự đổi.
   */
  const filtered = useMemo(() => {
    // Chuẩn hoá từ khoá: bỏ khoảng trắng đầu/cuối và đưa về chữ thường,
    // để tìm "  PHANH  " vẫn ra kết quả.
    const kw = keyword.trim().toLowerCase();

    return services.filter((service) => {
      // Điều kiện 1: nhóm dịch vụ. 'ALL' = không lọc.
      if (categoryFilter !== 'ALL' && service.category !== categoryFilter) return false;

      // Điều kiện 2: trạng thái.
      if (statusFilter !== 'ALL' && service.status !== statusFilter) return false;

      // Điều kiện 3: từ khoá. Không có từ khoá thì mọi dòng đều qua.
      if (!kw) return true;

      // Tìm trong cả tên lẫn mô tả. toLowerCase để không phân biệt hoa thường.
      return (
        service.name.toLowerCase().includes(kw) ||
        (service.description ?? '').toLowerCase().includes(kw)
      );
    });
  }, [services, keyword, categoryFilter, statusFilter]);

  // ======================================================================
  // PHẦN 5 — PHÂN TRANG
  // ======================================================================

  /** Tổng số trang. Math.max(1, ...) để luôn có ít nhất 1 trang khi danh sách rỗng. */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  /**
   * Trang đang xem, đã kiểm soát trong khoảng hợp lệ.
   *
   * VÌ SAO CẦN safePage thay vì dùng thẳng `page`:
   *     Giả sử đang ở trang 3 (8 dòng/trang = 24 dịch vụ), admin bấm "Ngừng
   *     hoạt động" trên bộ lọc INACTIVE khiến filtered còn 2 dòng -> chỉ còn
   *     1 trang. Nếu dùng thẳng `page = 3` thì slice(16, 24) ra rỗng và bảng
   *     trống trơn dù có dữ liệu. safePage tự nhảy về 1.
   */
  const safePage = Math.min(page, totalPages);

  /**
   * Cắt đoạn của trang hiện tại ra khỏi filtered.
   * (safePage - 1) * PAGE_SIZE = số dòng bỏ qua trước trang này.
   */
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  /**
   * Các con số ở đầu trang.
   *
   * avgPrice chỉ tính dịch vụ ACTIVE vì dịch vụ ngừng hoạt động không còn
   * được báo giá cho khách, tính vào sẽ ra con số không phản ánh giá thật.
   */
  const stats = useMemo(() => {
    const active = services.filter((s) => s.status === 'ACTIVE');
    // Chia cho 0 sẽ ra NaN/Infinity, nên phải kiểm tra trước.
    const avgPrice =
      active.length > 0
        ? active.reduce((sum, s) => sum + Number(s.base_price), 0) / active.length
        : 0;
    const uncategorized = services.filter((s) => !s.category).length;
    return { active: active.length, avgPrice, uncategorized };
  }, [services]);

  // ======================================================================
  // PHẦN 6 — HÀM XỬ LÝ
  // ======================================================================

  /**
   * Trả toàn bộ bộ lọc về mặc định.
   * setPage(1) là BẮT BUỘC: nếu đang ở trang 3 mà xoá lọc, filtered bỗng
   * dài ra 5 trang, dữ liệu vẫn hiện nhưng người dùng tưởng bị nhảy trang.
   */
  const resetFilters = () => {
    setKeyword('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  /**
   * Hiện thông báo trong 2.5 giây rồi tự ẩn.
   *
   * window.setTimeout trả về một handle; lưu vào biến cục bộ là không cần,
   * vì thông báo luôn tự biến mất sau 2.5 giây, không cần huỷ.
   *
   * Lưu ý: khi đóng tab hoặc điều hướng, timer sẽ bị huỷ cùng trang —
   * đó là hành vi chấp nhận được với thông báo tự tắt.
   */
  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2500);
  };

  /**
   * Mở modal ở chế độ THÊM MỚI.
   * setEditing(null) là bắt buộc: nếu admin sửa dịch vụ A xong bấm lại
   * "Thêm dịch vụ" mà quên xoá editing, modal sẽ mở ra đầy dữ liệu của A.
   */
  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  /** Mở modal ở chế độ SỬA: truyền dịch vụ cần sửa vào. */
  const openEdit = (service: IService) => {
    setEditing(service);
    setFormOpen(true);
  };

  /**
   * Nhận dữ liệu từ modal sau khi modal đã validate thành công.
   *
   * Dùng if/else trên `editing` để phân biệt 2 hành động:
   *   có editing -> CẬP NHẬT dòng cũ (giữ nguyên id)
   *   không có   -> THÊM MỚI (sinh id mới)
   *
   * QUAN TRỌNG — chuyển đổi string -> number/null ở đây:
   *     Modal trả về IServiceFormValues, tức MỌI field đều là string vì
   *     <input> chỉ cho chuỗi. Nhưng IService cần đúng kiểu của database:
   *       base_price:         Number(...) hoặc 0 nếu bỏ trống
   *       estimated_minutes:  Number(...) hoặc null nếu bỏ trống
   *       category/description: hoặc chuỗi, hoặc null nếu rỗng
   *     Đây chính là ranh giới giữa "dữ liệu form" và "dữ liệu thực",
   *     và khi nối API thì khối chuyển đổi này được gửi lên server.
   */
  const handleSubmit = (values: IServiceFormValues) => {
    if (editing) {
      // map(): tạo mảng mới, chỉ thay đúng dòng có id khớp.
      // Không dùng map để sửa tại chỗ vì sẽ làm mất tính bất biến của state.
      setServices((prev) =>
        prev.map((service) =>
          service.id === editing.id
            ? {
                ...service,
                name: values.name,
                category: values.category || null,
                description: values.description || null,
                base_price: Number(values.base_price || 0),
                estimated_minutes: values.estimated_minutes
                  ? Number(values.estimated_minutes)
                  : null,
                status: values.status,
              }
            : service,
        ),
      );
      flash(`Đã cập nhật dịch vụ "${values.name}".`);
    } else {
      /**
       * Sinh id mới: lấy id lớn nhất đang có rồi cộng 1.
       *
       * Vì sao không dùng services.length + 1:
       *       Sau khi xoá bản ghi giữa danh sách, length sẽ nhỏ lại và tạo
       *       trùng id với một dòng đang tồn tại. reduce + Math.max luôn đúng.
       *
       * Khi nối API thì id do database sinh (auto-increment), đoạn này bỏ đi.
       */
      const nextId = services.reduce((max, s) => Math.max(max, s.id), 0) + 1;

      // Đặt bản ghi mới LÊN ĐẦU: dịch vụ vừa thêm hiện ngay, không phải
      // tìm tới cuối bảng.
      setServices((prev) => [
        {
          id: nextId,
          name: values.name,
          category: values.category || null,
          description: values.description || null,
          base_price: Number(values.base_price || 0),
          estimated_minutes: values.estimated_minutes ? Number(values.estimated_minutes) : null,
          status: values.status,
        },
        ...prev,
      ]);

      // Về trang 1 để dòng vừa thêm (đang ở đầu danh sách) hiện ra mắt.
      setPage(1);
      flash(`Đã thêm dịch vụ "${values.name}".`);
    }

    // Đóng modal và dọn trạng thái sửa sau khi lưu.
    setFormOpen(false);
    setEditing(null);
  };

  /**
   * Bật/tắt hoạt động một dịch vụ.
   *
   * Ghi đè đối lập trạng thái hiện tại: ACTIVE -> INACTIVE, ngược lại.
   * Nhãn thông báo đổi theo hành động sắp xảy ra để admin không phải đoán.
   */
  const handleToggleStatus = (service: IService) => {
    const next = service.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, status: next } : s)),
    );
    flash(
      next === 'ACTIVE'
        ? `Đã kích hoạt lại "${service.name}".`
        : `Đã ngừng hoạt động "${service.name}".`,
    );
  };

  /**
   * Xoá thật, chỉ chạy sau khi admin đã bấm xác nhận trong ConfirmDialog.
   *
   * Đặt pendingDelete = null để đóng hộp thoại.
   * Lưu ý khi nối API: nên gọi DELETE thật, và có thể bỏ dòng khỏi state
   * ngay để phản hồi tức thì, rồi rollback nếu API báo lỗi.
   */
  const handleDelete = () => {
    if (!pendingDelete) return;
    setServices((prev) => prev.filter((s) => s.id !== pendingDelete.id));
    flash(`Đã xoá dịch vụ "${pendingDelete.name}".`);
    setPendingDelete(null);
  };

  // ======================================================================
  // PHẦN 7 — RENDER
  // ======================================================================
  return (
    // Bọc trong AdminLayout: nhận title/description để hiện đầu trang,
    // và children (phần bên dưới) để chèn vào giữa khung.
    <AdminLayout
      title="Quản lý Dịch vụ"
      description="Danh mục dịch vụ garage dùng để tạo báo giá và gói bảo dưỡng."
    >
      {/* ---- HÀNG THỐNG KÊ ----
          grid-cols-2 trên điện thoại (2x2), 4 cột trên màn hình lớn. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Tổng dịch vụ" value={String(services.length)} />
        {/* accent: số liệu này đáng chú ý nên tô đỏ */}
        <StatCard label="Đang hoạt động" value={String(stats.active)} accent />
        <StatCard
          label="Giá cơ bản trung bình"
          value={formatCurrency(Math.round(stats.avgPrice))}
          // hint giải thích công thức để admin không tưởng tính cả dịch vụ ngừng.
          hint="Chỉ tính dịch vụ đang hoạt động"
        />
        <StatCard
          label="Chưa phân loại"
          value={String(stats.uncategorized)}
          hint="Cần bổ sung nhóm dịch vụ"
        />
      </div>

      {/* ---- THANH CÔNG CỤ: tìm kiếm + lọc + nút thêm ----
          flex-col trên điện thoại (xếp dọc), flex-row trên lg. */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        {/* flex-1: ô tìm kiếm chiếm hết khoảng trống còn lại */}
        <div className="flex-1">
          <input
            type="search"
            value={keyword}
            // Mỗi lần gọi onChange đều setPage(1): tìm trên trang 3 mà có
            // kết quả chỉ ở trang 1 sẽ ra bảng trống nếu không về trang đầu.
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên hoặc mô tả dịch vụ..."
            className={`${toolbarClass} w-full`}
          />
        </div>

        {/* Lọc theo nhóm. Chỉ hiện nhóm đang có dữ liệu + nhóm chưa dùng
            gom trong <optgroup> để không bấm nhầm ra bảng trống. */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className={`${toolbarClass} lg:w-52`}
        >
          <option value="ALL">Tất cả nhóm dịch vụ</option>
          {usedCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
          {/* Nhóm khai báo trong interface nhưng chưa có dịch vụ nào. */}
          {SERVICE_CATEGORIES.filter((c) => !usedCategories.includes(c)).length > 0 && (
            <optgroup label="Chưa có dịch vụ nào">
              {SERVICE_CATEGORIES.filter((c) => !usedCategories.includes(c)).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {/* Lọc theo trạng thái */}
        <select
          value={statusFilter}
          onChange={(e) => {
            // as StatusFilter: giá trị từ <select> là string cần ép kiểu.
            setStatusFilter(e.target.value as StatusFilter);
            setPage(1);
          }}
          className={`${toolbarClass} lg:w-40`}
        >
          <option value="ALL">Mọi trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="INACTIVE">Ngừng hoạt động</option>
        </select>

        {/* Nút thêm: nền đen, nổi bật nhất trên trang. */}
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-[0.99] cursor-pointer whitespace-nowrap"
        >
          {plusIcon}
          Thêm dịch vụ
        </button>
      </div>

      {/* ---- DÒNG BÁO ĐANG LỌC ----
          Chỉ hiện khi kết quả lọc khác tổng số, tức là bộ lọc đang có tác dụng.
          Tránh hiện thông tin vô nghĩa khi chưa bấm bộ lọc nào. */}
      {filtered.length !== services.length && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[11px] text-gray-500">
            Đang lọc: <span className="font-semibold text-gray-700">{filtered.length}</span>/
            {services.length} dịch vụ
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="text-[11px] font-medium text-gray-600 hover:text-gray-900 hover:underline cursor-pointer"
          >
            Xoá bộ lọc
          </button>
        </div>
      )}

      {/* ---- BẢNG ----
          Truyền `paged` (đã lọc + đã phân trang), không phải `filtered`/`services`.
          4 hàm callback truyền xuống: bảng chỉ gọi lại, không tự quyết định gì. */}
      <ServiceTable
        services={paged}
        onEdit={openEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={setPendingDelete}
        onCreate={openCreate}
      />

      {/* ---- PHÂN TRANG ----
          Chỉ hiện khi có nhiều hơn 1 trang, tránh chiếm chỗ vô nghĩa. */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 px-1">
          {/* Mô tả rõ đang xem đoạn nào: "21-28 trên 34".
              Giúp admin biết còn bao nhiêu dòng ngoài trang hiện tại. */}
          <span className="text-[11px] text-gray-500">
            Trang {safePage}/{totalPages} · hiển thị {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} trên {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            {/* disabled khi ở trang đầu/cuối: vừa chặn bấm vô ích,
                vừa làm nút mờ đi báo hiệu. */}
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setPage(safePage + 1)}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* ---- THÔNG BÁO NHỎ ----
          fixed bottom-right + z-40: nổi lên trên bảng nhưng DƯỚI modal (z-50),
          nên khi đang mở modal mà có thông báo cũ thì modal vẫn ở trên. */}
      {notice && (
        <div className="fixed bottom-5 right-5 z-40 px-4 py-3 bg-gray-900 text-white text-xs font-medium rounded-xl shadow-lg">
          {notice}
        </div>
      )}

      {/* ---- MODAL THÊM/SỬA ----
          open={formOpen} + service={editing}: ServiceFormModal tự quyết định
          chế độ thêm hay sửa dựa trên service có null hay không. */}
      <ServiceFormModal
        open={formOpen}
        service={editing}
        onClose={() => {
          // Đóng kèm xoá editing, nếu không lần mở sau sẽ còn dữ liệu cũ.
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />

      {/* ---- HỘP XÁC NHẬN XOÁ ----
          open={pendingDelete !== null}: đóng khi pendingDelete bị set về null.
          Lưu ý chỉ MỞ hộp thoại, chưa xoá gì — việc xoá do handleDelete thực hiện
          sau khi admin bấm nút xác nhận. */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Xoá dịch vụ"
        message={`Bạn có chắc muốn xoá "${pendingDelete?.name ?? ''}"? Gói bảo dưỡng đang chứa dịch vụ này cũng cần được cập nhật lại.`}
        confirmLabel="Xoá dịch vụ"
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </AdminLayout>
  );
}
