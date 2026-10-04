import { useEffect, type ReactNode } from 'react';

/**
 * ============================================================================
 * MODAL SHELL — lớp vỏ chung cho mọi hộp thoại
 * ============================================================================
 *
 * Chỉ lo phần "khung": nền tối, hộp trắng, tiêu đề, nút đóng, chân nút bấm.
 * Nội dung bên trong do component gọi (ServiceFormModal, ConfirmDialog...) tự
 * truyền vào qua props.children.
 *
 * Mục đích tách: xử lý phím Esc, khoá cuộn trang, backdrop... chỉ viết 1 lần.
 * Nếu không tách, mỗi modal phải tự viết lại useEffect đóng cửa sổ → dễ bug.
 */

interface ModalShellProps {
  // false -> trả về null, không render gì cả (tiết kiệm DOM).
  // Các modal con luôn truyền true vì chúng tự quyết định có render hay không.
  open: boolean;

  title: string;
  // Mô tả nhỏ dưới tiêu đề, tuỳ chọn.
  description?: string;

  // Hàm đóng. Truyền vào cả nút X, nền tối, và phím Esc — 3 lối thoát.
  onClose: () => void;

  // Khu vực nút bấm dưới cùng (Lưu/Huỷ). Không truyền thì ẩn cả chân modal.
  footer?: ReactNode;

  // md = hộp vừa (form 1 cột), lg = hộp rộng (form nhiều cột + danh sách).
  size?: 'md' | 'lg';

  children: ReactNode;
}

// Tra cứu nhanh class theo kích thước thay vì viết if/else trong JSX.
const sizeClass = {
  md: 'max-w-lg',
  lg: 'max-w-3xl',
};

export default function ModalShell({
  open,
  title,
  description,
  onClose,
  footer,
  size = 'md',
  children,
}: ModalShellProps) {
  /**
   * Đồng bộ với hệ thống bên ngoài React:
   *   1. Lắng nghe phím Esc để đóng modal
   *   2. Khoá cuộn body khi modal mở (nếu không, trang ngoài vẫn cuộn được
   *      và nhìn rất lỗi)
   *
   * return trong useEffect là CLEANUP: chạy khi modal đóng hoặc component
   * bị gỡ, để gỡ listener và trả lại trạng thái cuộn. Không có cleanup này thì
   * mỗi lần mở modal lại là thêm 1 listener, và body bị kẹt cuộn vĩnh viễn.
   */
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    // fixed inset-0 = phủ toàn màn hình.
    // flex items-start justify-center: canh giữa ngang, căn trên theo chiều dọc
    // overflow-y-auto + p-4: modal CAO hơn màn hình vẫn cuộn được thay vì bị cắt.
    // my-8: chừa chút khoảng trống trên/dưới khi modal dài.
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      {/*
        Lớp nền tối. onClick đóng modal (click ra ngoài để thoát).
        aria-hidden: đây là lớp trang trí, trình đọc màn hình không cần đọc,
        và nếu không ẩn thì trình đọc sẽ đọc nội dung trùng với nội dung modal.
      */}
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/*
        Hộp trắng. z-index cao hơn lớp nền nên nằm trên.
        relative + my-8: vì lớp nền dùng fixed còn hộp dùng normal flow,
        nên relative giữ hộp nằm đúng trong lớp flex bên ngoài.
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${sizeClass[size]} bg-white rounded-2xl shadow-xl border border-gray-200 my-8`}
      >
        {/* ===== ĐẦU MODAL: tiêu đề + nút X ===== */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{title}</h2>
            {description && <p className="mt-1 text-[11px] text-gray-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
          >
            {/* Icon X vẽ bằng SVG nội tuyến, không cần cài thư viện icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* ===== THÂN MODAL: nơi các component con đổ nội dung vào ===== */}
        <div className="px-6 py-5">{children}</div>

        {/* ===== CHÂN MODAL: nút bấm =====
            bg-gray-50/60 + border-t: tách vùng nút ra khỏi nội dung cho dễ nhìn.
            rounded-b-2xl: bo tròn 2 góc dưới khớp với bo của hộp.
            justify-end: nút nằm bên phải theo thông lệ. */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 bg-gray-50/60 border-t border-gray-100 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
