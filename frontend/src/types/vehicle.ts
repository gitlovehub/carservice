// Kiểu dữ liệu cho module Quản lý xe của khách.
// Khớp với bảng `vehicles` và tài liệu API (sheet "Danh sách API" > Vehicles).

export interface VehicleBrand {
  id: number
  name: string
}

export interface VehicleModel {
  id: number
  brand_id: number
  name: string
  body_type: string | null
}

export interface CustomerOption {
  id: number
  full_name: string
  phone: string
}

export interface Vehicle {
  id: number
  customer_id: number
  model_id: number
  variant: string | null
  year: number | null
  license_plate: string | null // có thể chưa có (xe mới)
  vin: string | null // có thể chưa nhập
  mileage: number | null
  note: string | null
}

/** Giá trị trong form: luôn là string để gắn trực tiếp vào <input>. */
export interface VehicleFormValues {
  customer_id: string
  model_id: string
  variant: string
  year: string
  license_plate: string
  vin: string
  mileage: string
  note: string
}

export type VehicleFieldErrors = Partial<Record<keyof VehicleFormValues, string>>

/** Payload gửi lên API (POST/PATCH /vehicles). Trường tùy chọn gửi null khi để trống. */
export type VehiclePayload = Omit<Vehicle, 'id'>

export interface VehicleQuery {
  search?: string
  customerId?: number | null
}
