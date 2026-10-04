import ModalShell from './ModalShell';

/**
 * ============================================================================
 * HỘP XÁC NHẬN — dùng trước khi xoá dữ liệu
 * ============================================================================
 *
 * VÌ SAO CẦN:
 *   Xoá dịch vụ/gói là thao tác không thể hoàn tác. Nếu bấm nhầm thì mất dữ liệu.
 *   Chặn bằng hộp thoại hỏi lại là bắt buộc trong mọi màn hình quản trị.
 *
 * Vì sao không dùng window.confirm của trình duyệt:
 *   Giao diện xấu, không đồng bộ với phần còn lại của hệ thống,
 *   và không kiểm soát được nội dung/nút bấm. Nên dựng modal riêng.
 *
 * DÙNG CHUNG: ServiceManagement.tsx, PackageManagement.tsx
 */

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  // Nội dung nhắc nhở, nên có tên cụ thể để người dùng biết đang xoá cái gì.
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    // Không truyền description và footer là mặc định -> chỉ hiện tiêu đề + thân + nút.
    <ModalShell
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          {/* Nút phụ: huỷ, nền xám, KHÔNG gọi onConfirm */}
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Huỷ bỏ
          </button>
          {/* Nút chính: nền đỏ vì đây là thao tác phá huỷ dữ liệu.
              Chỉ bấm mới thực sự gọi onConfirm. */}
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-[0.99] cursor-pointer"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {/* leading-relaxed: giãn dòng cho câu nhắc dài dễ đọc.
          Không truyền children phức tạp vì nội dung luôn chỉ là 1 đoạn chữ. */}
      <p className="text-xs text-gray-600 leading-relaxed">{message}</p>
    </ModalShell>
  );
}
