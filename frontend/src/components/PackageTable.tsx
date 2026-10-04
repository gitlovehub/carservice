import type { IPackage, IPackageServiceItem } from '../interfaces/IPackage';
import type { IService } from '../interfaces/IService';
import { StatusBadge, EmptyState } from './ui';
import { ActionButton } from './ActionButton';
import { editIcon, eyeIcon, trashIcon } from './icons';
import { formatCurrency, formatMilestone, formatNumber } from '../utils/format';

/**
 * ============================================================================
 * BẢNG DANH SÁCH GÓI BẢO DƯỠNG
 * ============================================================================
 *
 * CÙNG KIỂU VỚI ServiceTable.tsx:
 *   Chỉ vẽ bảng, không lọc, không tính toán lưu trữ state.
 *   Lọc/phân trang nằm ở PackageManagement.tsx.
 *
 * KHÁC ServiceTable Ở 2 ĐIỂM:
 *   1. Nhận thêm `services` vì mỗi gói chứa nhiều dịch vụ,
 *      cần tra tên/giá/thời gian của từng service_id để hiển thị.
 *   2. Phải TÍNH tổng giá gói ngay trong lúc vẽ, vì bảng packages trong
 *      database không lưu tổng giá (xem giải thích ở mock/mockPackages.ts).
 */

interface PackageTableProps {
  packages: IPackage[];

  // Danh sách dịch vụ đầy đủ, dùng tra cứu theo service_id.
  services: IService[];

  onEdit: (pkg: IPackage) => void;
  onToggleStatus: (pkg: IPackage) => void;
  onDelete: (pkg: IPackage) => void;
  onCreate: () => void;
}

const thClass = 'px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide';
const tdClass = 'px-4 py-3 text-xs text-gray-700 align-middle';

