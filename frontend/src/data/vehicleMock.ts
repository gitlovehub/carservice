// Dữ liệu mẫu cho Sprint 1 (chưa có API Vehicle).
// Khách hàng và danh mục hãng/dòng xe lấy theo seeder trong backend,
// bổ sung thêm Toyota Vios cho khớp thiết kế.
// Cố ý để trống một số trường (biển số, VIN, năm SX, số km) để test các trường hợp thiếu dữ liệu.

import type { CustomerOption, Vehicle, VehicleBrand, VehicleModel } from '../types/vehicle'

export const mockBrands: VehicleBrand[] = [
  { id: 1, name: 'Toyota' },
  { id: 2, name: 'Honda' },
  { id: 3, name: 'BMW' },
  { id: 4, name: 'Mercedes-Benz' },
  { id: 5, name: 'Hyundai' },
  { id: 6, name: 'Kia' },
  { id: 7, name: 'Mazda' },
  { id: 8, name: 'Ford' },
]

export const mockModels: VehicleModel[] = [
  { id: 1, brand_id: 1, name: 'Vios', body_type: 'Sedan' },
  { id: 2, brand_id: 1, name: 'Camry', body_type: 'Sedan' },
  { id: 3, brand_id: 1, name: 'Corolla Cross', body_type: 'SUV' },
  { id: 4, brand_id: 2, name: 'Civic', body_type: 'Sedan' },
  { id: 5, brand_id: 2, name: 'CR-V', body_type: 'SUV' },
  { id: 6, brand_id: 3, name: '3 Series', body_type: 'Sedan' },
  { id: 7, brand_id: 4, name: 'C-Class', body_type: 'Sedan' },
  { id: 8, brand_id: 5, name: 'Accent', body_type: 'Sedan' },
  { id: 9, brand_id: 6, name: 'Seltos', body_type: 'SUV' },
  { id: 10, brand_id: 7, name: 'Mazda3', body_type: 'Sedan' },
  { id: 11, brand_id: 8, name: 'Ranger', body_type: 'Pickup' },
]

export const mockCustomers: CustomerOption[] = [
  { id: 1, full_name: 'Nguyễn Tiến Hiền', phone: '0912345678' },
  { id: 2, full_name: 'Trần Minh Tuấn', phone: '0987654321' },
  { id: 3, full_name: 'Lê Hoàng Nam', phone: '0901234567' },
  { id: 4, full_name: 'Phạm Thu Hà', phone: '0933445566' },
]

export const mockVehicles: Vehicle[] = [
  {
    id: 1,
    customer_id: 1,
    model_id: 1,
    variant: '1.5G CVT',
    year: 2022,
    license_plate: '30A-123.45',
    vin: 'RL4BB3F10N0012345',
    mileage: 32500,
    note: 'Bảo dưỡng định kỳ tại gara từ 2023.',
  },
  {
    id: 2,
    customer_id: 2,
    model_id: 5,
    variant: '1.5 Turbo L',
    year: 2021,
    license_plate: '29A-678.90',
    vin: null, // chưa có VIN
    mileage: 48200,
    note: null,
  },
  {
    id: 3,
    customer_id: 3,
    model_id: 10,
    variant: null,
    year: 2025,
    license_plate: null, // xe mới, chưa ra biển
    vin: null,
    mileage: null,
    note: 'Xe mới nhận, chưa đăng ký biển số.',
  },
  {
    id: 4,
    customer_id: 4,
    model_id: 9,
    variant: '1.4 Premium',
    year: null, // chưa rõ năm sản xuất
    license_plate: '30K-555.66',
    vin: 'KNAH3811BN7654321',
    mileage: 15000,
    note: null,
  },
  {
    id: 5,
    customer_id: 1,
    model_id: 11,
    variant: 'Wildtrak 2.0 Bi-Turbo',
    year: 2023,
    license_plate: '30H-246.80',
    vin: 'MNCLMFF40PW112233',
    mileage: 21800,
    note: 'Đã lắp thêm nắp thùng.',
  },
]
