import { useEffect, useId, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { VehicleApiError } from '../../services/vehicleService'
import type {
  CustomerOption,
  Vehicle,
  VehicleBrand,
  VehicleFieldErrors,
  VehicleFormValues,
  VehicleModel,
  VehiclePayload,
} from '../../types/vehicle'
import { CloseIcon } from '../ui/icons'

interface VehicleFormModalProps {
  /** null = thêm mới, có giá trị = sửa. */
  vehicle: Vehicle | null
  customers: CustomerOption[]
  brands: VehicleBrand[]
  models: VehicleModel[]
  /** Gợi ý chủ xe khi thêm mới (lấy từ bộ lọc đang chọn). */
  defaultCustomerId?: number | null
  onSubmit: (payload: VehiclePayload) => Promise<void>
  onClose: () => void
}

const MAX_YEAR = new Date().getFullYear() + 1

function toFormValues(vehicle: Vehicle | null, defaultCustomerId?: number | null): VehicleFormValues {
  return {
    customer_id: String(vehicle?.customer_id ?? defaultCustomerId ?? ''),
    model_id: vehicle ? String(vehicle.model_id) : '',
    variant: vehicle?.variant ?? '',
    year: vehicle?.year != null ? String(vehicle.year) : '',
    license_plate: vehicle?.license_plate ?? '',
    vin: vehicle?.vin ?? '',
    mileage: vehicle?.mileage != null ? String(vehicle.mileage) : '',
    note: vehicle?.note ?? '',
  }
}

/** Quy tắc kiểm tra khớp với validate của VehicleController (Laravel). */
function validateVehicle(v: VehicleFormValues): VehicleFieldErrors {
  const errors: VehicleFieldErrors = {}

  if (!v.customer_id) errors.customer_id = 'Vui lòng chọn chủ xe.'
  if (!v.model_id) errors.model_id = 'Vui lòng chọn hãng / dòng xe.'

  if (v.variant.trim().length > 100) errors.variant = 'Phiên bản tối đa 100 ký tự.'

  if (v.year.trim()) {
    const year = Number(v.year)
    if (!Number.isInteger(year) || year < 1900 || year > MAX_YEAR) {
      errors.year = `Năm sản xuất phải từ 1900 đến ${MAX_YEAR}.`
    }
  }

  if (v.license_plate.trim().length > 20) errors.license_plate = 'Biển số tối đa 20 ký tự.'
  if (v.vin.trim().length > 50) errors.vin = 'Số VIN tối đa 50 ký tự.'

  if (v.mileage.trim()) {
    const km = Number(v.mileage)
    if (!Number.isInteger(km) || km < 0) errors.mileage = 'Số km phải là số nguyên không âm.'
  }

  return errors
}

/** Chuỗi rỗng -> null để backend lưu NULL cho các trường tùy chọn. */
function toPayload(v: VehicleFormValues): VehiclePayload {
  const text = (s: string) => (s.trim() === '' ? null : s.trim())
  return {
    customer_id: Number(v.customer_id),
    model_id: Number(v.model_id),
    variant: text(v.variant),
    year: v.year.trim() === '' ? null : Number(v.year),
    license_plate: v.license_plate.trim() === '' ? null : v.license_plate.trim().toUpperCase(),
    vin: v.vin.trim() === '' ? null : v.vin.trim().toUpperCase(),
    mileage: v.mileage.trim() === '' ? null : Number(v.mileage),
    note: text(v.note),
  }
}

const inputClass =
  'w-full rounded-xl border bg-white px-4 py-3 text-sm text-ink placeholder:text-slate-400 focus:outline-2 focus:outline-offset-0 focus:outline-ink disabled:bg-slate-50'

interface FieldProps {
  id: string
  label: string
  required?: boolean
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}

function Field({ id, label, required, hint, error, className, children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export default function VehicleFormModal({
  vehicle,
  customers,
  brands,
  models,
  defaultCustomerId,
  onSubmit,
  onClose,
}: VehicleFormModalProps) {
  const uid = useId()
  const isEdit = vehicle !== null
  const [values, setValues] = useState<VehicleFormValues>(() => toFormValues(vehicle, defaultCustomerId))
  const [errors, setErrors] = useState<VehicleFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const id = (name: keyof VehicleFormValues) => `${uid}-${name}`
  const err = (name: keyof VehicleFormValues) => errors[name]
  const describedBy = (name: keyof VehicleFormValues, hasHint = false) =>
    err(name) ? `${id(name)}-error` : hasHint ? `${id(name)}-hint` : undefined
  const borderFor = (name: keyof VehicleFormValues) =>
    err(name) ? 'border-red-400' : 'border-slate-200'

  // Khóa cuộn nền + đóng bằng phím Esc khi đang mở modal.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [submitting, onClose])

  const modelsByBrand = useMemo(
    () =>
      brands
        .map((brand) => ({ brand, items: models.filter((m) => m.brand_id === brand.id) }))
        .filter((group) => group.items.length > 0),
    [brands, models],
  )

  const handleChange =
    (name: keyof VehicleFormValues) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [name]: e.target.value }))
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
    }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const found = validateVehicle(values)
    setErrors(found)
    setFormError(null)
    if (Object.keys(found).length > 0) {
      // Đưa focus về ô lỗi đầu tiên.
      const first = Object.keys(found)[0] as keyof VehicleFormValues
      document.getElementById(id(first))?.focus()
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(toPayload(values))
    } catch (error) {
      if (error instanceof VehicleApiError) {
        setErrors(error.fieldErrors)
        setFormError(
          Object.keys(error.fieldErrors).length > 0
            ? 'Vui lòng kiểm tra lại các trường được đánh dấu.'
            : error.message,
        )
      } else {
        setFormError('Không thể lưu thông tin xe. Vui lòng thử lại.')
      }
      setSubmitting(false)
    }
  }

  const title = isEdit ? 'Sửa thông tin xe' : 'Thêm xe của khách'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        className="flex max-h-[94vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 id={`${uid}-title`} className="text-xl font-semibold text-ink">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Chỉ chủ xe và dòng xe là bắt buộc. Các thông tin còn lại có thể bổ sung sau.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-ink"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="grid gap-5 overflow-y-auto px-6 py-6 sm:grid-cols-2">
            {formError && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2"
              >
                {formError}
              </p>
            )}

            <Field id={id('customer_id')} label="Chủ xe" required error={err('customer_id')} className="sm:col-span-2">
              <select
                id={id('customer_id')}
                value={values.customer_id}
                onChange={handleChange('customer_id')}
                aria-invalid={!!err('customer_id')}
                aria-describedby={describedBy('customer_id')}
                autoFocus={!isEdit}
                className={`${inputClass} ${borderFor('customer_id')}`}
              >
                <option value="">Chọn khách hàng</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} — {c.phone}
                  </option>
                ))}
              </select>
            </Field>

            <Field id={id('model_id')} label="Hãng / Dòng xe" required error={err('model_id')}>
              <select
                id={id('model_id')}
                value={values.model_id}
                onChange={handleChange('model_id')}
                aria-invalid={!!err('model_id')}
                aria-describedby={describedBy('model_id')}
                className={`${inputClass} ${borderFor('model_id')}`}
              >
                <option value="">Chọn dòng xe</option>
                {modelsByBrand.map(({ brand, items }) => (
                  <optgroup key={brand.id} label={brand.name}>
                    {items.map((m) => (
                      <option key={m.id} value={m.id}>
                        {brand.name} {m.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>

            <Field id={id('variant')} label="Phiên bản" error={err('variant')} hint="Ví dụ: 1.5G CVT, 2.0 Turbo">
              <input
                id={id('variant')}
                type="text"
                value={values.variant}
                onChange={handleChange('variant')}
                maxLength={100}
                aria-invalid={!!err('variant')}
                aria-describedby={describedBy('variant', true)}
                className={`${inputClass} ${borderFor('variant')}`}
              />
            </Field>

            <Field
              id={id('license_plate')}
              label="Biển số"
              error={err('license_plate')}
              hint="Để trống nếu xe chưa có biển."
            >
              <input
                id={id('license_plate')}
                type="text"
                value={values.license_plate}
                onChange={handleChange('license_plate')}
                maxLength={20}
                placeholder="30A-123.45"
                autoCapitalize="characters"
                aria-invalid={!!err('license_plate')}
                aria-describedby={describedBy('license_plate', true)}
                className={`${inputClass} ${borderFor('license_plate')}`}
              />
            </Field>

            <Field id={id('vin')} label="Số VIN" error={err('vin')} hint="Để trống nếu chưa có.">
              <input
                id={id('vin')}
                type="text"
                value={values.vin}
                onChange={handleChange('vin')}
                maxLength={50}
                autoCapitalize="characters"
                aria-invalid={!!err('vin')}
                aria-describedby={describedBy('vin', true)}
                className={`${inputClass} ${borderFor('vin')} font-mono`}
              />
            </Field>

            <Field id={id('year')} label="Năm sản xuất" error={err('year')}>
              <input
                id={id('year')}
                type="number"
                inputMode="numeric"
                value={values.year}
                onChange={handleChange('year')}
                min={1900}
                max={MAX_YEAR}
                placeholder="2022"
                aria-invalid={!!err('year')}
                aria-describedby={describedBy('year')}
                className={`${inputClass} ${borderFor('year')}`}
              />
            </Field>

            <Field id={id('mileage')} label="Số km đã đi" error={err('mileage')}>
              <input
                id={id('mileage')}
                type="number"
                inputMode="numeric"
                value={values.mileage}
                onChange={handleChange('mileage')}
                min={0}
                placeholder="32000"
                aria-invalid={!!err('mileage')}
                aria-describedby={describedBy('mileage')}
                className={`${inputClass} ${borderFor('mileage')}`}
              />
            </Field>

            <Field id={id('note')} label="Ghi chú" className="sm:col-span-2">
              <textarea
                id={id('note')}
                rows={3}
                value={values.note}
                onChange={handleChange('note')}
                className={`${inputClass} ${borderFor('note')} resize-y`}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-ink hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-ink px-5 py-2.5 text-sm font-medium text-white hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
            >
              {submitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm xe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
