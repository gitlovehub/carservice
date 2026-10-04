import type { ReactNode } from 'react'
import {
  CalendarIcon,
  CarIcon,
  ChevronDownIcon,
  UsersIcon,
  WrenchIcon,
} from '../ui/icons'

// Khung giao diện quản lý gara: header + thanh tab.
// Sprint 1 chỉ có tab "Xe của khách" hoạt động; các tab khác là chỗ giữ cho module sau.

const tabs = [
  { key: 'customers', label: 'Khách hàng', icon: UsersIcon, active: false },
  { key: 'vehicles', label: 'Xe của khách', icon: CarIcon, active: true },
  { key: 'appointments', label: 'Lịch hẹn', icon: CalendarIcon, active: false },
  { key: 'repairs', label: 'Sửa chữa', icon: WrenchIcon, active: false },
]

export default function GarageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-ink text-white">
              <CarIcon className="size-6" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-tight">CarService</p>
              <p className="text-sm text-slate-500">Quản lý dịch vụ ô tô</p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Tài khoản nhân viên"
            className="flex items-center gap-3 rounded-xl border border-slate-200 py-1.5 pl-1.5 pr-3 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
              NV
            </span>
            <ChevronDownIcon className="size-4 text-slate-500" />
          </button>
        </div>

        <nav aria-label="Chức năng gara" className="mx-auto max-w-6xl overflow-x-auto px-4 pb-3 sm:px-6">
          <ul className="flex min-w-max gap-1">
            {tabs.map(({ key, label, icon: Icon, active }) => (
              <li key={key}>
                <button
                  type="button"
                  disabled={!active}
                  aria-current={active ? 'page' : undefined}
                  title={active ? undefined : 'Sắp có'}
                  className={
                    'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ' +
                    (active
                      ? 'bg-slate-100 text-ink'
                      : 'cursor-not-allowed text-slate-400')
                  }
                >
                  <Icon className="size-5" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
