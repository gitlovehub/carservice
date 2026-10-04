/**
 * ============================================================================
 * INTERFACE DỊCH VỤ — mô tả "hình dạng" của một dịch vụ trong garage
 * ============================================================================
 *
 * Đây là HỢP ĐỒNG GIỮA FRONTEND VÀ BACKEND.
 * File này KHÔNG chứy logic, chỉ mô tả dữ liệu.
 *
 * Mục đích: mọi nơi trong code dùng tới dịch vụ đều dựa vào định nghĩa này.
 * Nếu API Laravel trả về đúng shape này thì UI không cần sửa gì.
 *
 * Cấu trúc bảng `services` bên backend (xem file migration):
 *   backend/database/migrations/2026_09_24_084011_create_services_table.php
 */

// 1. Trạng thái của một dịch vụ.
//    Dùng union type thay vì `string` để TypeScript chặn những giá trị sai.
//    Viết `status: string` sẽ cho phép truyền "HONG" mà không báo lỗi.
export type ServiceStatus = 'ACTIVE' | 'INACTIVE';

/**
 * 2. Một dịch vụ hoàn chỉnh (đọc từ database).
 *
 * Đối chiếu từng field với migration:
 *   name               -> string(150)   tên dịch vụ
 *   category           -> string(100)   nullable -> có thể null
 *   description        -> text          nullable -> có thể null
 *   base_price         -> decimal(12,2) default 0
 *   estimated_minutes  -> integer       nullable -> có thể null
 *   status             -> string(20)    default 'ACTIVE'
 *   created_at/updated_at -> timestamps
 *
 * LƯU Ý QUAN TRỌNG về `base_price: number | string`:
 *   Laravel cast kiểu decimal sang STRING, nên API sẽ trả về "750000.00".
 *   Khi dùng phải ép về số: Number(base_price) — xem utils/format.ts.
 *   Viết `number | string` thay vì chỉ `string` để linh hoạt khi mock data
 *   dùng số thuần (12 trong mockServices.ts).
 */
export interface IService {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  base_price: number | string;
  estimated_minutes: number | null;
  status: ServiceStatus;
  // Dấu `?` = optional (không bắt buộc có).
  // Mock data chưa cần timestamps nhưng API thật sẽ trả về, nên để optional.
  created_at?: string;
  updated_at?: string;
}

/**
 * 3. Payload gửi lên API khi tạo mới / cập nhật.
 *
 * Omit<A, B> = lấy type A rồi BỎ các field trong B.
 * Khi POST/PUT, server tự sinh id và timestamps nên client không được gửi lên,
 * nếu gửi lên có thể bị backend từ chối.
 *
 * Hiện chưa dùng trong code Sprint 1 — để sẵn cho bước nối API.
 */
export type IServicePayload = Omit<IService, 'id' | 'created_at' | 'updated_at'>;

/**
 * 4. Dữ liệu form thêm/sửa dịch vụ.
 *
 * KHÁC IService Ở 2 ĐIỂM — đây là lý do phải có type riêng:
 *   a) Tất cả field là `string`, kể cả base_price và estimated_minutes.
 *      Vì giá trị của ô <input type="number"> luôn là string.
 *      Nếu khai báo là number, React sẽ báo lỗi khi onChange trả về string.
 *   b) category/description rỗng thì để '' chứ không null.
 *      Quy đổi sang null (cho API) là việc của page xử lý khi submit.
 *
 * Ranh giới này giúp tránh phải xử lý union type ở mọi chỗ trong form.
 */
export interface IServiceFormValues {
  name: string;
  category: string;
  description: string;
  base_price: string;
  estimated_minutes: string;
  status: ServiceStatus;
}

/**
 * 5. Danh sách nhóm dịch vụ dùng cho dropdown.
 *
 * `as const` giữ nguyên kiểu chữ literal của từng phần tử, nên nếu sau này
 * IService.category đổi thành union type, TS sẽ bắt lỗi nếu có nhóm mới
 * chưa nằm trong khai báo category ở phía backend.
 *
 * Lưu ý: backend migration để category là string(100) tự do, chưa có bảng
 * danh mục. Nếu nhóm muốn quản lý nhóm bằng database thì khai báo
 * category thành union type và đồng bộ với API /api/service-categories.
 */
export const SERVICE_CATEGORIES = [
  'Bảo dưỡng định kỳ',
  'Hệ thống động cơ',
  'Hệ thống phanh',
  'Hệ thống lái',
  'Hệ thống truyền động',
  'Điện – Điện tử',
  'Lốp – Bánh',
  'Điều hoà – Nội thất',
  'Sơn – Bảo dưỡng thân vỏ',
  'Khác',
] as const;

/**
 * 6. Giá trị khởi tạo của form khi tạo mới.
 *
 * Dùng chung một object constant thay vì viết literal trong component, để:
 *   - chỉ phải khai báo trạng thái rỗng ở một chỗ
 *   - mở form "Thêm dịch vụ" và bấm nút "Huỷ" luôn reset về đúng bộ rỗng này
 */
export const EMPTY_SERVICE_FORM: IServiceFormValues = {
  name: '',
  category: '',
  description: '',
  base_price: '',
  estimated_minutes: '',
  status: 'ACTIVE',
};
