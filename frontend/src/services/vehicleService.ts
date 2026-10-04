// Service quản lý xe.
//
// Hiện tại dùng dữ liệu mẫu trong bộ nhớ (mock) vì API Vehicle chưa sẵn sàng.
// Khi có API, chỉ cần thay phần thân các hàm bên dưới bằng fetch tới:
//   GET    /api/vehicles?search=&customer_id=&page=
//   POST   /api/vehicles
//   PATCH  /api/vehicles/{id}
//   DELETE /api/vehicles/{id}
// Chữ ký hàm và kiểu trả về giữ nguyên nên UI không phải sửa.
// Lỗi 422 từ Laravel ({ errors: { field: [msg] } }) nên được chuyển thành VehicleApiError.

import { mockBrands, mockCustomers, mockModels, mockVehicles } from '../data/vehicleMock'
import type {
  CustomerOption,
  Vehicle,
  VehicleBrand,
  VehicleFieldErrors,
  VehicleModel,
  VehiclePayload,
  VehicleQuery,
} from '../types/vehicle'

export class VehicleApiError extends Error {
  fieldErrors: VehicleFieldErrors

  constructor(message: string, fieldErrors: VehicleFieldErrors = {}) {
    super(message)
    this.name = 'VehicleApiError'
    this.fieldErrors = fieldErrors
  }
}

const wait = (ms = 350) => new Promise<void>((resolve) => setTimeout(resolve, ms))

let store: Vehicle[] = mockVehicles.map((v) => ({ ...v }))
let nextId = Math.max(...store.map((v) => v.id)) + 1

/** Bỏ dấu tiếng Việt và đưa về chữ thường để tìm kiếm không phân biệt dấu. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
}

/** Chỉ giữ chữ và số, để "30A-123.45" khớp với "30a12345". */
const compact = (value: string) => normalizeText(value).replace(/[^a-z0-9]/g, '')

export async function listVehicles(query: VehicleQuery = {}): Promise<Vehicle[]> {
  await wait()
  const term = normalizeText(query.search ?? '')
  const termCompact = compact(query.search ?? '')

  return store.filter((v) => {
    if (query.customerId && v.customer_id !== query.customerId) return false
    if (!term) return true

    const customer = mockCustomers.find((c) => c.id === v.customer_id)
    const model = mockModels.find((m) => m.id === v.model_id)
    const brand = mockBrands.find((b) => b.id === model?.brand_id)

    const text = normalizeText(
      [customer?.full_name, customer?.phone, brand?.name, model?.name, v.variant, v.vin, v.note]
        .filter(Boolean)
        .join(' '),
    )
    if (text.includes(term)) return true
    return termCompact.length > 0 && compact(v.license_plate ?? '').includes(termCompact)
  })
}

function assertUnique(payload: VehiclePayload, ignoreId?: number) {
  const errors: VehicleFieldErrors = {}
  const others = store.filter((v) => v.id !== ignoreId)
  const { license_plate: plate, vin } = payload

  if (plate && others.some((v) => v.license_plate && compact(v.license_plate) === compact(plate))) {
    errors.license_plate = 'Biển số này đã tồn tại.'
  }
  if (vin && others.some((v) => v.vin && v.vin.toLowerCase() === vin.toLowerCase())) {
    errors.vin = 'Số VIN này đã tồn tại.'
  }
  if (Object.keys(errors).length > 0) {
    throw new VehicleApiError('Dữ liệu không hợp lệ.', errors)
  }
}

export async function createVehicle(payload: VehiclePayload): Promise<Vehicle> {
  await wait()
  assertUnique(payload)
  const vehicle: Vehicle = { id: nextId++, ...payload }
  store = [vehicle, ...store]
  return vehicle
}

export async function updateVehicle(id: number, payload: VehiclePayload): Promise<Vehicle> {
  await wait()
  const current = store.find((v) => v.id === id)
  if (!current) throw new VehicleApiError('Không tìm thấy xe.')
  assertUnique(payload, id)
  const updated: Vehicle = { ...current, ...payload }
  store = store.map((v) => (v.id === id ? updated : v))
  return updated
}

export async function deleteVehicle(id: number): Promise<void> {
  await wait(250)
  if (!store.some((v) => v.id === id)) throw new VehicleApiError('Không tìm thấy xe.')
  store = store.filter((v) => v.id !== id)
}

// Danh mục dùng cho dropdown. Tài liệu API hiện chưa có endpoint cho hãng/dòng xe
// (khách hàng đã có GET /customers) nên đây vẫn là dữ liệu mẫu.
export async function listCustomerOptions(): Promise<CustomerOption[]> {
  await wait(100)
  return mockCustomers
}

export async function listVehicleCatalog(): Promise<{
  brands: VehicleBrand[]
  models: VehicleModel[]
}> {
  await wait(100)
  return { brands: mockBrands, models: mockModels }
}
