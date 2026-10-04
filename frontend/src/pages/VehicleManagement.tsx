import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import GarageLayout from '../components/layout/GarageLayout'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { CarIcon, CheckIcon, ChevronDownIcon, FilterIcon, PlusIcon, SearchIcon } from '../components/ui/icons'
import VehicleFormModal from '../components/vehicles/VehicleFormModal'
import VehicleList from '../components/vehicles/VehicleList'
import {
  createVehicle,
  deleteVehicle,
  listCustomerOptions,
  listVehicleCatalog,
  listVehicles,
  updateVehicle,
} from '../services/vehicleService'
import type {
  CustomerOption,
  Vehicle,
  VehicleBrand,
  VehicleModel,
  VehiclePayload,
} from '../types/vehicle'

type FormState = { open: false } | { open: true; vehicle: Vehicle | null }

export default function VehicleManagement() {
 
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [brands, setBrands] = useState<VehicleBrand[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])

  // Bộ lọc: "draft" là giá trị đang nhập, "applied" chỉ đổi khi bấm Tìm kiếm.
  const [searchDraft, setSearchDraft] = useState('')
  const [customerDraft, setCustomerDraft] = useState('')
  const [applied, setApplied] = useState<{ search: string; customerId: number | null }>({
    search: '',
    customerId: null,
  })

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([listCustomerOptions(), listVehicleCatalog()]).then(([c, catalog]) => {
      if (cancelled) return
      setCustomers(c)
      setBrands(catalog.brands)
      setModels(catalog.models)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const loadVehicles = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      setVehicles(await listVehicles({ search: applied.search, customerId: applied.customerId }))
    } catch {
      setLoadError('Không tải được danh sách xe. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [applied])

  useEffect(() => {
    
    void loadVehicles()
  }, [loadVehicles])

  
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const customerNames = useMemo(() => new Map(customers.map((c) => [c.id, c.full_name])), [customers])
  const brandNames = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands])
  const modelsById = useMemo(() => new Map(models.map((m) => [m.id, m])), [models])

  const getCustomerName = (id: number) => customerNames.get(id) ?? `Khách #${id}`
  const getModelLabel = (id: number) => {
    const model = modelsById.get(id)
    if (!model) return `Dòng xe #${id}`
    return `${brandNames.get(model.brand_id) ?? ''} ${model.name}`.trim()
  }

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setApplied({
      search: searchDraft.trim(),
      customerId: customerDraft ? Number(customerDraft) : null,
    })
  }

  const handleSubmitForm = async (payload: VehiclePayload) => {
    if (!form.open) return
    if (form.vehicle) {
      await updateVehicle(form.vehicle.id, payload)
      setToast('Đã cập nhật thông tin xe.')
    } else {
      await createVehicle(payload)
      setToast('Đã thêm xe mới.')
    }
    setForm({ open: false })
    await loadVehicles()
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteVehicle(deleteTarget.id)
      setToast('Đã xóa xe.')
      setDeleteTarget(null)
      await loadVehicles()
    } catch {
      setToast('Không thể xóa xe. Vui lòng thử lại.')
    } finally {
      setDeleting(false)
    }
  }

  const closeForm = useCallback(() => setForm({ open: false }), [])
  const cancelDelete = useCallback(() => setDeleteTarget(null), [])

  const fieldBase =
    'w-full rounded-xl border border-slate-200 bg-white text-sm text-ink focus:outline-2 focus:outline-offset-0 focus:outline-ink'

  return (
    <GarageLayout>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Gara / Xe của khách</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Quản lý xe của khách</h1>
      <p className="mt-2 text-base text-slate-500">Tra cứu xe và lịch sử bảo dưỡng của khách hàng tại gara.</p>

      <button
        type="button"
        onClick={() => setForm({ open: true, vehicle: null })}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <PlusIcon className="size-5" />
        Thêm xe
      </button>

      {/* Tìm kiếm / lọc */}
      <section aria-labelledby="vehicle-search-title" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 id="vehicle-search-title" className="flex items-center gap-3 text-lg font-semibold">
          <SearchIcon className="size-5" />
          Tìm kiếm xe của khách
        </h2>

        <form onSubmit={handleSearch} className="mt-5 space-y-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Nhập từ khóa tìm kiếm xe của khách..."
              aria-label="Từ khóa tìm kiếm xe"
              className={`${fieldBase} py-3.5 pl-12 pr-4 placeholder:text-slate-400`}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <FilterIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <select
                value={customerDraft}
                onChange={(e) => setCustomerDraft(e.target.value)}
                aria-label="Lọc theo chủ xe"
                className={`${fieldBase} appearance-none py-3.5 pl-12 pr-10`}
              >
                <option value="">Tất cả chủ xe</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            </div>

            <button
              type="submit"
              className="rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:min-w-40"
            >
              Tìm kiếm
            </button>
          </div>

          <p className="text-sm text-slate-500">
            Tìm theo chủ xe, hãng, dòng xe, biển số hoặc số VIN. Có thể gõ không dấu.
          </p>
        </form>
      </section>

      {/* Danh sách */}
      <section aria-labelledby="vehicle-list-title" className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 px-6 py-5">
          <h2 id="vehicle-list-title" className="flex items-center gap-3 text-lg font-semibold">
            <CarIcon className="size-6" />
            Danh sách xe của khách
          </h2>
          <p className="text-sm text-slate-500" aria-live="polite">
            {loading ? 'Đang tải...' : `${vehicles.length} kết quả`}
          </p>
        </div>

        {loadError ? (
          <div className="flex flex-col items-center gap-3 border-t border-slate-100 px-6 py-12 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadVehicles()}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <VehicleList
            vehicles={vehicles}
            loading={loading}
            getCustomerName={getCustomerName}
            getModelLabel={getModelLabel}
            onEdit={(vehicle) => setForm({ open: true, vehicle })}
            onDelete={setDeleteTarget}
          />
        )}
      </section>

      {form.open && (
        <VehicleFormModal
          vehicle={form.vehicle}
          customers={customers}
          brands={brands}
          models={models}
          defaultCustomerId={applied.customerId}
          onSubmit={handleSubmitForm}
          onClose={closeForm}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Xóa xe này?"
          message={`Xe ${getModelLabel(deleteTarget.model_id)}${
            deleteTarget.license_plate ? ` (${deleteTarget.license_plate})` : ''
          } của ${getCustomerName(deleteTarget.customer_id)} sẽ bị xóa khỏi danh sách.`}
          confirmLabel="Xóa xe"
          busy={deleting}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={cancelDelete}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm text-white shadow-lg"
        >
          <CheckIcon className="size-4" />
          {toast}
        </div>
      )}
    </GarageLayout>
  )
}
