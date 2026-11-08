import { fetchApi } from "./api";
import { getAdvisorAppointment, getAdvisorAppointments, confirmAdvisorAppointment, checkInAdvisorAppointment } from "./advisorAppointmentService";

/** Laravel responses in backend/routes/api.php, RepairOrderController and AdvisorAppointmentController. */
export type AppointmentWorkflowStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CANCELLED";
/** Dịch vụ / gói khách chọn khi đặt lịch; pivot.estimated_price là giá ước tính lúc đặt. */
export type RequestedService = { id: number; name: string; pivot?: { estimated_price?: Money; quantity?: number } | null };
export type RequestedPart = { id: number; name: string; unit?: string | null; pivot?: { quantity?: number } | null };
export type RequestedPackage = {
  id: number; name: string; description?: string | null;
  pivot?: { estimated_price?: Money } | null;
  services?: RequestedService[]; parts?: RequestedPart[];
};
export type CustomerRequest = {
  request_type?: string | null;
  symptom_description?: string | null;
  note?: string | null;
  services?: RequestedService[];
  packages?: RequestedPackage[];
};
const requestTypeText: Record<string, string> = {
  MAINTENANCE: "Bảo dưỡng",
  REPAIR: "Sửa chữa",
  DIAGNOSIS: "Kiểm tra, chẩn đoán",
  REPLACEMENT: "Thay thế",
};
export function requestTypeLabel(type?: string | null): string {
  return type ? requestTypeText[type] ?? type : "Chưa xác định";
}
export type WorkflowAppointment = CustomerRequest & {
  id: number;
  appointment_code?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: AppointmentWorkflowStatus;
  customer_id?: number | null;
  vehicle_id?: number | null;
  customer?: { id: number; full_name?: string; phone?: string } | null;
  vehicle?: { id: number; license_plate?: string; variant?: string } | null;
};
export type WorkflowInspection = {
  id: number; diagnosis?: string | null; condition_description?: string | null; inspected_at?: string | null;
  recorded_by?: { id: number; full_name?: string } | null;
  items?: Array<{ id: number; item_name: string; condition_status?: string | null; note?: string | null }>;
  recommendations?: Array<{
    id: number; item_type?: "SERVICE" | "PART"; service_id?: number | null; part_id?: number | null; quantity?: number; note?: string | null;
    service?: { id: number; name?: string; base_price?: string | number | null } | null;
    part?: { id: number; name?: string; sell_price?: string | number | null } | null;
  }>;
};
export type Money = string | number | null | undefined;
export type WorkflowQuotationItem = {
  id: number; item_type: "SERVICE" | "PART"; service_id?: number | null; part_id?: number | null;
  description?: string | null; quantity: number; unit_price: Money; amount: Money; is_approved?: boolean | null;
};
export type WorkflowQuotation = {
  id: number; quotation_code?: string; version?: number; status: string;
  type?: "INITIAL" | "SUPPLEMENT"; reason?: string | null; parent_quotation_id?: number | null;
  subtotal?: Money; discount_amount?: Money; total_amount?: Money; items?: WorkflowQuotationItem[];
};
export type WorkflowWorkItem = {
  id: number; description?: string | null; status: string; service?: { name?: string } | null;
  technician?: { employee?: { full_name?: string } | null } | null;
};
export type WorkflowUsedPart = { id: number; part_id: number; quantity: number; unit_price: Money; part?: { name?: string; unit?: string } | null };
export type WorkflowPayment = { id: number; amount: Money; payment_method: string; status: string; paid_at?: string | null };
export type WorkflowInvoice = {
  id: number; invoice_code?: string; status: string; subtotal?: Money; discount_amount?: Money; total_amount?: Money;
  items?: Array<{ id: number; description?: string | null; quantity: number; unit_price: Money; amount: Money }>;
  payments?: WorkflowPayment[];
};
export type HandoverChecklistItem = {
  id?: number; category: "EXTERIOR" | "INTERIOR" | "ACCESSORY" | "KEY" | "DOCUMENT"; position_code?: string | null;
  label: string; condition: "OK" | "SCRATCH" | "DENT" | "BROKEN" | "MISSING" | "PRESENT"; quantity?: number | null; note?: string | null;
  /** CHECK_OUT: khác với biên bản nhận xe (P4). */
  is_discrepancy?: boolean;
};
/** Phụ tùng chờ đặt hàng (P6). */
export type PartRequestRow = {
  id: number; part_id: number; quantity: number; status: "REQUESTED" | "ORDERED" | "RECEIVED" | "CANCELLED";
  eta_date?: string | null; supplier_note?: string | null; received_at?: string | null; part?: { name?: string; unit?: string | null } | null;
};
export type PickupAuthorization = {
  id: number; full_name: string; phone: string; id_last4: string; valid_until?: string | null;
  status: "ACTIVE" | "USED" | "REVOKED"; created_at?: string;
};
export type WorkflowHandover = {
  id: number; type: "CHECK_IN" | "CHECK_OUT"; status: "DRAFT" | "SUBMITTED" | "CONFIRMED" | "VOID";
  mileage?: number | null; fuel_level?: string | null; general_condition?: string | null; valuables_note?: string | null;
  person_name: string; person_phone?: string | null; person_id_last4?: string | null; person_relation: "OWNER" | "AUTHORIZED" | "OTHER";
  pickup_authorization_id?: number | null;
  submitted_at?: string | null; confirmed_at?: string | null; void_reason?: string | null;
  checklist_items?: HandoverChecklistItem[];
  confirmations?: Array<{ id: number; method: "ACCOUNT" | "EMAIL_OTP"; confirmed_at: string; comment?: string | null }>;
};
export type WorkflowOrder = {
  id: number;
  requires_check_in?: boolean;
  source?: "APPOINTMENT" | "WALK_IN" | null;
  booked_vehicle_id?: number | null;
  vehicle_change_reason?: string | null;
  handovers?: WorkflowHandover[];
  pickup_authorizations?: PickupAuthorization[];
  flow_type?: "QUICK" | null;
  part_requests?: PartRequestRow[];
  estimated_ready_at?: string | null;
  appointment_id?: number | null;
  appointment?: (CustomerRequest & { id: number; appointment_code?: string }) | null;
  repair_order_code?: string;
  status: string;
  customer_id?: number;
  vehicle_id?: number;
  mileage_received?: number | null;
  initial_condition?: string | null;
  note?: string | null;
  received_at?: string | null;
  customer?: { id?: number; full_name?: string; phone?: string } | null;
  vehicle?: { id?: number; license_plate?: string; variant?: string } | null;
  advisor?: { id?: number; full_name?: string } | null;
  assignments?: Array<{ id: number; technician_id: number; status?: string; technician?: { employee?: { full_name?: string } } }>;
  inspections?: WorkflowInspection[];
  status_history?: Array<{ id: number; status?: string; note?: string | null; created_at?: string }>;
  quotations?: WorkflowQuotation[];
  work_items?: WorkflowWorkItem[];
  used_parts?: WorkflowUsedPart[];
  invoice?: WorkflowInvoice | null;
};
export type WorkflowPage<T> = { data: T[]; current_page: number; last_page: number; total: number };
export type ReceivePayload = {
  appointment_id: number;
  customer_id: number;
  vehicle_id: number;
  mileage_received?: number;
  initial_condition?: string;
  note?: string;
  /** Bắt buộc khi xe mang tới khác xe trong lịch hẹn (cùng chủ). */
  vehicle_change_reason?: string;
};
export type CustomerVehicleOption = { id: number; license_plate: string; model?: { name?: string } | null };

