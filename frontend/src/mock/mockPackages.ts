import type { IPackage, IVehicleModelOption } from '../interfaces/IPackage';

/**
 * ============================================================================
 * DỮ LIỆU GIẢ CHO GÓI BẢO DƯỠNG + DANH SÁCH MODEL XE (Sprint 1)
 * ============================================================================
 *
 * GÓI BẢO DƯỠNG LÀ GÌ:
 *   Một dịch vụ lẻ (thay dầu, thay phanh) thì khách phải tự chọn từng mục.
 *   Gói bảo dưỡng = gom nhiều dịch vụ thành 1 bộ, khách chọn 1 click.
 *   Ví dụ "Gói bảo dưỡng cơ bản 10.000 km" gồm 3 dịch vụ, tổng 1.180.000 ₫.
 *
 * CẤU TRÚC MỘT GÓI:
 *   - vehicle_model_id = null  -> áp dụng chung cho mọi model xe
 *   - vehicle_model_id = <id>   -> chỉ dành riêng cho model xe đó
 *   - mileage_milestone / month_milestone = mốc bảo dưỡng, có thể null
 *   - services = danh sách { service_id, quantity } tham chiếu sang mockServices
 *
 * LƯU Ý VỀ `services`:
 *   Đây là dữ liệu MÔ PHỎNG bảng trung gian maintenance_package_services.
 *   Tổng giá gói KHÔNG được lưu sẵn mà tính lúc chạy:
 *   tổng = SUM(base_price của service * quantity)
 *   Nhờ vậy khi admin sửa giá dịch vụ thì giá gói tự đổi theo, không lệch dữ liệu.
 *
 * KHI NỐI API THẬT:
 *   Thay mock bằng GET /api/maintenance-packages (backend đã có sẵn bảng
 *   maintenance_packages + maintenance_package_services).
 */

/**
 * Model xe dùng cho dropdown chọn phạm vi áp dụng cho gói.
 *
 * Cần file này vì bảng maintenance_packages có khoá ngoại vehicle_model_id
 * trỏ sang bảng vehicle_models. Chọn model xe là chọn khoá ngoại đó.
 *
 * Có cả 2 thương hiệu (Toyota, Honda) và 6 model để dropdown
 * kiểm tra được việc hiển thị dạng "Toyota Camry 2.5 HV".
 */
export const mockVehicleModels: IVehicleModelOption[] = [
  { id: 1, name: 'Camry 2.5 HV', brand_name: 'Toyota' },
  { id: 2, name: 'Vios 1.5', brand_name: 'Toyota' },
  { id: 3, name: 'Civic 1.8', brand_name: 'Honda' },
  { id: 4, name: 'City 1.5', brand_name: 'Honda' },
  { id: 5, name: 'LUX A2.0', brand_name: 'Toyota' },
  { id: 6, name: 'Altis 1.8', brand_name: 'Toyota' },
];

/**
 * 5 gói bảo dưỡng, cố tình phủ đủ các tình huống để kiểm tra UI:
 *   id 1, 2 -> vehicle_model_id = null  (áp dụng chung)
 *   id 3    -> riêng cho Camry 2.5 HV (xe hybrid, có gói chuyên biệt)
 *   id 4    -> riêng cho Civic 1.8 và đang INACTIVE (kiểm tra lọc trạng thái)
 *   id 5    -> không có mốc km lẫn tháng (kiểm tra formatMilestone trả về "—")
 *   id 3    -> có 1 dịch vụ quantity = 2 (kiểm tra nhân số lượng)
 */
export const mockPackages: IPackage[] = [
  {
    id: 1,
    vehicle_model_id: null,
    vehicle_model_name: null,
    name: 'Gói bảo dưỡng cơ bản 10.000 km',
    mileage_milestone: 10000,
    month_milestone: 6,
    description: 'Gói dành cho mọi xe, gồm các hạng mục thay thế bắt buộc định kỳ.',
    status: 'ACTIVE',
    services: [
      { service_id: 1, quantity: 1 },
      { service_id: 6, quantity: 1 },
      { service_id: 12, quantity: 1 },
    ],
    created_at: '2026-09-24T10:00:00.000000Z',
    updated_at: '2026-09-24T10:00:00.000000Z',
  },
  {
    id: 2,
    vehicle_model_id: null,
    vehicle_model_name: null,
    name: 'Gói bảo dưỡng mở rộng 30.000 km',
    mileage_milestone: 30000,
    month_milestone: 12,
    description: 'Bổ sung nhóm hệ thống phanh và truyền động cho xe chạy nhiều.',
    status: 'ACTIVE',
    services: [
      { service_id: 1, quantity: 1 },
      { service_id: 3, quantity: 1 },
      { service_id: 4, quantity: 1 },
      { service_id: 5, quantity: 1 },
      { service_id: 6, quantity: 1 },
      { service_id: 12, quantity: 1 },
    ],
    created_at: '2026-09-24T10:05:00.000000Z',
    updated_at: '2026-09-24T10:05:00.000000Z',
  },
  {
    // Gói riêng cho xe hybrid: có cân bằng động quantity = 2
    // (đây là lý do tồn tại cột quantity trong bảng trung gian).
    id: 3,
    vehicle_model_id: 1,
    vehicle_model_name: 'Camry 2.5 HV',
    name: 'Gói bảo dưỡng xe hybrid Camry',
    mileage_milestone: 20000,
    month_milestone: null,
    description: 'Chuyên biệt cho hệ hybrid: kiểm tra pin, inverter và hệ thống phanh tái sinh.',
    status: 'ACTIVE',
    services: [
      { service_id: 1, quantity: 1 },
      { service_id: 2, quantity: 1 },
      { service_id: 4, quantity: 2 },
      { service_id: 7, quantity: 1 },
      { service_id: 9, quantity: 1 },
    ],
    created_at: '2026-09-24T10:10:00.000000Z',
    updated_at: '2026-09-24T10:10:00.000000Z',
  },
  {
    id: 4,
    vehicle_model_id: 3,
    vehicle_model_name: 'Civic 1.8',
    name: 'Gói bảo dưỡng tiêu chuẩn Civic',
    mileage_milestone: 15000,
    month_milestone: 6,
    description: 'Lịch bảo dưỡng khuyến nghị của hãng cho dòng Civic.',
    status: 'INACTIVE',
    services: [
      { service_id: 1, quantity: 1 },
      { service_id: 4, quantity: 1 },
      { service_id: 6, quantity: 1 },
      { service_id: 12, quantity: 1 },
    ],
    created_at: '2026-09-24T10:15:00.000000Z',
    updated_at: '2026-09-24T10:15:00.000000Z',
  },
  {
    // Gói không theo mốc km/tháng -> cột "Mốc bảo dưỡng" hiện "—"
    id: 5,
    vehicle_model_id: null,
    vehicle_model_name: null,
    name: 'Gói kiểm tra an toàn trước chuyến đi dài',
    mileage_milestone: null,
    month_milestone: null,
    description: 'Gói không theo mốc km, dành cho khách chuẩn bị đi xa.',
    status: 'ACTIVE',
    services: [
      { service_id: 4, quantity: 1 },
      { service_id: 12, quantity: 1 },
    ],
    created_at: '2026-09-24T10:20:00.000000Z',
    updated_at: '2026-09-24T10:20:00.000000Z',
  },
];
