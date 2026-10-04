import type { IService } from '../interfaces/IService';
import { StatusBadge, EmptyState } from './ui';
import { ActionButton } from './ActionButton';
import { editIcon, eyeIcon, trashIcon } from './icons';
import { formatCurrency, formatDuration } from '../utils/format';

/**
 * ============================================================================
 * BẢNG DANH SÁCH DỊCH VỤ
 * ============================================================================
 *
 * NHIỆM VỤ CỦA FILE NÀY:
 *   Chỉ lo PHẦN HIỂN THỊ: nhận mảng dịch vụ đã lọc sẵn và vẽ ra bảng.
 *   KHÔNG tự tìm kiếm, KHÔNG tự lọc, KHÔNG tự sắp xếp, KHÔNG giữ state.
 *
 * VÌ SAO TÁCH RIÊNG:
 *   Toàn bộ logic lọc/phân trang/thống kê nằm ở ServiceManagement.tsx.
 *   File này chỉ nhận 4 hàm callback. Nhờ vậy:
 *     - bảng không biết dữ liệu đến từ mock hay từ API
 *     - có thể tái sử dụng cùng bảng cho màn hình khác chỉ bằng cách truyền
 *       props khác (ví dụ bảng read-only không có nút sửa/xoá)
 *     - dễ kiểm thử: gọi hàm trên bảng, không cần dựng cả trang
 *
 * DÒNG DỮ LIỆU ĐẾN TỪ ĐÂY:
 *   ServiceManagement.tsx -> useState -> lọc keyword/category/status -> phân trang
 *   -> truyền `services={paged}` vào đây. File này chỉ vẽ, không tính lại.
 */

interface ServiceTableProps {
  // Danh sách ĐÃ lọc và ĐÃ phân trang. Thường chỉ 8-10 dòng mỗi lần.
  services: IService[];

  // 3 hàm callback mà bảng gọi khi admin bấm nút thao tác.
  // Bảng KHÔNG tự quyết định sẽ sửa/xoá thế nào — nó chỉ báo lên trên.
  onEdit: (service: IService) => void;
  onToggleStatus: (service: IService) => void;
  onDelete: (service: IService) => void;

  // Dùng cho EmptyState: khi không có dữ liệu, nút "Thêm dịch vụ" gọi hàm này.
  onCreate: () => void;
}

// Class dùng chung cho ô tiêu đề cột.
const thClass = 'px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide';

// Class dùng chung cho ô dữ liệu.
// align-middle: giữ chữ căn giữa khi một ô có 2 dòng (tên + mô tả).
const tdClass = 'px-4 py-3 text-xs text-gray-700 align-middle';

