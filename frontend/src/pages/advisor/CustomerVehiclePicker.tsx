import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { FieldError, SearchInput } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { counterCustomerVehicles, searchCounter, type CounterCustomer, type CounterVehicle } from "../../services/workflowService";
import { useDebounced } from "../admin/kit/useDebounced";
import { NewCustomerFields, NewVehicleFields, VehicleChoiceList } from "./CounterFields";
import { emptyCustomerDraft, emptyVehicleDraft, vehicleTitle, type CounterPick } from "./counterForms";
import { card, Notice } from "./WorkflowUI";
import { errorText } from "./workflowFormat";

/**
 * Chọn khách + xe tại quầy (ADV-02/04): tìm theo SĐT / tên / biển số hoặc khách mới; xe có sẵn hoặc xe chưa có trong hệ thống.
 * `blockBusyVehicles`: tiếp nhận xe thì khóa xe đang có phiếu chưa xong; đặt lịch hộ thì không cần.
 */

type SearchResult = { key: string; customers: CounterCustomer[]; vehicles: CounterVehicle[]; error?: string };
type VehiclesResult = { customerId: number; list: CounterVehicle[]; error?: string };

export function CustomerVehiclePicker({ value, onChange, blockBusyVehicles = false, onVehiclesLoaded, errors = {}, onClearError }: {
  value: CounterPick; onChange: (next: CounterPick) => void; blockBusyVehicles?: boolean;
  /** Lỗi theo ô (pickProblems) và cách xoá lỗi khi người dùng sửa ô. */
  errors?: Record<string, string>; onClearError?: (...keys: string[]) => void;
  /** Danh sách xe của khách đã chọn (để nơi gọi biết dòng xe / xe đang bận). */
  onVehiclesLoaded?: (list: CounterVehicle[]) => void;
}) {
  const [query, setQuery] = useState("");
  const term = useDebounced(query.trim(), 350);
  const [found, setFound] = useState<SearchResult | null>(null);
  const [vehicles, setVehicles] = useState<VehiclesResult | null>(null);
  const { customer } = value;

  const searching = term.length >= 2 && found?.key !== term && customer === null;
  useEffect(() => {
    if (term.length < 2 || customer !== null) return;
    let active = true;
    searchCounter(term)
      .then(result => { if (active) setFound({ key: term, ...result }); })
      .catch(err => { if (active) setFound({ key: term, customers: [], vehicles: [], error: errorText(err) }); });
    return () => { active = false; };
  }, [term, customer]);

  const customerId = customer && customer !== "new" ? customer.id : null;
  const vehiclesLoading = customerId !== null && vehicles?.customerId !== customerId;
  useEffect(() => {
    if (customerId === null) return;
    let active = true;
    counterCustomerVehicles(customerId)
      .then(list => { if (active) { setVehicles({ customerId, list }); onVehiclesLoaded?.(list); } })
      .catch(err => { if (active) setVehicles({ customerId, list: [], error: errorText(err) }); });
    return () => { active = false; };
    // onVehiclesLoaded là callback của nơi gọi — chỉ tải lại khi đổi khách.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);
  const ownVehicles = (customerId !== null && vehicles?.customerId === customerId ? vehicles.list : [])
    .map(v => blockBusyVehicles ? v : { ...v, open_repair_order_code: null });

  const pick = (next: NonNullable<CounterPick["customer"]>, vehicleId: number | null = null) => {
    onClearError?.("customer", "vehicle");
    onChange({ ...value, customer: next, vehicleId, newVehicle: emptyVehicleDraft });
  };
  function startNew() {
    onClearError?.("customer", "vehicle");
    const digits = query.replace(/[^\d+]/g, "");
    const looksLikePlate = /\d/.test(query) && /[A-Za-z]/.test(query);
    onChange({
      customer: "new", vehicleId: "new",
      newCustomer: { ...emptyCustomerDraft, phone: digits.length >= 8 && !looksLikePlate ? digits : "", name: digits.length >= 8 || looksLikePlate ? "" : query.trim() },
      newVehicle: { ...emptyVehicleDraft, plate: looksLikePlate ? query.trim().toUpperCase() : "" },
    });
  }
  const reset = () => { onClearError?.("customer", "vehicle", "newName", "newPhone", "newEmail", "vehicleModel", "vehiclePlate", "vehicleYear", "vehicleVin"); onChange({ customer: null, vehicleId: null, newCustomer: emptyCustomerDraft, newVehicle: emptyVehicleDraft }); setVehicles(null); };

  const results = found?.key === term ? found : null;
  const hasResults = !!results && (results.customers.length > 0 || results.vehicles.length > 0);

  return <>
    <section className={card}>
      <h2 className="text-lg font-bold text-cs-text">Khách hàng</h2>
      {customer === null ? <>
        <p className="mt-1 text-small text-cs-muted">Tìm khách cũ theo số điện thoại, tên hoặc biển số xe. Không có thì thêm khách mới.</p>
        <div role="group" aria-label="Chọn khách hàng" aria-invalid={!!errors.customer || undefined} className={`mt-4 flex flex-wrap gap-3 ${errors.customer ? "rounded-xl border border-danger p-2" : ""}`}>
          <SearchInput value={query} onChange={next => { setQuery(next); onClearError?.("customer"); }} placeholder="SĐT, tên khách hoặc biển số…" label="Tìm khách hàng" className="min-w-64 flex-1"/>
          <Button variant="tonal" icon="plus" onClick={startNew}>Khách mới</Button>
        </div>
        <FieldError className="mt-1.5">{errors.customer}</FieldError>
        {term.length >= 2 && <div className="mt-3" aria-live="polite">
          {searching ? <p className="text-small text-cs-muted">Đang tìm…</p>
            : results?.error ? <Notice tone="error">{results.error}</Notice>
            : !hasResults ? <p className="text-small text-cs-muted">Không tìm thấy khách hay xe nào. Bấm <b>Khách mới</b> để tạo hồ sơ.</p>
            : <ul className="divide-y divide-cs-border overflow-hidden rounded-xl border border-cs-border">
              {results?.vehicles.filter(v => v.customer).map(v => <li key={`v${v.id}`}>
                <button type="button" onClick={() => v.customer && pick(v.customer, v.id)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-cs-hover">
                  <Icon name="car" size={18} className="text-cs-muted"/>
                  <span className="min-w-0 flex-1"><b className="tracking-wide text-cs-text">{v.license_plate}</b><span className="block truncate text-caption text-cs-muted">{vehicleTitle(v)} · {v.customer?.full_name} · {v.customer?.phone}</span></span>
                  <Icon name="chevron-right" size={16} className="text-cs-muted"/>
                </button>
              </li>)}
              {results?.customers.map(c => <li key={`c${c.id}`}>
                <button type="button" onClick={() => pick(c)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-cs-hover">
                  <Icon name="user" size={18} className="text-cs-muted"/>
                  <span className="min-w-0 flex-1"><b className="text-cs-text">{c.full_name}</b><span className="block truncate text-caption text-cs-muted">{c.phone}{c.email ? ` · ${c.email}` : ""}</span></span>
                  <Icon name="chevron-right" size={16} className="text-cs-muted"/>
                </button>
              </li>)}
            </ul>}
        </div>}
      </> : customer === "new" ? <div className="mt-4 space-y-3">
        <NewCustomerFields value={value.newCustomer} errors={errors} onClearError={key => onClearError?.(key)} onChange={newCustomer => onChange({ ...value, newCustomer })}/>
        <Button size="sm" variant="ghost" icon="arrow-left" onClick={reset}>Tìm khách có sẵn</Button>
      </div> : <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-cs-surface-2 px-4 py-3">
        <Icon name="user" size={18} className="text-cs-muted"/>
        <span className="min-w-0 flex-1"><b className="text-cs-text">{customer.full_name}</b><span className="block text-caption text-cs-muted">{customer.phone}{customer.email ? ` · ${customer.email}` : " · chưa có email"}</span></span>
        <Button size="sm" variant="ghost" onClick={reset}>Đổi khách</Button>
      </div>}
    </section>

    {customer !== null && <section className={card}>
      <h2 className="text-lg font-bold text-cs-text">Xe</h2>
      {customer === "new" ? <div className="mt-4"><NewVehicleFields atReception={blockBusyVehicles} value={value.newVehicle} errors={errors} onClearError={key => onClearError?.(key)} onChange={newVehicle => onChange({ ...value, newVehicle })}/></div> : <div className="mt-4">
        {vehiclesLoading ? <p className="text-small text-cs-muted">Đang tải xe của khách…</p>
          : vehicles?.error ? <Notice tone="error">{vehicles.error}</Notice>
          : <VehicleChoiceList atReception={blockBusyVehicles} name="counter-vehicle" errors={errors} onClearError={key => onClearError?.(key)} vehicles={ownVehicles} value={value.vehicleId} onChange={vehicleId => onChange({ ...value, vehicleId })}
            newVehicle={value.newVehicle} onNewVehicleChange={newVehicle => onChange({ ...value, newVehicle })}/>}
      </div>}
    </section>}
  </>;
}
