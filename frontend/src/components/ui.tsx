import type { ServiceStatus } from '../interfaces/IService';

/**
 * ============================================================================
 * CÁC THÀNH PHẦN NHỎ DÙNG CHUNG
 * ============================================================================
 * Gom 3 thứ nhỏ, đã dùng ở nhiều file vào 1 chỗ:
 *   1. StatusBadge   -> nhãn trạng thái ACTIVE/INACTIVE (dùng ở cả 2 bảng)
 *   2. EmptyState    -> màn hình trống khi không có dữ liệu
 *   3. StatCard      -> ô thống kê ở đầu trang
 *
 * Tại sao gộp chung 1 file thay vì tách 3 file:
 *   cả 3 đều rất nhỏ và luôn đi cùng nhau. Tách 3 file cho 3 thành phần
 *   20-30 dòng là phần nhiễu vô nghĩa. Nếu sau này chúng lớn lên thì tách ra.
 */

/**
 * ---------------------------------------------------------------------------
 * 1. STATUS BADGE
 * ---------------------------------------------------------------------------
 * Biểu từ "chỗ nào có nền/màu chữ" thành dữ liệu trong object.
 * Sau này thêm trạng thái mới (ví dụ 'PENDING') chỉ cần thêm 1 dòng ở đây,
 * không phải sửa lại các chỗ gọi.
 */
const statusConfig: Record<ServiceStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: 'Đang hoạt động',
    className: 'bg-green-50 text-green-700 ring-green-600/20',
  },
  INACTIVE: {
    label: 'Ngừng hoạt động',
    className: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  },
};

/**
 * Hiển thị trạng thái dịch vụ/gói.
 *
 * ring-1 ring-inset: viền mảnh bên trong (thay vì ring-2 viền ngoài trông nặng).
 * Inline-flex + gap-1.5: chấm tròn nằm cạnh chữ, căn giữa theo chiều cao.
 *
 * Nhận ServiceStatus thay vì string -> TS báo lỗi nếu truyền sai.
 * (Dùng chung type cho cả dịch vụ lẫn gói vì cả hai cùng quy ước ACTIVE/INACTIVE.)
 */
export function StatusBadge({ status }: { status: ServiceStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium ring-1 ring-inset ${config.className}`}
    >
      {/* Chấm tròn màu đi ngang trạng thái: xanh = đang chạy, xám = đã tắt.
          Giúp đọc nhanh khi quét bảng thay vì phải đọc chữ. */}
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'
        }`}
      />
      {config.label}
    </span>
  );
}

/**
 * ---------------------------------------------------------------------------
 * 2. EMPTY STATE
 * ---------------------------------------------------------------------------
 * Hiển thị khi danh sách rỗng: tìm kiếm không ra kết quả, hoặc chưa có dữ liệu.
 * Quan trọng vì bảng trống trơn khiến người dùng tưởng trang bị lỗi.
 *
 * actionLabel + onAction là tuỳ chọn: có thì hiện nút hành động
 * (ví dụ "Thêm dịch vụ" khi danh mục còn trống).
 */
interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="py-14 px-6 text-center">
      {/* Icon kính lúp gợi ý "không tìm thấy gì" */}
      <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-gray-100 text-gray-400 mb-3">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {/* max-w-sm + mx-auto: giữ câu mô tả không tràn quá rộng trên màn hình lớn */}
      <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-[0.99] cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * ---------------------------------------------------------------------------
 * 3. STAT CARD
 * ---------------------------------------------------------------------------
 * Ô số liệu ở đầu trang (tổng dịch vụ, đang hoạt động, giá trung bình...).
 *
 * accent: dùng màu đỏ cho con số cần nhấn mạnh (ví dụ số đang hoạt động).
 * hint: dòng chữ nhỏ dưới để giải thích con số đó lấy từ đâu, ví dụ
 *       "Chỉ tính dịch vụ đang hoạt động" — tránh admin hiểu nhầm công thức.
 */
interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}

export function StatCard({ label, value, hint, accent }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div className="text-[11px] font-medium text-gray-500">{label}</div>
      <div
        className={`mt-1.5 text-lg font-bold tracking-tight ${
          accent ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-gray-400">{hint}</div>}
    </div>
  );
}
