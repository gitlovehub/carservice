/**
 * ============================================================================
 * INTERFACE GÓI BẢO DƯỠNG — mô tả "hình dạng" của một gói bảo dưỡng
 * ============================================================================
 *
 * Khác với Dịch vụ: một gói bảo dưỡng là TẬP HỢP nhiều dịch vụ.
 * Ví dụ "Gói bảo dưỡng cơ bản 10.000 km" = thay dầu + thay lọc gió + kiểm tra.
 *
 * Cấu trúc bảng bên backend:
 *   maintenance_packages                  -> maintenance_package_services
 *   2026_09_24_084032_create_..._packages      2026_09_24_084038_create_..._package_services
 */

// 1. Trạng thái gói: cùng quy ước ACTIVE/INACTIVE với dịch vụ.
//    Tách riêng type để sau này hai bên có thể khác nhau mà không ảnh hưởng.
export type PackageStatus = 'ACTIVE' | 'INACTIVE';

/**
 * 2. Một dòng trong bảng trung gian maintenance_package_services.
 *
 * Bảng này có khoá chính kép (package_id, service_id) và có thêm cột quantity
 * vì một gói có thể chứa CÙNG một dịch vụ nhiều lần
 * (ví dụ cân bằng động 2 lần trong 1 gói).
 */
export interface IPackageServiceItem {
  service_id: number;
  quantity: number;
}

/**
 * 3. Gói bảo dưỡng hoàn chỉnh (đọc từ database).
 *
 * Điểm cần hiểu: `vehicle_model_id` có 2 ý nghĩa khác nhau:
 *   - null            -> gói áp dụng CHUNG cho mọi model xe
 *   - có giá trị      -> gói CHỈ dành riêng cho model xe đó
 * Đây là thiết kế có chủ đích từ backend, không phải dữ liệu thiếu.
 */
export interface IPackage {
  id: number;
  vehicle_model_id: number | null;

  /**
   * Tên model xe để hiển thị lên bảng.
   * Không có trong database (lấy qua quan hệ Laravel `belongsTo`).
   * Dấu `?` vì khi chưa nối API thì chưa có tên.
   */
  vehicle_model_name?: string | null;

  name: string;

  // Mốc bảo dưỡng theo KM, ví dụ 10000 = bảo dưỡng mỗi 10.000 km.
  mileage_milestone: number | null;

  // Mốc bảo dưỡng theo tháng, ví dụ 6 = bảo dưỡng mỗi 6 tháng.
  // Cả hai đều nullable vì gói có thể chỉ theo km, chỉ theo tháng,
  // hoặc không theo mốc nào (gói kiểm tra trước chuyến đi).
  month_milestone: number | null;

  description: string | null;
  status: PackageStatus;

  // Danh sách dịch vụ kèm theo. Đây không phải cột trong database,
  // mà được backend load sẵn cùng gói (eager loading).
  services: IPackageServiceItem[];

  created_at?: string;
  updated_at?: string;
}

/**
 * 4. Payload gửi lên API khi tạo mới / cập nhật gói.
 * Bỏ id, tên model và timestamps — server tự lo.
 */
export type IPackagePayload = Omit<
  IPackage,
  'id' | 'vehicle_model_name' | 'created_at' | 'updated_at'
>;

/**
 * 5. Dữ liệu form thêm/sửa gói.
 *
 * Cùng lý do như IServiceFormValues: mọi input trả về string.
 * Thêm `services: IPackageServiceItem[]` vì form cho phép tick chọn dịch vụ
 * kèm số lượng ngay trong modal.
 */
export interface IPackageFormValues {
  // Rỗng = chưa chọn model = áp dụng chung. Quy đổi sang null khi submit.
  vehicle_model_id: string;
  name: string;
  mileage_milestone: string;
  month_milestone: string;
  description: string;
  status: PackageStatus;
  services: IPackageServiceItem[];
}

/**
 * 6. Model xe dùng cho dropdown chọn phạm vi áp dụng.
 *
 * `brand_name` được lấy từ bảng vehicle_brands (quan hệ brand_id).
 * Hiển thị "Toyota Camry 2.5 HV" giúp admin dễ chọn hơn là chỉ "Camry 2.5 HV".
 */
export interface IVehicleModelOption {
  id: number;
  name: string;
  brand_name: string;
}