/** P7: tải / năng lực gara theo ngày (chỉ cảnh báo — Q6). */
export type CapacityDay = { date: string; capacity_minutes: number | null; load_minutes: number; booked_minutes: number; open_work_minutes: number; appointments: number; utilization: number | null; over_capacity: boolean; suggestions?: CapacityDay[] };
export const capacityApi = {
  day: (date: string) => fetchApi<CapacityDay>(`/advisor/capacity?date=${date}`),
  range: async (from: string, days = 7) => (await fetchApi<{ data: CapacityDay[] }>(`/advisor/capacity/range?from=${from}&days=${days}`)).data,
};

export async function customerVehicles(customerId: number): Promise<CustomerVehicleOption[]> {
  const response = await fetchApi<{ data: CustomerVehicleOption[] }>(`/customers/${customerId}/vehicles`);
  return response.data ?? [];
}

export async function advisorAppointment(id: number): Promise<WorkflowAppointment> {
  const response = await getAdvisorAppointment(id) as { data: WorkflowAppointment };
  if (!response?.data) throw new Error("API không trả thông tin lịch hẹn.");
  return response.data;
}

/** Index is pagination-based; do not silently assume a single page contains every matching order. */
export async function listWorkflowOrders(page = 1, status = ""): Promise<WorkflowPage<WorkflowOrder>> {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  return fetchApi<WorkflowPage<WorkflowOrder>>(`/repair-orders?${params}`);
}