export default function PackageTable({
  packages,
  services,
  onEdit,
  onToggleStatus,
  onDelete,
  onCreate,
}: PackageTableProps) {
  // Trường hợp không có gói nào -> EmptyState thay vì bảng trống.
  if (packages.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <EmptyState
          title="Không có gói bảo dưỡng nào"
          description="Thử đổi bộ lọc hoặc tạo gói mới kèm danh sách dịch vụ đi kèm."
          actionLabel="Thêm gói bảo dưỡng"
          onAction={onCreate}
        />
      </div>
    );
  }

  /**
   * Tạo Map để tra cứu O(1) thay vì dùng services.find() trong vòng lặp.
   *
   * VÌ SAO CẦN:
   *   Mỗi dòng gói cần tên + giá của NHIỀU dịch vụ. Nếu dùng
   *   services.find(...) trong vòng lặp thì phải quét cả mảng mỗi lần:
   *   O(số gói × số dịch vụ). Với 100 gói × 100 dịch vụ là 10.000 lượt so sánh
   *   mỗi lần render. Map thì luôn O(1) không phụ thuộc số lượng.
   *
   * nameById:  tra tìm object dịch vụ để lấy estimated_minutes.
   * priceById: tra giá cơ bản để tính tổng giá gói.
   */
  const nameById = new Map(services.map((s) => [s.id, s]));
  const priceById = new Map(services.map((s) => [s.id, Number(s.base_price)]));

  /**
   * Tổng giá của 1 gói = SUM(giá dịch vụ × số lượng).
   * Không lưu sẵn trong database, luôn tính lúc chạy để giá dịch vụ
   * sửa là giá gói tự đổi theo, không bao giờ lệch dữ liệu.
   */
  const totalOf = (items: IPackageServiceItem[]) =>
    items.reduce((sum, i) => sum + (priceById.get(i.service_id) ?? 0) * i.quantity, 0);

  /**
   * Tổng thời gian dự kiến của gói = SUM(thời gian dịch vụ × số lượng).
   * Chỉ là ƯỚC TÍNH để admin tham khảo, không phải cam kết với khách
   * (thời gian thật còn phụ thuộc tình trạng xe và phụ tùng cần thay).
   */
  const durationOf = (items: IPackageServiceItem[]) =>
    items.reduce(
      (sum, i) => sum + (nameById.get(i.service_id)?.estimated_minutes ?? 0) * i.quantity,
      0,
    );

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* min-w-[900px]: 8 cột nhiều hơn bảng dịch vụ nên cần bề rộng tối thiểu lớn hơn */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50/70 border-b border-gray-200">
            <tr>
              <th className={`${thClass} w-12`}>Mã</th>
              <th className={thClass}>Tên gói</th>
              <th className={thClass}>Áp dụng cho</th>
              <th className={thClass}>Mốc bảo dưỡng</th>
              <th className={`${thClass} text-right`}>Số dịch vụ</th>
              <th className={`${thClass} text-right`}>Tổng giá</th>
              <th className={thClass}>Trạng thái</th>
              <th className={`${thClass} text-right w-32`}>Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {packages.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-gray-50/60 transition-colors">
                <td className={`${tdClass} text-gray-400 font-mono`}>
                  {String(pkg.id).padStart(3, '0')}
                </td>

                <td className={tdClass}>
                  <div className="font-semibold text-gray-900">{pkg.name}</div>
                  {/* line-clamp-2 + max-w-xs: mô tả cắt còn 2 dòng để
                      chiều cao hàng không nhảy theo độ dài mô tả. */}
                  {pkg.description && (
                    <div className="mt-0.5 text-[11px] text-gray-500 line-clamp-2 max-w-xs">
                      {pkg.description}
                    </div>
                  )}
                  {/* Dòng phụ nhỏ: gộp tổng thời gian vào chính ô tên gói
                      để tiết kiệm 1 cột bảng. */}
                  <div className="mt-1 text-[11px] text-gray-400">
                    Tổng thời gian ≈ {formatNumber(durationOf(pkg.services))} phút
                  </div>
                </td>

                <td className={tdClass}>
                  {/*
                    Phân biệt 2 trạng thái của vehicle_model_id:
                      null       -> "Mọi model xe", tô xanh indigo (áp dụng chung)
                      có giá trị  -> tên model xe cụ thể
                    Phải hiển thị khác nhau rõ rệt, nếu không admin dễ tưởng
                    mọi gói đều dành riêng cho một model.
                  */}
                  {pkg.vehicle_model_id === null ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-[11px] font-medium text-indigo-700">
                      Mọi model xe
                    </span>
                  ) : (
                    <span className="text-gray-700">
                      {/* Fallback: khi backend chưa trả tên model (chỉ có id)
                          thì hiện id thay vì để trống. */}
                      {pkg.vehicle_model_name ?? `Model #${pkg.vehicle_model_id}`}
                    </span>
                  )}
                </td>

                <td className={`${tdClass} whitespace-nowrap text-gray-600`}>
                  {/* Gom cả km và tháng vào 1 chuỗi: "10.000 km · 6 tháng".
                      Không có mốc nào thì formatMilestone trả về "—". */}
                  {formatMilestone(pkg.mileage_milestone, pkg.month_milestone)}
                </td>

                {/* "N hạng mục" thay vì chỉ số N: nói rõ đang đếm cái gì,
                    tránh admin hiểu nhầm là số lượng xe hay số phụ tùng. */}
                <td className={`${tdClass} text-right font-medium text-gray-700`}>
                  {pkg.services.length} hạng mục
                </td>

                <td className={`${tdClass} text-right font-semibold text-gray-900 whitespace-nowrap`}>
                  {formatCurrency(totalOf(pkg.services))}
                </td>

                <td className={tdClass}>
                  <StatusBadge status={pkg.status} />
                </td>

                <td className={`${tdClass} text-right whitespace-nowrap`}>
                  {/* 3 nút dùng component + icon chung từ ActionButton.tsx
                      và icons.tsx, y hệt ServiceTable nên hành vi và
                      màu sắc luôn nhất quán giữa 2 bảng. */}
                  <div className="inline-flex items-center gap-1">
                    <ActionButton label="Sửa gói" onClick={() => onEdit(pkg)}>
                      {editIcon}
                    </ActionButton>
                    <ActionButton
                      label={pkg.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
                      onClick={() => onToggleStatus(pkg)}
                    >
                      {eyeIcon}
                    </ActionButton>
                    <ActionButton label="Xoá gói" danger onClick={() => onDelete(pkg)}>
                      {trashIcon}
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