export default function ServiceTable({
  services,
  onEdit,
  onToggleStatus,
  onDelete,
  onCreate,
}: ServiceTableProps) {
  // Trường hợp không có dữ liệu: hiện EmptyState thay vì bảng trống rỗng.
  // Early return ở đầu component giúp phần JSX bảng bên dưới không cần
  // vòng if/else bao quanh.
  if (services.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <EmptyState
          title="Không có dịch vụ nào"
          description="Thử đổi bộ lọc hoặc tạo dịch vụ mới để bắt đầu danh mục."
          actionLabel="Thêm dịch vụ"
          onAction={onCreate}
        />
      </div>
    );
  }

  return (
    // rounded-2xl + overflow-hidden: bo 4 góc của thẻ bọc.
    // overflow-hidden quan trọng vì nó cắt luôn nền của <thead> ở 2 góc trên
    // sao cho khớp với bo tròn, thay vì bo từng dòng tiêu đề riêng.
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/*
        overflow-x-auto: cho phép cuộn ngang khi bảng rộng hơn màn hình.
        min-w-[820px] trên <table> là mức tối thiểu để 7 cột không bị dồn chữ.
        Nhờ vậy trên điện thoại bảng cuộn ngang thay vì bị bóp méo.
      */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          {/* bg-gray-50/70 + border-b: nền xám nhạt tách hàng tiêu đề
              khỏi nội dung, thay vì dùng đường kẻ đậm. */}
          <thead className="bg-gray-50/70 border-b border-gray-200">
            <tr>
              <th className={`${thClass} w-12`}>Mã</th>
              <th className={thClass}>Tên dịch vụ</th>
              <th className={thClass}>Nhóm</th>
              {/* text-right: cột tiền và cột số luôn căn phải để dễ so sánh
                  theo chiều dọc (đều mục vị trí hàng đơn vị). */}
              <th className={`${thClass} text-right`}>Giá cơ bản</th>
              <th className={`${thClass} text-right`}>Thời gian</th>
              <th className={thClass}>Trạng thái</th>
              <th className={`${thClass} text-right w-32`}>Thao tác</th>
            </tr>
          </thead>

          {/* divide-y: kẻ đường ngăn giữa các hàng mà không cần border trên
              từng <td> — khi bảng trống cũng không có đường thừa. */}
          <tbody className="divide-y divide-gray-100">
            {services.map((service) => (
              // key = id: React dùng để biết dòng nào thay đổi khi re-render,
              // nên phải là giá trị ổN ĐỊNH. Dùng chỉ số mảng sẽ sinh bug khi
              // xoá/xếp lại danh sách.
              <tr key={service.id} className="hover:bg-gray-50/60 transition-colors">
                {/* font-mono + padStart: mã dịch vụ căn thẳng hàng (001, 002...)
                    dễ quét bằng mắt. */}
                <td className={`${tdClass} text-gray-400 font-mono`}>
                  {String(service.id).padStart(3, '0')}
                </td>

                <td className={tdClass}>
                  <div className="font-semibold text-gray-900">{service.name}</div>
                  {/* line-clamp-2: mô tả dài chỉ hiện 2 dòng rồi cắt (...),
                      giữ chiều cao bảng ổn định không bị giãn theo nội dung.
                      max-w-xs giới hạn bề rộng để cột không chiếm hết bảng. */}
                  {service.description && (
                    <div className="mt-0.5 text-[11px] text-gray-500 line-clamp-2 max-w-xs">
                      {service.description}
                    </div>
                  )}
                </td>

                <td className={tdClass}>
                  {/* Nhóm dịch vụ hiện dạng chip (nhãn nhỏ bo tròn).
                      Nếu chưa phân loại (null) thì hiện "—" thay vì để trống,
                      vì ô trống trông như lỗi hiển thị. */}
                  {service.category ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-[11px] font-medium text-gray-600">
                      {service.category}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>

                <td className={`${tdClass} text-right font-semibold text-gray-900 whitespace-nowrap`}>
                  {formatCurrency(service.base_price)}
                </td>

                <td className={`${tdClass} text-right text-gray-600 whitespace-nowrap`}>
                  {formatDuration(service.estimated_minutes)}
                </td>

                <td className={tdClass}>
                  <StatusBadge status={service.status} />
                </td>

                <td className={`${tdClass} text-right whitespace-nowrap`}>
                  {/* inline-flex + gap-1: 3 nút nằm cạnh nhau, khoảng cách nhỏ.
                      Nhãn nút đổi theo trạng thái hiện tại để không bấm nhầm:
                      dịch vụ đang chạy thì nhãn là "Ngừng hoạt động". */}
                  <div className="inline-flex items-center gap-1">
                    <ActionButton label="Sửa dịch vụ" onClick={() => onEdit(service)}>
                      {editIcon}
                    </ActionButton>
                    <ActionButton
                      label={service.status === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
                      onClick={() => onToggleStatus(service)}
                    >
                      {eyeIcon}
                    </ActionButton>
                    <ActionButton
                      label="Xoá dịch vụ"
                      danger
                      onClick={() => onDelete(service)}
                    >
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
