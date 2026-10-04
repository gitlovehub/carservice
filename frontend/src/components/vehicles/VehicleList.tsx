import type { ReactNode } from 'react'
import type { Vehicle } from '../../types/vehicle'
import { CarIcon, PencilIcon, TrashIcon } from '../ui/icons'

interface VehicleListProps {
  vehicles: Vehicle[]
  loading: boolean
  getCustomerName: (customerId: number) => string
  getModelLabel: (modelId: number) => string
  onEdit: (vehicle: Vehicle) => void
  onDelete: (vehicle: Vehicle) => void
}

/** Trường chưa có dữ liệu hiển thị mờ, không để ô trống. */
function Missing() {
  return <span className="text-slate-400">Chưa cập nhật</span>
}

function orMissing(value: ReactNode | null | undefined) {
  return value === null || value === undefined || value === '' ? <Missing /> : value
}

const formatMileage = (km: number | null) =>
  km === null ? null : `${km.toLocaleString('vi-VN')} km`

function RowActions({
  vehicle,
  onEdit,
  onDelete,
}: Pick<VehicleListProps, 'onEdit' | 'onDelete'> & { vehicle: Vehicle }) {
  const base =
    'grid size-9 place-items-center rounded-lg text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink'
  const editBtn = base + ' hover:bg-slate-100 hover:text-ink'
  const deleteBtn = base + ' hover:bg-red-50 hover:text-red-600'
  return (
    <div className="flex justify-end gap-1">
      <button type="button" className={editBtn} aria-label="Sửa xe" title="Sửa" onClick={() => onEdit(vehicle)}>
        <PencilIcon className="size-[18px]" />
      </button>
      <button
        type="button"
        className={deleteBtn}
        aria-label="Xóa xe"
        title="Xóa"
        onClick={() => onDelete(vehicle)}
      >
        <TrashIcon className="size-[18px]" />
      </button>
    </div>
  )
}

export default function VehicleList(props: VehicleListProps) {
  const { vehicles, loading, getCustomerName, getModelLabel, onEdit, onDelete } = props

  if (loading) {
    return (
      <div className="space-y-3 px-6 py-6" aria-busy="true" aria-live="polite">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
        ))}
        <span className="sr-only">Đang tải danh sách xe...</span>
      </div>
    )
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400">
          <CarIcon className="size-6" />
        </div>
        <p className="font-medium text-ink">Không tìm thấy xe nào</p>
        <p className="max-w-sm text-sm text-slate-500">
          Thử đổi từ khóa hoặc chủ xe, hoặc bấm “Thêm xe” để đăng ký xe mới cho khách.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Desktop / tablet: bảng */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-y border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th scope="col" className="px-6 py-4">STT</th>
              <th scope="col" className="px-4 py-4">Chủ xe</th>
              <th scope="col" className="px-4 py-4">Xe / Dòng xe</th>
              <th scope="col" className="px-4 py-4">Biển số</th>
              <th scope="col" className="px-4 py-4">VIN</th>
              <th scope="col" className="px-4 py-4">Năm SX</th>
              <th scope="col" className="px-4 py-4 text-right">Số km</th>
              <th scope="col" className="px-6 py-4 text-right">
                <span className="sr-only">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vehicles.map((v, index) => (
              <tr key={v.id} className="hover:bg-slate-50/70">
                <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                <td className="px-4 py-4 font-semibold text-ink">{getCustomerName(v.customer_id)}</td>
                <td className="px-4 py-4">
                  <div className="text-ink">{getModelLabel(v.model_id)}</div>
                  {v.variant && <div className="text-xs text-slate-500">{v.variant}</div>}
                </td>
                <td className="whitespace-nowrap px-4 py-4 font-medium text-ink">
                  {orMissing(v.license_plate)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-slate-600">
                  {orMissing(v.vin)}
                </td>
                <td className="px-4 py-4">{orMissing(v.year)}</td>
                <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">
                  {orMissing(formatMileage(v.mileage))}
                </td>
                <td className="px-6 py-4">
                  <RowActions vehicle={v} onEdit={onEdit} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: thẻ */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {vehicles.map((v) => (
          <li key={v.id} className="space-y-3 px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{getModelLabel(v.model_id)}</p>
                <p className="text-sm text-slate-500">
                  {getCustomerName(v.customer_id)}
                  {v.variant ? ` · ${v.variant}` : ''}
                </p>
              </div>
              <RowActions vehicle={v} onEdit={onEdit} onDelete={onDelete} />
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Biển số</dt>
                <dd className="font-medium">{orMissing(v.license_plate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Năm SX</dt>
                <dd>{orMissing(v.year)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Số km</dt>
                <dd className="tabular-nums">{orMissing(formatMileage(v.mileage))}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">VIN</dt>
                <dd className="truncate font-mono text-xs">{orMissing(v.vin)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