export async function findOrderForAppointment(appointmentId: number): Promise<WorkflowOrder | null> {
  let page = 1;
  for (;;) {
    const result = await listWorkflowOrders(page);
    const found = result.data.find(order => Number(order.appointment_id) === appointmentId);
    if (found) return found;
    if (page >= result.last_page) return null;
    // Fail closed rather than assuming there is no existing order in an unsearched page.
    if (page >= 100) throw new Error("Có quá nhiều trang phiếu để kiểm tra trùng. Liên hệ quản trị trước khi tạo phiếu.");
    page++;
  }
}

export async function listReceptionAppointments(status: AppointmentWorkflowStatus): Promise<WorkflowAppointment[]> {
  const result: WorkflowAppointment[] = [];
  let page = 1;
  for (;;) {
    const response = await getAdvisorAppointments({ status, page, per_page: 100 }) as {
      data: WorkflowAppointment[]; pagination: { last_page: number };
    };
    result.push(...(response.data || []));
    if (page >= (response.pagination?.last_page ?? 1)) return result;
    if (page >= 30) throw new Error("Danh sách lịch quá dài; hãy lọc lại theo ngày trong trang Lịch hẹn.");
    page++;
  }
}

/** Must be confirmed before check-in; Backend validates the transition. */
export async function checkInConfirmedAppointment(id: number): Promise<WorkflowAppointment> {
  const appointment = await advisorAppointment(id);
  if (appointment.status === "CHECKED_IN") return appointment;
  if (appointment.status !== "CONFIRMED") {
    throw new Error("Cần xác nhận lịch hẹn trước khi tiếp nhận xe.");
  }
  await checkInAdvisorAppointment(id);
  return advisorAppointment(id);
}

export async function confirmPendingAppointment(id: number): Promise<WorkflowAppointment> {
  const appointment = await advisorAppointment(id);
  if (appointment.status !== "PENDING") throw new Error("Chỉ xác nhận được lịch đang PENDING.");
  await confirmAdvisorAppointment(id);
  return advisorAppointment(id);
}

/** One appointment maps to one order (also backed by a UNIQUE DB constraint). */
export async function receiveRepairOrder(data: ReceivePayload): Promise<{ order: WorkflowOrder; existing: boolean }> {
  const appointment = await advisorAppointment(data.appointment_id);
  if (appointment.status !== "CHECKED_IN") throw new Error("Lịch chưa được tiếp nhận (CHECKED_IN).");
  const actualCustomer = appointment.customer?.id ?? appointment.customer_id;
  const actualVehicle = appointment.vehicle?.id ?? appointment.vehicle_id;
  if (!actualCustomer || !actualVehicle) throw new Error("Lịch thiếu khách hàng hoặc xe. Không thể tạo phiếu.");
  if (data.customer_id !== actualCustomer) throw new Error("Thông tin khách không khớp lịch hẹn.");
  if (data.vehicle_id !== actualVehicle && !data.vehicle_change_reason?.trim()) throw new Error("Xe khác lịch hẹn: nhập lý do đổi xe.");
  const old = await findOrderForAppointment(appointment.id);
  if (old) return { order: old, existing: true };
  try {
    const order = await fetchApi<WorkflowOrder>("/repair-orders", {
      method: "POST", body: JSON.stringify(data),
    });
    return { order, existing: false };
  } catch (error) {
    // Network timeout/DB unique conflict may mean the first request was committed.
    try {
      const recovered = await findOrderForAppointment(appointment.id);
      if (recovered) return { order: recovered, existing: true };
    } catch { /* Preserve the original API error. */ }
    throw error;
  }
}

export type CatalogService = { id: number; name: string; category?: string | null; base_price?: Money; service_level?: "QUICK" | "STANDARD" | "MAJOR"; estimated_minutes?: number | null; status?: string };
export type CatalogPart = { id: number; sku: string; name: string; unit?: string | null; sell_price?: Money; inventory?: { quantity: number } | null };
export type QuotationLineInput = {
  item_type: "SERVICE" | "PART"; service_id?: number; part_id?: number; description?: string; quantity: number; unit_price?: number;
};
/** Báo giá gốc đang hiệu lực = INITIAL version cao nhất (khớp RepairOrder::latestQuotation). Phát sinh không thay thế. */
export function latestQuotation(order: { quotations?: WorkflowQuotation[] }): WorkflowQuotation | null {
  return [...(order.quotations ?? [])].filter(q => (q.type ?? "INITIAL") === "INITIAL").sort((a, b) => (b.version ?? 0) - (a.version ?? 0))[0] ?? null;
}

/** Báo giá phát sinh (P3), cũ → mới. */
export function supplementQuotations(order: { quotations?: WorkflowQuotation[] }): WorkflowQuotation[] {
  return [...(order.quotations ?? [])].filter(q => q.type === "SUPPLEMENT").sort((a, b) => (a.version ?? 0) - (b.version ?? 0));
}

