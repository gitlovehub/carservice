import type { ReactNode } from 'react';

/**
 * ============================================================================
 * NÚT THAO TÁC DÙNG CHUNG CHO CÁC BẢNG QUẢN TRỊ
 * ============================================================================
 *
 * VÌ SAO TÁCH THÀNH COMPONENT RIÊNG:
 *   Cả ServiceTable và PackageTable đều có 3 nút giống hệt nhau
 *   (sửa / bật-tắt / xoá), chỉ khác dữ liệu truyền vào. Nếu viết lặp ở mỗi file
 *   thì sửa kích thước hay màu hover phải sửa 2 chỗ và rất dễ quên chỗ thứ hai.
 *
 * FILE NÀY CHỈ EXPORT COMPONENT:
 *   Quy tắc react-refresh yêu cầu file export component thì không được export
 *   hằng. Vì vậy icon nằm ở file riêng (icons.tsx) chứ không đặt ở đây.
 */

/**
 * Nút icon nhỏ trong cột "Thao tác" của bảng.
 *
 * @param label  BẮT BUỘC. Icon trơn không tự mô tả được mình làm gì, nên cần:
 *                 - aria-label: trình đọc màn hình (dùng cho người khiếm
 *                   khả năng thị giác) sẽ đọc ra thay vì bỏ trống.
 *                 - title: hiện tooltip khi rê chuột cho người thị giác bình
 *                   thường.
 *               Bỏ label là mất khả năng tiếp cận, nên không cho phép bỏ trống
 *               bằng optional.
 * @param onClick Hàm xử lý khi bấm.
 *               Ở nơi dùng phải truyền kèm dữ liệu dòng, ví dụ:
 *                 onClick={() => onEdit(service)}
 *               Vì bảng không giữ state nên nó không tự biết đang sửa dòng nào.
 * @param danger  Đổi màu hover sang nền đỏ — CHỈ dùng cho nút Xoá.
 *               Tách thành tham số riêng thay vì nhét class vào từ nơi dùng,
 *               để không ai vô tình làm nút xoá xanh lá.
 * @param children Icon SVG cần hiển thị (import từ ./icons).
 */
export function ActionButton({
  label,
  onClick,
  children,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      // type="button" BẮT BUỘC: mặc định của <button> trong HTML là type="submit".
      // Nếu bảng sau này được đặt trong <form>, mọi nút thao tác sẽ vô tình
      // trở thành nút gửi form. Chỉ định rõ để an toàn.
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`w-7 h-7 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
        danger
          ? 'text-gray-400 hover:bg-red-50 hover:text-red-600'
          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
