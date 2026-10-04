import { useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import PackageTable from '../../components/PackageTable';
import PackageFormModal from '../../components/PackageFormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { StatCard } from '../../components/ui';
import { plusIcon } from '../../components/icons';
import { mockPackages, mockVehicleModels } from '../../mock/mockPackages';
import { mockServices } from '../../mock/mockServices';
import type { IPackage, IPackageFormValues } from '../../interfaces/IPackage';
import type { IService } from '../../interfaces/IService';
import { formatCurrency } from '../../utils/format';

/**
 * ============================================================================
 * TRANG QUẢN LÝ GÓI BẢO DƯỠNG
 * ============================================================================
 *
 * ĐÂY LÀ "TRUNG TÂM" CỦA MÀN HÌNH — mọi logic nằm ở đây:
 *   - giữ danh sách gói
 *   - tìm kiếm, lọc, phân trang
 *   - tính các con số thống kê
 *   - thêm / sửa / xoá / bật-tắt
 *
 * CÁC FILE KHÁC CHỈ LÀM MỘT VIỆC:
 *   AdminLayout      -> khung trang, header, menu
 *   PackageTable     -> vẽ bảng, tự tính tổng tiền/thời gian từng gói
 *   PackageFormModal -> thu thập dữ liệu, tự validate, gửi lên ở đây
 *   ConfirmDialog    -> hỏi lại trước khi xoá
 *   StatCard/StatusBadge/EmptyState -> mảnh giao diện nhỏ
 *
 * GÓI BẢO DƯỠNG PHỨC TẠP HƠN DỊCH VỤ Ở 3 ĐIỂM:
 *   1. Gói chứa NHIỀU dịch vụ (quan hệ N-N qua bảng trung gian
 *      maintenance_package_services), nên có thêm `services` trong mỗi gói.
 *   2. Gói áp dụng cho một model xe HOẶC cho mọi model xe, quyết định bằng
 *      `vehicle_model_id` có null hay không.
 *   3. Gói KHÔNG lưu sẵn giá và thời gian — hai con số này luôn được tính
 *      ra từ danh mục dịch vụ mỗi lần hiển thị (xem PackageTable.tsx).
 *
 * LUỒNG DỮ LIỆU (chiều điều khiển đi ngược chiều dữ liệu):
 *
 *   mockPackages (file tĩnh)
 *        |
 *        v  khởi tạo 1 lần
 *   useState<IPackage[]>
 *        |
 *        +-- keyword / scopeFilter / statusFilter / page   (bộ lọc)
 *        |
 *        v  useMemo lọc + phân trang
 *   filtered -> paged
 *        |
 *        +---> PackageTable     : packages={paged}      (đi xuống để vẽ)
 *        +---> PackageFormModal : services + models     (đi xuống để chọn)
 *        +---> StatCard         : các con số            (đi xuống để hiện)
 *
 *   Ngược lại, khi admin bấm nút:
 *   PackageTable --gọi callback--> các hàm handle* ở file này
 *        |
 *        v  setPackages(...)   cập nhật state
 *   useState đổi -> React render lại -> bảng vẽ lại từ đầu
 *
 * VÌ SAO DÙNG useState + hàm cập nhật thay vì useEffect gọi API:
 *   Sprint 1 chưa có API. Khi có API, thay dòng khởi tạo state bằng
 *   useEffect gọi fetch. Phần còn lại của file KHÔNG phải sửa.
 */

/** Số gói hiển thị mỗi trang. */
const PAGE_SIZE = 5;

/**
 * Phạm vi áp dụng cần lọc.
 *
 * 'ALL' là giá trị mặc định của <select>, không phải dữ liệu thật — vì vậy
 * mới tách 'ALL_MODELS' (áp dụng chung) và 'SELECTED_MODELS' (riêng model xe)
 * thay vì dùng chung kiểu với dữ liệu trong IPackage.
 */
type ScopeFilter = 'ALL' | 'ALL_MODELS' | 'SELECTED_MODELS';

/**
 * Class dùng chung cho ô nhập và ô chọn trên thanh công cụ.
 * Gom ra hằng để thanh lọc không bị dài dòng class lặp lại 3 lần.
 */
const toolbarClass =
  'px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all';

export default function PackageManagement() {
  // ======================================================================
  // PHẦN 1 — STATE: danh sách gói
  // ======================================================================

  /**
   * Dữ liệu gốc của màn hình. Hiện lấy từ file mock.
   *
   *   useState(() => mockPackages.map((pkg) => ({ ...pkg })))
   *
   * Vì sao lại bọc trong hàm (lazy initializer) thay vì viết thẳng:
   *     Nếu viết useState(mockPackages.map(pkg => ({...pkg}))) thì hàm map
   *     sẽ chạy lại ở MỌI lần render, tạo mảng mới mỗi lần dù state có
   *     đổi hay không. Truyền hàm thì chỉ chạy đúng một lần ở lần khởi tạo.
   *
   * Vì sao phải copy từng gói, không dùng thẳng mockPackages:
   *     Mảng trong module là hẳng bất biến về mặt tham chiếu. Khi gọi
   *     setPackages(...) React sẽ thay bằng mảng MỚI, nên mảng mock gốc
   *     không bị đụng tới — điều này cần thiết vì mockPackages được import
   *     chung, không nên một màn hình sửa dữ liệu của nơi khác.
   *
   *   Khi nối API:
   *     const [packages, setPackages] = useState<IPackage[]>([]);
   *     useEffect(() => { fetch(...).then(...) }, []);
   */
  const [packages, setPackages] = useState<IPackage[]>(() =>
    mockPackages.map((pkg) => ({ ...pkg })),
  );

  /**
   * Danh mục dịch vụ, dùng làm danh sách CHỌN trong modal và để PackageTable
   * tra tên/giá/thời gian của từng service_id khi tính tổng.
   *
   * Vì sao vẫn giữ thành state mà không import thẳng mockServices:
   *     Khi nối API, cần tải danh mục dịch vụ về để admin chọn. Tách sẵn
   *     state thì chỉ thay dòng khởi tạo, không phải sửa cấu trúc file.
   *
   * Dùng setter rỗng `const [services] = useState(...)` vì màn hình này
   * không bao giờ thêm/xoá dịch vụ — việc đó thuộc ServiceManagement.
   * Đây là cách nói "state nhưng read-only" rõ ràng cho người đọc.
   */
  const [services] = useState<IService[]>(() => mockServices.map((s) => ({ ...s })));

  // ======================================================================
  // PHẦN 2 — STATE: bộ lọc
  // ======================================================================
  // 3 state độc lập thay vì 1 object, vì chúng được cập nhật ở 3 chỗ khác nhau
  // và tách riêng thì mỗi nút chỉ đẩy vào đúng state của nó.
  const [keyword, setKeyword] = useState('');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Trang hiện tại, bắt đầu từ 1.
  const [page, setPage] = useState(1);

  // ======================================================================
  // PHẦN 3 — STATE: điều khiển modal và hộp thoại
  // ======================================================================
  // Cần 2 state thay vì 1 vì chúng phục vụ 2 mục đích khác nhau:
  //   formOpen -> modal có mở hay không
  //   editing  -> đang sửa gói nào (null = đang thêm mới)
  // Nếu gộp lại thành 1 object sẽ phải nhớ cập nhật cả 2 trong mọi hàm.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IPackage | null>(null);

  // Gói đang chờ xác nhận xoá. Dùng state thay vì hàm confirm() của
  // trình duyệt để mở được hộp thoại đẹp, đồng bộ giao diện.
  const [pendingDelete, setPendingDelete] = useState<IPackage | null>(null);

  // Nội dung thông báo nhỏ góc dưới bên phải sau khi thao tác.
  const [notice, setNotice] = useState<string | null>(null);

  // ======================================================================
  // PHẦN 4 — DỮ LIỆU ĐÃ TÍNH SẴN (useMemo)
  // ======================================================================
  // Nguyên tắc: tính 1 lần, thay vì tính lại trong JSX mỗi lần render.

  /**
   * Bảng tra giá dịch vụ theo id.
   *
   * Dùng Map để tra O(1). Cần bảng này ở đây vì:
   *   - thống kê "giá gói trung bình" phải cộng giá các dịch vụ trong gói
   *   - khi tạo gói mới, cần tìm tên model xe theo vehicle_model_id
   *
   * Map được nhớ lại nhờ useMemo: chỉ dựng lại khi `services` thay đổi,
   * tức là khi trang ServiceManagement đổi danh mục (khi nối API).
   */
  const priceById = useMemo(
    () => new Map(services.map((s) => [s.id, Number(s.base_price)])),
    [services],
  );

  /** Bảng tra model xe theo id, dùng ghi tên vào gói mới khi lưu. */
  const modelById = useMemo(
    () => new Map(mockVehicleModels.map((m) => [m.id, m])),
    [],
  );

  /**
   * Tổng giá của một gói = SUM(giá dịch vụ × số lượng).
   *
   * Cùng công thức với PackageTable, nhưng ở đây dùng cho thống kê.
   * Không lưu sẵn trong database: sửa giá dịch vụ là giá gói tự đổi theo,
   * không bao giờ lệch dữ liệu.
   *
   * ?? 0 phòng trường hợp gói tham chiếu service_id không còn tồn tại.
   */
  const totalOf = (pkg: IPackage) =>
    pkg.services.reduce(
      (sum, item) => sum + (priceById.get(item.service_id) ?? 0) * item.quantity,
      0,
    );

  /**
   * ÁP DỤNG BỘ LỌC -> danh sách gói phù hợp điều kiện.
   *
   *   packages (tất cả) -> filtered (đã lọc) -> paged (đã chia trang)
   *
   * Dùng useMemo vì đây là phép tính lặp qua mọi gói, chạy mỗi lần
   * gõ 1 ký tự. Có memo thì chỉ tính lại khi `packages`, `keyword`,
   * `scopeFilter` hoặc `statusFilter` thực sự đổi.
   */
  const filtered = useMemo(() => {
    // Chuẩn hoá từ khoá: bỏ khoảng trắng đầu/cuối và đưa về chữ thường,
    // để tìm "  CAMRY  " vẫn ra kết quả.
    const kw = keyword.trim().toLowerCase();

    return packages.filter((pkg) => {
      // Điều kiện 1: phạm vi áp dụng.
      // vehicle_model_id === null là "áp dụng chung", khác null là "riêng model".
      if (scopeFilter === 'ALL_MODELS' && pkg.vehicle_model_id !== null) return false;
      if (scopeFilter === 'SELECTED_MODELS' && pkg.vehicle_model_id === null) return false;

      // Điều kiện 2: trạng thái.
      if (statusFilter !== 'ALL' && pkg.status !== statusFilter) return false;

      // Điều kiện 3: từ khoá. Không có từ khoá thì mọi dòng đều qua.
      if (!kw) return true;

      // Tìm trong tên gói, mô tả và TÊN MODEL XE. Ô tìm kiếm cho phép
      // tìm cả 2 loại này vì admin thường nhớ "gói riêng cho Camry" chứ
      // không nhớ đúng tên gói.
      return (
        pkg.name.toLowerCase().includes(kw) ||
        (pkg.description ?? '').toLowerCase().includes(kw) ||
        (pkg.vehicle_model_name ?? '').toLowerCase().includes(kw)
      );
    });
  }, [packages, keyword, scopeFilter, statusFilter]);

  // ======================================================================
  // PHẦN 5 — PHÂN TRANG
  // ======================================================================

  /** Tổng số trang. Math.max(1, ...) để luôn có ít nhất 1 trang khi danh sách rỗng. */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  /**
   * Trang đang xem, đã kiểm soát trong khoảng hợp lệ.
   *
   * VÌ SAO CẦN safePage thay vì dùng thẳng `page`:
   *     Giả sử đang ở trang 3 (5 dòng/trang = 15 gói), admin bấm lọc
   *     INACTIVE khiến filtered còn 1 dòng -> chỉ còn 1 trang. Nếu dùng
   *     thẳng `page = 3` thì slice(10, 15) ra rỗng và bảng trống trơn dù
   *     có dữ liệu. safePage tự nhảy về 1.
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
   * avgPrice chỉ tính gói ACTIVE vì gói ngừng hoạt động không còn được
   * báo giá cho khách, tính vào sẽ ra con số không phản ánh giá thật.
   */
  const stats = useMemo(() => {
    const active = packages.filter((p) => p.status === 'ACTIVE');
    // Chia cho 0 sẽ ra NaN/Infinity, nên phải kiểm tra trước.
    const avgPrice =
      active.length > 0
        ? active.reduce((sum, p) => sum + totalOf(p), 0) / active.length
        : 0;
    // Gói áp dụng chung cho mọi model xe.
    const universal = packages.filter((p) => p.vehicle_model_id === null).length;
    return { active: active.length, avgPrice, universal };
    // totalOf dùng priceById nên phải khai báo cả priceById trong deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages, priceById]);

  // ======================================================================
  // PHẦN 6 — HÀM XỬ LÝ
  // ======================================================================

  /**
   * Trả toàn bộ bộ lọc về mặc định.
   * setPage(1) là BẮT BUỘC: nếu đang ở trang 3 mà xoá lọc, filtered bỗng
   * dài ra 2 trang, dữ liệu vẫn hiện nhưng người dùng tưởng bị nhảy trang.
   */
  const resetFilters = () => {
    setKeyword('');
    setScopeFilter('ALL');
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
   * setEditing(null) là bắt buộc: nếu admin sửa gói A xung bấm lại
   * "Tạo gói" mà quên xoá editing, modal sẽ mở ra đầy dữ liệu của A.
   */
  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  /** Mở modal ở chế độ SỬA: truyền gói cần sửa vào. */
  const openEdit = (pkg: IPackage) => {
    setEditing(pkg);
    setFormOpen(true);
  };

  /**
   * Nhận dữ liệu từ modal sau khi modal đã validate thành công.
   *
   * Dùng if/else trên `editing` để phân biệt 2 hành động:
   *   có editing -> CẬP NHẬT gói cũ (giữ nguyên id)
   *   không có   -> THÊM MỚI (sinh id mới)
   *
   * QUAN TRỌNG — chuyển đổi string -> number/null ở đây:
   *     Modal trả về IPackageFormValues, tứi mọi ô nhập đều là string vì
   *     <input> chỉ cho chuỗi. Nhưng IPackage cần đúng kiểu của database:
   *       vehicle_model_id:     Number(...) hoặc null nếu chọn "Mọi model xe"
   *       mileage_milestone:    Number(...) hoặc null nếu bỏ trống
   *       month_milestone:      Number(...) hoặc null nếu bỏ trống
   *       description:          hoặc chuỗi, hoặc null nếu rỗng
   *     Đây chính là ranh giới giữa "dữ liệu form" và "dữ liệu thực",
   *     và khi nối API thì khối chuyển đổi này được gửi lên server.
   */
  const handleSubmit = (values: IPackageFormValues) => {
    // Gom việc chuyển đổi string -> number/null vào 1 object cho gọn,
    // dùng chung cho cả nhánh sửa lẫn nhánh thêm.
    // ?? null là đúng vì cột nullable trong database.
    const payload = {
      // '' -> null = áp dụng chung cho mọi model xe.
      vehicle_model_id: values.vehicle_model_id ? Number(values.vehicle_model_id) : null,
      name: values.name,
      // '' -> null = gói không theo mốc km / không theo mốc tháng.
      mileage_milestone: values.mileage_milestone
        ? Number(values.mileage_milestone)
        : null,
      month_milestone: values.month_milestone ? Number(values.month_milestone) : null,
      description: values.description || null,
      status: values.status,
      // Copy từng phần tử để không giữ tham chiếu tới object trong state cha.
      services: values.services.map((item) => ({ ...item })),
    };

    if (editing) {
      // map(): tạo mảng mới, chỉ thay đúng gói có id khớp.
      // Không sửa tại chỗ vì sẽ làm mất tính bất biến của state.
      setPackages((prev) =>
        prev.map((pkg) => (pkg.id === editing.id ? { ...pkg, ...payload } : pkg)),
      );
      flash(`Đã cập nhật gói "${values.name}".`);
    } else {
      /**
       * Sinh id mới: lấy id lớn nhất đang có rồi cộng 1.
       *
       * Vì sao không dùng packages.length + 1:
       *       Sau khi xoá bản ghi giữa danh sách, length sẽ nhỏ lại và tạo
       *       trùng id với một dòng đang tồn tại. reduce + Math.max luôn đúng.
       *
       * Khi nối API thì id do database sinh (auto-increment), đoạn này bỏ đi.
       */
      const nextId = packages.reduce((max, p) => Math.max(max, p.id), 0) + 1;

      // Tìm tên model xe để ghi vào vehicle_model_name. Ở thực tế tên này
      // do backend đính kèm qua quan hệ belongsTo, nhưng khi chưa có API
      // thì tự tra từ danh sách model để bảng hiển thị đúng.
      const modelName =
        payload.vehicle_model_id === null
          ? null
          : (modelById.get(payload.vehicle_model_id)?.name ?? null);

      // Đặt gói mới LÊN ĐẦU: gói vừa tạo hiện ngay, không phải tìm tới
      // cuối bảng.
      setPackages((prev) => [
        {
          id: nextId,
          vehicle_model_name: modelName,
          ...payload,
        },
        ...prev,
      ]);

      // Về trang 1 để gói vừa tạo (đang ở đầu danh sách) hiện ra mắt.
      setPage(1);
      flash(`Đã tạo gói "${values.name}".`);
    }

    // Đóng modal và dọn trạng thái sửa sau khi lưu.
    setFormOpen(false);
    setEditing(null);
  };

  /**
   * Bật/tắt hoạt động một gói.
   *
   * Ghi đè đối lập trạng thái hiện tại: ACTIVE -> INACTIVE, ngược lại.
   * Nhãn thông báo đổi theo hành động sắp xảy ra để admin không phải đoán.
   */
  const handleToggleStatus = (pkg: IPackage) => {
    const next = pkg.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setPackages((prev) => prev.map((p) => (p.id === pkg.id ? { ...p, status: next } : p)));
    flash(
      next === 'ACTIVE'
        ? `Đã kích hoạt lại gói "${pkg.name}".`
        : `Đã ngừng hoạt động gói "${pkg.name}".`,
    );
  };

  /**
   * Xoá thật, chỉ chạy sau khi admin đã bấm xác nhận trong ConfirmDialog.
   *
   * Đặt pendingDelete = null để đóng hộp thoại.
   * Lưu ý khi nối API: nên gọi DELETE thật, và có thể bỏ gói khỏi state
   * ngay để phản hồi tức thì, rồi rollback nếu API báo lỗi.
   */
  const handleDelete = () => {
    if (!pendingDelete) return;
    setPackages((prev) => prev.filter((p) => p.id !== pendingDelete.id));
    flash(`Đã xoá gói "${pendingDelete.name}".`);
    setPendingDelete(null);
  };

  // ======================================================================
  // PHẦN 7 — RENDER
  // ======================================================================
  return (
    // Bọc trong AdminLayout: nhận title/description để hiện đầu trang,
    // và children (phần bên dưới) để chèn vào giữa khung.
    <AdminLayout
      title="Quản lý Gói bảo dưỡng"
      description="Gói gom nhiều dịch vụ thành một bộ, áp dụng chung hoặc riêng cho từng dòng xe."
    >
      {/* ---- HÀNG THỐNG KÊ ----
          grid-cols-2 trên điện thoại (2x2), 4 cột trên màn hình lớn. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Tổng số gói" value={String(packages.length)} />
        {/* accent: số liệu này đáng chú ý nên tô đỏ */}
        <StatCard label="Đang hoạt động" value={String(stats.active)} accent />
        <StatCard
          label="Giá gói trung bình"
          value={formatCurrency(Math.round(stats.avgPrice))}
          // hint giải thích công thức để admin không tưởng tính cả gói ngừng.
          hint="Chỉ tính gói đang hoạt động"
        />
        <StatCard
          label="Gói áp dụng chung"
          value={String(stats.universal)}
          hint="Dùng được cho mọi dòng xe"
        />
      </div>

      {/* ---- THANH CÔNG CỤ: tìm kiếm + lọc + nút tạo ----
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
            placeholder="Tìm theo tên gói, mô tả hoặc dòng xe..."
            className={`${toolbarClass} w-full`}
          />
        </div>

        {/* Lọc theo phạm vi áp dụng.
            Ở đây 2 giá trị "ALL_MODELS" / "SELECTED_MODELS" được dịch ra
            thành null / khác null trong useMemo, nên dropdown và dữ liệu
            không dùng chung một kiểu. */}
        <select
          value={scopeFilter}
          onChange={(e) => {
            // as ScopeFilter: giá trị từ <select> là string cần ép kiểu.
            setScopeFilter(e.target.value as ScopeFilter);
            setPage(1);
          }}
          className={`${toolbarClass} lg:w-56`}
        >
          <option value="ALL">Mọi phạm vi</option>
          <option value="ALL_MODELS">Áp dụng chung</option>
          <option value="SELECTED_MODELS">Riêng từng dòng xe</option>
        </select>

        {/* Lọc theo trạng thái */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE');
            setPage(1);
          }}
          className={`${toolbarClass} lg:w-40`}
        >
          <option value="ALL">Mọi trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="INACTIVE">Ngừng hoạt động</option>
        </select>

        {/* Nút tạo: nền đen, nổi bật nhất trên trang. */}
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-[0.99] cursor-pointer whitespace-nowrap"
        >
          {plusIcon}
          Tạo gói mới
        </button>
      </div>

      {/* ---- DÒNG BÁO ĐANG LỌC ----
          Chỉ hiện khi kết quả lọc khác tổng số, tức là bộ lọc đang có tác dụng.
          Tránh hiện thông tin vô nghĩa khi chưa bấm bộ lọc nào. */}
      {filtered.length !== packages.length && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[11px] text-gray-500">
            Đang lọc: <span className="font-semibold text-gray-700">{filtered.length}</span>/
            {packages.length} gói
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
          Truyền `paged` (đã lọc + đã phân trang), không phải `filtered`/`packages`.
          Cả `services` cũng được đưa xuống để PackageTable tự tra tên dịch vụ
          và tính tổng tiền/thời gian. 4 hàm callback truyền xuống: bảng chỉ
          gọi lại, không tự quyết định gì. */}
      <PackageTable
        packages={paged}
        services={services}
        onEdit={openEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={setPendingDelete}
        onCreate={openCreate}
      />

      {/* ---- PHÂN TRANG ----
          Chỉ hiện khi có nhiều hơn 1 trang, tránh chiếm chỗ vô nghĩa. */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 px-1">
          {/* Mô tả rõ đang xem đoạn nào: "6-10 trên 12".
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

      {/* ---- MODAL TẠO/SỬA ----
          open={formOpen} + pkg={editing}: PackageFormModal tự quyết định
          chế độ thêm hay sửa dựa trên pkg có null hay không.
          services truyền vào làm danh sách dịch vụ có thể chọn,
          mockVehicleModels làm danh sách dòng xe cho dropdown. */}
      <PackageFormModal
        open={formOpen}
        pkg={editing}
        services={services}
        vehicleModels={mockVehicleModels}
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
        title="Xoá gói bảo dưỡng"
        message={`Bạn có chắc muốn xoá gói "${pendingDelete?.name ?? ''}"? Các gói đang áp dụng cho xe sẽ không còn dùng gói này nữa.`}
        confirmLabel="Xoá gói"
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </AdminLayout>
  );
}