/** Dòng phụ tùng khách đã duyệt trong báo giá gốc + phát sinh đã trả lời xong (khớp billableQuotationIds). */
export function billableQuotations(order: { quotations?: WorkflowQuotation[] }): WorkflowQuotation[] {
  const initial = latestQuotation(order);
  return [...(initial ? [initial] : []), ...supplementQuotations(order).filter(q => ["APPROVED", "PARTIALLY_APPROVED"].includes(q.status))];
}
/** Laravel decimal columns arrive as strings ("450000.00"). */
export function toNumber(value: Money): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
export function formatVnd(value: Money): string {
  return `${toNumber(value).toLocaleString("vi-VN")} ₫`;
}

export type InspectionResult = "PASSED" | "WARNING" | "FAILED";
export type RecommendationInput = { item_type: "SERVICE" | "PART"; service_id?: number; part_id?: number; quantity: number; note?: string };
export type InspectionInput = {
  condition_description?: string; diagnosis?: string;
  inspection_items: Array<{ item_name: string; status: InspectionResult; condition_description?: string }>;
  recommendations?: RecommendationInput[];
};

export type TechnicianOption = {
  id: number;
  specialty?: string | null;
  level?: string | null;
  is_available?: boolean;
  active_assignments_count?: number;
  employee?: { id: number; full_name?: string; phone?: string } | null;
};

export const workflowApi = {
  order: (id: number) => fetchApi<WorkflowOrder>(`/repair-orders/${id}`),
  technicians: () => fetchApi<TechnicianOption[]>("/technicians"),
  services: () => fetchApi<CatalogService[]>("/services"),
  parts: () => fetchApi<CatalogPart[]>("/parts"),
  createQuotation: (id: number, payload: { discount_amount?: number; items: QuotationLineInput[]; type?: "INITIAL" | "SUPPLEMENT"; reason?: string }) =>
    fetchApi<WorkflowQuotation>(`/repair-orders/${id}/quotations`, { method: "POST", body: JSON.stringify(payload) }),
  /** P5: dịch vụ nhanh — báo giá niêm yết, bỏ chẩn đoán (backend kiểm điều kiện). */
  quickQuotation: (id: number, serviceIds: number[]) =>
    fetchApi<WorkflowQuotation>(`/repair-orders/${id}/quick-quotation`, { method: "POST", body: JSON.stringify({ service_ids: serviceIds }) }),
  sendQuotation: (quotationId: number) => fetchApi<WorkflowQuotation>(`/quotations/${quotationId}/send`, { method: "POST" }),
  // Không có "respondQuotation" phía nhân viên: chỉ khách duyệt báo giá (customerApi.respondQuotation → /me/...).
  transition: (id: number, step: "start-repair" | "waiting-for-parts" | "resume" | "complete" | "hand-over", note?: string) =>
    fetchApi<WorkflowOrder>(`/repair-orders/${id}/${step}`, { method: "POST", body: JSON.stringify(note ? { note } : {}) }),
  close: (id: number, closeReason: string, note: string) =>
    fetchApi<WorkflowOrder>(`/repair-orders/${id}/close`, { method: "POST", body: JSON.stringify({ close_reason: closeReason, note }) }),
  recordInspection: (id: number, payload: InspectionInput) =>
    fetchApi<WorkflowInspection>(`/repair-orders/${id}/inspections`, { method: "POST", body: JSON.stringify(payload) }),
  addRecommendation: (id: number, payload: RecommendationInput) =>
    fetchApi(`/repair-orders/${id}/inspections/recommendations`, { method: "POST", body: JSON.stringify(payload) }),
  completeInspection: (id: number) => fetchApi<WorkflowInspection>(`/repair-orders/${id}/inspections/complete`, { method: "POST" }),
  updateWorkItem: (workItemId: number, status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") =>
    fetchApi(`/work-items/${workItemId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  recordUsedPart: (id: number, payload: { part_id: number; quantity: number; work_item_id?: number }) =>
    fetchApi<WorkflowUsedPart>(`/repair-orders/${id}/used-parts`, { method: "POST", body: JSON.stringify(payload) }),
  createInvoice: (id: number) => fetchApi<WorkflowInvoice>(`/repair-orders/${id}/invoice`, { method: "POST" }),
  payCash: (invoiceId: number, amount: number) =>
    fetchApi<WorkflowPayment>(`/invoices/${invoiceId}/payments`, { method: "POST", body: JSON.stringify({ payment_method: "DIRECT", amount }) }),
  assignTechnician: (id: number, technicianId: number, note?: string) => fetchApi(`/repair-orders/${id}/assign-technician`, {
    method: "POST", body: JSON.stringify({ technician_id: technicianId, note: note || null }),
  }),
};
