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
type StaffRef = { id: number; email?: string; employee?: { full_name?: string } | null };
export type WorkflowAppointment = CustomerRequest & {
  id: number;
  /** Nhân viên xử lý gần nhất / người tạo hộ + lịch sử thao tác. */
  handled_by?: StaffRef | null;
  created_by?: StaffRef | null;
  activities?: Array<{ id: number; action: string; created_at: string; reason?: string | null; account?: StaffRef | null; old_values?: Record<string, string> | null; new_values?: Record<string, string> | null }>;
  appointment_code?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: AppointmentWorkflowStatus;
  customer_id?: number | null;
  vehicle_id?: number | null;
  customer?: { id: number; full_name?: string; phone?: string; email?: string | null } | null;
  vehicle?: {
    id: number; license_plate?: string; variant?: string; year?: number | null; mileage?: number | null; vin?: string | null;
    model?: { id: number; name?: string; brand?: { id: number; name?: string } | null } | null;
  } | null;
  /** ADV-08: phiếu sửa chữa đã tạo từ lịch (null = chưa có). */
  repair_order?: { id: number; repair_order_code?: string; status: string } | null;
};
export type WorkflowInspection = {
  id: number; diagnosis?: string | null; condition_description?: string | null; inspected_at?: string | null;
  recorded_by?: { id: number; full_name?: string } | null;
  items?: Array<{ id: number; item_name: string; condition_status?: string | null; note?: string | null }>;
  recommendations?: Array<{
    id: number; item_type?: "SERVICE" | "PART"; service_id?: number | null; part_id?: number | null; quantity?: number; note?: string | null;
    /** Bổ sung sau khi đã hoàn tất chẩn đoán (PO 19/11) — có lý do + người bổ sung. */
    added_after_completion?: boolean; created_at?: string | null;
    added_by?: { id: number; email?: string; employee?: { full_name?: string } | null } | null;
    service?: { id: number; name?: string; base_price?: string | number | null } | null;
    part?: { id: number; name?: string; sell_price?: string | number | null } | null;
  }>;
};
export type Money = string | number | null | undefined;
/** Cách khách xác nhận: tài khoản · mã email tại quầy · link duyệt trong email (báo giá, không đăng nhập). */
export type ConfirmationMethod = "ACCOUNT" | "EMAIL_OTP" | "EMAIL_LINK" | "ADMIN_EXCEPTION";
export const CONFIRMATION_METHOD_TEXT: Record<ConfirmationMethod, string> = {
  ACCOUNT: "Khách tự duyệt trong tài khoản",
  EMAIL_OTP: "Khách xác nhận tại quầy bằng mã email",
  EMAIL_LINK: "Khách duyệt qua link trong email",
  ADMIN_EXCEPTION: "Admin duyệt ngoại lệ, chủ xe có mặt với giấy tờ",
};
/** Mô tả hộp thoại xác nhận gửi báo giá (khách đặt lịch đã đồng ý nhận báo giá qua email). */
export const quotationSendConfirmText = (total: Money) =>
  `Khách nhận báo giá ${formatVnd(total)} trong tài khoản trên web. Khách đặt lịch (đã đồng ý nhận email) còn nhận email kèm link duyệt từng hạng mục, không cần đăng nhập. Sau khi gửi không sửa được báo giá nữa.`;
/** Thông báo sau khi gửi báo giá: có email kèm link duyệt hay chỉ thông báo trên web. */
export const quotationSentText = (result: { emailed_to?: string | null }) => result.emailed_to
  ? `Đã gửi báo giá. Khách nhận thông báo trên web và email kèm link duyệt (${result.emailed_to}).`
  : "Đã gửi báo giá. Khách nhận thông báo trong tài khoản trên web.";
export type WorkflowQuotationItem = {
  id: number; item_type: "SERVICE" | "PART"; service_id?: number | null; part_id?: number | null;
  service?: { id: number; status?: string } | null;
  description?: string | null; quantity: number; unit_price: Money; amount: Money; is_approved?: boolean | null;
  /** Hạng mục bắt buộc: khách từ chối = từ chối toàn bộ báo giá (PO 19/11). */
  is_required?: boolean; required_reason?: string | null;
  /** P3: lịch sử từng lần khách quyết định dòng này. */
  responses?: Array<{ id: number; decision: "APPROVED" | "REJECTED"; created_at?: string; confirmation?: { id: number; method: ConfirmationMethod; confirmed_at: string } | null }>;
};
export type WorkflowQuotation = {
  id: number; quotation_code?: string; version?: number; status: string;
  type?: "INITIAL" | "SUPPLEMENT"; reason?: string | null; parent_quotation_id?: number | null;
  /** Xe phải lưu xưởng qua đêm: báo trước cho khách trong báo giá, không tính phí. */
  stays_overnight?: boolean;
  subtotal?: Money; discount_amount?: Money; total_amount?: Money; items?: WorkflowQuotationItem[];
  created_at?: string | null; customer_response_at?: string | null; valid_until?: string | null;
};
/** Dòng danh sách "Báo giá & phê duyệt" (GET /quotations). */
export type QuotationListRow = WorkflowQuotation & {
  repair_order_id: number; items_count?: number;
  repair_order?: {
    id: number; repair_order_code?: string; status: string;
    customer?: { id: number; full_name?: string; phone?: string } | null;
    vehicle?: { id: number; license_plate?: string; model?: { id: number; name?: string; brand?: { id: number; name?: string } | null } | null } | null;
  } | null;
};
export type QuotationListParams = { page?: number; statuses?: string[]; search?: string; from?: string; to?: string; perPage?: number };
export async function listQuotations(params: QuotationListParams, signal?: AbortSignal): Promise<WorkflowPage<QuotationListRow> & { counts: Record<string, number> }> {
  const query = new URLSearchParams({ page: String(params.page ?? 1) });
  if (params.statuses?.length) query.set("status", params.statuses.join(","));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.perPage) query.set("per_page", String(params.perPage));
  const result = await fetchApi<WorkflowPage<QuotationListRow> & { counts?: Record<string, number> | unknown[] }>(`/quotations?${query}`, { signal });
  return { ...result, counts: Array.isArray(result.counts) ? {} : (result.counts ?? {}) };
}
export type WorkflowWorkItem = {
  id: number; description?: string | null; status: string; service?: { name?: string; status?: string } | null;
  technician?: { employee?: { full_name?: string } | null } | null;
  started_at?: string | null; completed_at?: string | null; standard_minutes?: number | null;
};
export type WorkflowUsedPart = { id: number; part_id: number; quantity: number; unit_price: Money; part?: { name?: string; unit?: string } | null };
export type CounterMethod = "DIRECT" | "TRANSFER" | "CARD" | "EWALLET";
export type WorkflowPayment = {
  id: number; amount: Money; payment_method: string; status: string; paid_at?: string | null; created_at?: string | null;
  transaction_code?: string | null; gateway_txn_ref?: string | null;
  /** Người thu tại quầy (quan hệ `collector`). */
  collector?: { id: number; email?: string; employee?: { full_name?: string } | null } | null;
};
export type WorkflowInvoice = {
  id: number; invoice_code?: string; status: string; subtotal?: Money; discount_amount?: Money; total_amount?: Money;
  items?: Array<{ id: number; item_type?: "SERVICE" | "PART" | string; description?: string | null; quantity: number; unit_price: Money; amount: Money }>;
  created_at?: string | null;
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
  /** ADV-01: lý do cố vấn báo thiếu (null = tự tạo khi khách duyệt mà kho thiếu). */
  request_note?: string | null; ordered_at?: string | null; cancel_reason?: string | null; quotation_item_id?: number | null;
};
/** Yêu cầu phụ tùng còn mở (chưa về, chưa hủy) của phiếu. */
export const openPartRequests = (order: { part_requests?: PartRequestRow[] }) => (order.part_requests ?? []).filter(r => r.status === "REQUESTED" || r.status === "ORDERED");
/** Phụ tùng cố vấn báo thiếu khi chuyển phiếu sang chờ phụ tùng. */
export type ShortagePartInput = { part_id: number; quantity: number; note?: string };
export type PickupAuthorization = {
  id: number; full_name: string; phone: string; valid_until?: string | null;
  status: "ACTIVE" | "USED" | "REVOKED"; created_at?: string;
};
export type WorkflowHandover = {
  id: number; type: "CHECK_IN" | "CHECK_OUT"; status: "DRAFT" | "SUBMITTED" | "CONFIRMED" | "VOID";
  mileage?: number | null; fuel_level?: string | null; general_condition?: string | null; valuables_note?: string | null;
  /** Biên bản trả xe: biên bản nhận xe dùng để đối chiếu. */
  compared_handover_id?: number | null;
  compared_handover?: Pick<WorkflowHandover, "id" | "mileage" | "fuel_level" | "general_condition" | "valuables_note" | "checklist_items"> | null;
  person_name: string; person_phone?: string | null; has_person_id?: boolean; person_relation: "OWNER" | "AUTHORIZED" | "OTHER";
  pickup_authorization_id?: number | null;
  submitted_at?: string | null; confirmed_at?: string | null; void_reason?: string | null;
  checklist_items?: HandoverChecklistItem[];
  confirmations?: Array<{ id: number; method: ConfirmationMethod; confirmed_at: string; comment?: string | null }>;
  /** Yêu cầu ngoại lệ gần nhất khi chủ xe mất email. */
  latest_exception?: { id: number; status: "PENDING" | "APPROVED" | "REJECTED"; decision_note?: string | null } | null;
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
  /** Lời khách kể / yêu cầu thêm tại quầy (tách khỏi tình trạng xe). */
  customer_request?: string | null;
  received_at?: string | null;
  customer?: { id?: number; full_name?: string; phone?: string; email?: string | null; email_verified?: boolean } | null;
  vehicle?: {
    id?: number; license_plate?: string; variant?: string; year?: number | null; vin?: string | null;
    model?: { id: number; name?: string; brand?: { id: number; name?: string } | null } | null;
    trim?: { id: number; name?: string } | null;
  } | null;
  booked_vehicle?: { id: number; license_plate?: string } | null;
  close_reason?: string | null;
  closed_at?: string | null;
  completed_at?: string | null;
  handed_over_at?: string | null;
  advisor?: { id?: number; full_name?: string } | null;
  assignments?: Array<{ id: number; technician_id: number; status?: string; technician?: { employee?: { full_name?: string } } }>;
  inspections?: WorkflowInspection[];
  status_history?: Array<{ id: number; status?: string; note?: string | null; created_at?: string }>;
  quotations?: WorkflowQuotation[];
  work_items?: WorkflowWorkItem[];
  /** Danh sách có `with_progress=1`: số công việc (trừ đã huỷ) và số đã xong. */
  work_total?: number; work_done?: number;
  /** Kiểm tra sau sửa chữa (bắt buộc trước bàn giao, PO 17/11/2026). */
  quality_check?: { items: string[]; note?: string | null } | null;
  quality_checked_at?: string | null;
  quality_inspector?: { id: number; email?: string; employee?: { full_name?: string } | null } | null;
  /** Danh sách có `with_delivery=1`: biên bản trả xe đã được chủ xe xác nhận. */
  check_out_confirmed?: boolean;
  /** Danh sách có `with_delivery=1`: trạng thái biên bản trả xe gần nhất (bỏ bản đã hủy). */
  check_out_status?: WorkflowHandover["status"] | null;
  used_parts?: WorkflowUsedPart[];
  invoice?: WorkflowInvoice | null;
};
/** Phiếu có báo giá còn hiệu lực ghi xe phải lưu xưởng qua đêm. */
export const staysOvernight = (order: Pick<WorkflowOrder, "quotations">) =>
  (order.quotations ?? []).some(q => q.stays_overnight && !["REJECTED", "CANCELLED"].includes(q.status));
export type WorkflowPage<T> = { data: T[]; current_page: number; last_page: number; total: number };
/** ADV-03: xe khách mang tới chưa có trong hệ thống — tạo hồ sơ xe cùng lúc với phiếu. */
export type NewVehicleInput = { model_id: number; trim_id?: number | null; license_plate?: string | null; year?: number | null; vin?: string | null };
/** ADV-02: khách vãng lai mới — tạo hồ sơ khách cùng lúc với phiếu. */
export type NewCustomerInput = { full_name: string; phone: string; email?: string | null };
export type ReceivePayload = {
  appointment_id: number;
  customer_id: number;
  /** Một trong hai: xe có sẵn (`vehicle_id`) hoặc xe mới (`vehicle`). */
  vehicle_id?: number;
  vehicle?: NewVehicleInput;
  mileage_received?: number;
  initial_condition?: string;
  customer_request?: string;
  /** Bổ sung cho xe có sẵn còn thiếu năm sản xuất / VIN. */
  vehicle_year?: number;
  vehicle_vin?: string;
  note?: string;
  /** Bắt buộc khi xe mang tới khác xe trong lịch hẹn (cùng chủ). */
  vehicle_change_reason?: string;
};
export type CustomerVehicleOption = { id: number; license_plate: string; year?: number | null; model?: { name?: string; brand?: { name?: string } | null } | null };

/** P7: tải / năng lực gara theo ngày (chỉ cảnh báo — Q6). */
export type CapacityBasis = { type: "closed" | "manual" } | { type: "bays" | "technicians"; count: number; open_minutes: number };
export type CapacityDay = { date: string; capacity_minutes: number | null; capacity_basis?: CapacityBasis | null; load_minutes: number; booked_minutes: number; open_work_minutes: number; appointments: number; utilization: number | null; over_capacity: boolean; suggestions?: CapacityDay[] };
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

/** ADV-07: danh sách phiếu có lọc nhiều trạng thái, tìm kiếm, phiếu của tôi, sắp xếp + số đếm theo trạng thái. */
export type RepairOrderListParams = {
  page?: number; statuses?: string[]; search?: string; mine?: boolean; sort?: string; dir?: string;
  /** Khoảng ngày nhận xe `YYYY-MM-DD` (gồm cả hai đầu). */
  from?: string; to?: string; perPage?: number;
  /** Tiến độ sửa chữa: kèm `work_total`/`work_done` từng phiếu + `progress` (xong hôm nay, dự kiến xong hôm nay). */
  withProgress?: boolean; completedOn?: string; readyOn?: string;
  /** Kiểm tra & bàn giao: kèm hoá đơn + biên bản trả xe + `delivery` (số theo tình trạng); lọc một tình trạng. */
  withDelivery?: boolean; delivery?: DeliveryState;
  /** Thanh toán: kèm hoá đơn + `billing` (chờ / đã thanh toán, doanh thu đã thu hôm nay / tháng); lọc chờ / đã thanh toán. */
  withBilling?: boolean; billing?: "unpaid" | "paid";
};
export type BillingSummary = { unpaid: number; paid: number; revenue_today: number; revenue_month: number };
export type RepairProgressSummary = { completed_today: number; ready_today: number };
export type DeliveryState = "check" | "payment" | "checkout" | "ready" | "handed_today" | "late";
export async function listRepairOrders(params: RepairOrderListParams, signal?: AbortSignal): Promise<WorkflowPage<WorkflowOrder> & { counts: Record<string, number>; progress?: RepairProgressSummary; delivery?: Record<DeliveryState, number>; billing?: BillingSummary }> {
  const query = new URLSearchParams({ page: String(params.page ?? 1) });
  if (params.withDelivery) query.set("with_delivery", "1");
  if (params.withBilling) query.set("with_billing", "1");
  if (params.billing) query.set("billing", params.billing);
  if (params.delivery) query.set("delivery", params.delivery);
  if (params.withProgress) query.set("with_progress", "1");
  if (params.completedOn) query.set("completed_on", params.completedOn);
  if (params.readyOn) query.set("ready_on", params.readyOn);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.perPage) query.set("per_page", String(params.perPage));
  if (params.statuses?.length) query.set("status", params.statuses.join(","));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.mine) query.set("mine", "1");
  if (params.sort) query.set("sort", params.sort);
  if (params.dir) query.set("dir", params.dir);
  const result = await fetchApi<WorkflowPage<WorkflowOrder> & { counts?: Record<string, number> | unknown[]; progress?: RepairProgressSummary; delivery?: Record<DeliveryState, number>; billing?: BillingSummary }>(`/repair-orders?${query}`, { signal });
  // PHP trả mảng rỗng `[]` khi không có phiếu nào → chuẩn hoá thành object.
  return { ...result, counts: Array.isArray(result.counts) ? {} : (result.counts ?? {}) };
}

/** Một dòng ở trang "Biên bản giao nhận": biên bản + phiếu, khách, xe, người lập. */
export type HandoverListRow = WorkflowHandover & {
  repair_order_id: number; created_at?: string | null;
  repair_order?: { id: number; repair_order_code?: string | null; status: string; customer?: { full_name?: string | null; phone?: string | null } | null } | null;
  vehicle?: { license_plate?: string | null; model?: { name?: string | null; brand?: { name?: string | null } | null } | null } | null;
  staff?: { full_name?: string | null } | null;
};

/** GET /api/handovers — danh sách biên bản nhận / trả xe (cố vấn), `counts` theo trạng thái. */
export async function listHandovers(params: { page?: number; type?: string; status?: string; search?: string; perPage?: number }, signal?: AbortSignal) {
  const query = new URLSearchParams({ page: String(params.page ?? 1), per_page: String(params.perPage ?? 10) });
  if (params.type) query.set("type", params.type);
  if (params.status) query.set("status", params.status);
  if (params.search?.trim()) query.set("search", params.search.trim());
  const result = await fetchApi<WorkflowPage<HandoverListRow> & { counts?: Record<string, number> | unknown[] }>(`/handovers?${query}`, { signal });
  return { ...result, counts: Array.isArray(result.counts) ? {} as Record<string, number> : (result.counts ?? {}) };
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

export type AppointmentFilterOptions = {
  packages: Array<{ id: number; name: string; active: boolean; model: string | null }>;
  services: Array<{ id: number; name: string; category: string | null; active: boolean }>;
};
/** Gói bảo dưỡng (kể cả gói riêng theo dòng xe) + dịch vụ cho thanh lọc trang Lịch hẹn. */
export async function appointmentFilterOptions(): Promise<AppointmentFilterOptions> {
  return (await fetchApi<{ data: AppointmentFilterOptions }>("/advisor/appointments/filter-options")).data;
}

/** Gửi mail kèm dịch vụ đã đặt để khách tự bấm xác nhận lịch (PENDING → CONFIRMED khi khách bấm). */
export async function sendAppointmentConfirmationEmail(id: number): Promise<string> {
  const response = await fetchApi<{ message?: string }>(`/advisor/appointments/${id}/send-confirmation-email`, { method: "POST" });
  return response.message || "Đã gửi email xác nhận cho khách.";
}

/** One appointment maps to one order (also backed by a UNIQUE DB constraint). */
export async function receiveRepairOrder(data: ReceivePayload): Promise<{ order: WorkflowOrder; existing: boolean }> {
  const appointment = await advisorAppointment(data.appointment_id);
  if (appointment.status !== "CHECKED_IN") throw new Error("Lịch chưa được tiếp nhận (CHECKED_IN).");
  const actualCustomer = appointment.customer?.id ?? appointment.customer_id;
  const actualVehicle = appointment.vehicle?.id ?? appointment.vehicle_id;
  if (!actualCustomer || !actualVehicle) throw new Error("Lịch thiếu khách hàng hoặc xe. Không thể tạo phiếu.");
  if (data.customer_id !== actualCustomer) throw new Error("Thông tin khách không khớp lịch hẹn.");
  if ((data.vehicle || data.vehicle_id !== actualVehicle) && !data.vehicle_change_reason?.trim()) throw new Error("Xe khác lịch hẹn: nhập lý do đổi xe.");
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

/** ADV-02: tiếp nhận khách vãng lai (không lịch hẹn). Khách / xe có sẵn hoặc mới — backend tạo trong một giao dịch. */
export type WalkInPayload = {
  customer_id?: number; customer?: NewCustomerInput;
  vehicle_id?: number; vehicle?: NewVehicleInput;
  mileage_received?: number; initial_condition?: string; customer_request?: string; note?: string;
  vehicle_year?: number; vehicle_vin?: string;
};
export const receiveWalkIn = (data: WalkInPayload) =>
  fetchApi<WorkflowOrder>("/repair-orders", { method: "POST", body: JSON.stringify(data) });

export type CounterCustomer = { id: number; full_name: string; phone?: string | null; email?: string | null };
export type CounterVehicle = {
  id: number; customer_id: number; license_plate?: string | null; year?: number | null; vin?: string | null; mileage?: number | null; variant?: string | null;
  model?: { id: number; name?: string; brand?: { id: number; name?: string } | null } | null;
  trim?: { id: number; name?: string } | null;
  customer?: CounterCustomer | null;
  /** Mã phiếu đang mở của xe (chỉ có ở /customers/{id}/vehicles) — xe này chưa nhận phiếu mới được. */
  open_repair_order_code?: string | null;
};
/** Tìm tại quầy: theo tên / SĐT / email khách và theo biển số xe (gộp kết quả, bỏ trùng khách). */
export async function searchCounter(term: string): Promise<{ customers: CounterCustomer[]; vehicles: CounterVehicle[] }> {
  const q = encodeURIComponent(term.trim());
  const [customers, vehicles] = await Promise.all([
    fetchApi<{ data: { data: CounterCustomer[] } }>(`/customers?search=${q}`),
    fetchApi<{ data: { data: CounterVehicle[] } }>(`/vehicles?search=${q}`),
  ]);
  return { customers: customers.data?.data ?? [], vehicles: vehicles.data?.data ?? [] };
}
export async function counterCustomerVehicles(customerId: number): Promise<CounterVehicle[]> {
  return (await fetchApi<{ data: CounterVehicle[] }>(`/customers/${customerId}/vehicles`)).data ?? [];
}

/** ADV-09: Khách hàng / Xe khách hàng (cố vấn). */
type LaravelPage<T> = { data: T[]; current_page: number; last_page: number; per_page: number; total: number };
export type CustomerTier = "NEW" | "RETURNING" | "LOYAL";
export type CustomerSegment = "new" | "in_shop" | "loyal";
export type CustomerRow = CounterCustomer & {
  vehicles_count: number; repair_orders_count: number; last_visit_at: string | null; has_account: boolean; created_at?: string;
  address?: string | null;
  /** Mockup 17/11: tổng hoá đơn đã thanh toán, số lượt đã bàn giao, hạng khách, đang có xe ở xưởng. */
  total_spent?: number; completed_visits?: number; tier?: CustomerTier; in_shop?: boolean;
};
type CustomerAppointmentRef = { id: number; appointment_code: string; status: string; appointment_date: string; appointment_time: string };
export type CustomerDetail = CustomerRow & {
  vehicles: CounterVehicle[];
  repair_orders: Array<{
    id: number; repair_order_code: string; status: string; received_at: string | null;
    vehicle?: { license_plate?: string | null; model?: { name?: string; brand?: { name?: string } | null } | null } | null;
    invoice?: { id: number; total_amount: Money; status: string; items?: Array<{ id: number; description?: string | null }> } | null;
    work_items?: Array<{ id: number; description?: string | null; service?: { name?: string; status?: string } | null }>;
  }>;
  appointments: CustomerAppointmentRef[];
  past_appointments?: CustomerAppointmentRef[];
  reviews?: Array<{ id: number; overall_rating: number; comment?: string | null; reply?: string | null; created_at?: string; repair_order?: { id: number; repair_order_code?: string } | null }>;
};
export type CustomerSummary = { total: number; with_account: number; new_this_month: number; new_30_days?: number; in_shop?: number; loyal?: number; loyal_min_visits?: number };
export type VehicleRow = CounterVehicle & {
  mileage?: number | null; vin?: string | null; note?: string | null; last_service_at?: string | null; open_repair_order_id?: number | null;
  /** Mockup 17/11: ngày lịch hẹn sắp tới gần nhất (nhãn "Có lịch hẹn"). */
  next_appointment_date?: string | null; created_at?: string | null;
};
export type VehicleSegment = "in_shop" | "upcoming" | "maintenance";
type VehicleAppointmentRef = { id: number; appointment_code: string; appointment_date: string; appointment_time: string; status: string; packages?: Array<{ id: number; name: string }> };
export type VehicleDetail = VehicleRow & {
  repair_orders_count: number;
  repair_orders: Array<{
    id: number; repair_order_code: string; status: string; received_at: string | null; mileage_received?: number | null;
    invoice?: { id: number; total_amount: Money; status: string; items?: Array<{ id: number; description?: string | null }> } | null;
    work_items?: Array<{ id: number; description?: string | null; service?: { name?: string; status?: string } | null }>;
  }>;
  open_repair_order?: { id: number; repair_order_code: string; status: string } | null;
  upcoming_appointments: VehicleAppointmentRef[];
  past_appointments: VehicleAppointmentRef[];
};
const pageQuery = (params: Record<string, string | number | undefined | null>) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "" && v !== "all") q.set(k, String(v)); });
  return q.toString();
};
export const customerDirectoryApi = {
  customers: async (params: { search?: string; page?: number; per_page?: number; segment?: CustomerSegment | null }, signal?: AbortSignal) => {
    const r = await fetchApi<{ data: LaravelPage<CustomerRow>; summary: CustomerSummary }>(`/customers?${pageQuery(params)}`, { signal });
    return { page: r.data, summary: r.summary };
  },
  customer: async (id: number, signal?: AbortSignal) => (await fetchApi<{ data: CustomerDetail }>(`/customers/${id}`, { signal })).data,
  vehicles: async (params: { search?: string; page?: number; per_page?: number; brand_id?: string; customer_id?: number | null }, signal?: AbortSignal) =>
    (await fetchApi<{ data: LaravelPage<VehicleRow> }>(`/vehicles?${pageQuery(params)}`, { signal })).data,
  /** Mockup 17/11: danh sách xe kèm số liệu nhóm (tổng, đang sửa, có lịch hẹn, bảo dưỡng định kỳ). */
  vehiclePage: async (params: { search?: string; page?: number; per_page?: number; brand_id?: string; customer_id?: number | null; segment?: VehicleSegment | null }, signal?: AbortSignal) => {
    const r = await fetchApi<{ data: LaravelPage<VehicleRow>; summary: Record<VehicleSegment | "total", number> }>(`/vehicles?${pageQuery(params)}`, { signal });
    return { page: r.data, summary: r.summary };
  },
  vehicle: async (id: number, signal?: AbortSignal) => (await fetchApi<{ data: VehicleDetail }>(`/vehicles/${id}`, { signal })).data,
};

/** ADV-10: Tổng quan cố vấn — một lần tải, số liệu thật. */
export type DashboardAppointment = {
  id: number; code: string; status: string; date: string; time: string; customer: string | null; plate: string | null;
  brand: string | null; model: string | null; request: string | null; more: number;
};
export type AdvisorDashboard = {
  generated_at: string; days: string[];
  kpis: {
    pending: { value: number; series: number[] };
    today: { value: number; previous: number; series: number[] };
    repairing: { value: number; waiting_parts: number; series: number[] };
    delivery: { value: number; handed_today: number; series: number[] };
  };
  appointments_yesterday: DashboardAppointment[];
  appointments_today: DashboardAppointment[];
  appointments_upcoming: DashboardAppointment[];
  stages: Array<{ key: "intake" | "quote" | "repair" | "parts" | "deliver"; label: string; value: number }>;
  todo: { received: number; quoting: number; waiting_approval: number; waiting_parts: number; parts_ready: number; confirmed_today: number; pending_appointments: number; ready_delivery: number };
  recent_orders: Array<{ id: number; code: string; status: string; customer: string | null; plate: string | null; brand: string | null; model: string | null }>;
};
export const advisorDashboardApi = (signal?: AbortSignal) =>
  fetchApi<{ data: AdvisorDashboard }>("/advisor/dashboard", { signal }).then(r => r.data);

/** "Cập nhật từ khách": khách đặt lịch / tự đổi lịch / xác nhận qua email / tự hủy (mới nhất trước). */
export type CustomerUpdate = {
  key: string;
  type: "BOOKED" | "RESCHEDULED" | "CONFIRMED" | "CANCELLED";
  at: string | null;
  customer_name: string | null;
  reason: string | null;
  old_date: string | null;
  old_time: string | null;
  appointment: { id: number; appointment_code: string; appointment_date: string; appointment_time: string; status: string; vehicle: string | null; license_plate: string | null };
};
export const customerUpdatesApi = (signal?: AbortSignal) =>
  fetchApi<{ data: CustomerUpdate[] }>("/advisor/customer-updates?limit=10", { signal }).then(r => r.data);

/** ADV-04: đặt lịch hộ khách. */
export type SlotStatus = "available" | "full" | "closed" | "past";
export type BookingAvailability = {
  date: string; holiday: string | null; open: string | null; close: string | null; active: boolean; max_slots: number;
  slots: Array<{ time: string; period: "morning" | "afternoon"; booked: number; status: SlotStatus }>;
};
export type BookingPackage = { id: number; name: string; mileage_milestone?: number | null; estimated_price?: Money; vehicle_model_id?: number | null; services?: Array<{ id: number; name: string }> };
export type AdvisorBookingPayload = WalkInPayload & {
  appointment_date: string; appointment_time: string; request_type: "DIAGNOSIS" | "REPAIR" | "MAINTENANCE";
  service_ids?: number[]; package_ids?: number[]; symptom_description?: string; note?: string;
};
export const bookingApi = {
  availability: async (date: string) => (await fetchApi<{ data: BookingAvailability }>(`/advisor/booking-availability?date=${date}`)).data,
  packages: (modelId?: number | null) => fetchApi<BookingPackage[]>(`/maintenance-packages${modelId ? `?model_id=${modelId}` : ""}`),
  create: async (payload: AdvisorBookingPayload) =>
    (await fetchApi<{ data: WorkflowAppointment }>("/advisor/appointments", { method: "POST", body: JSON.stringify(payload) })).data,
};

export type CatalogService = { id: number; name: string; category?: string | null; base_price?: Money; service_level?: "QUICK" | "STANDARD" | "MAJOR"; estimated_minutes?: number | null; status?: string };
export type CatalogPart = { id: number; sku: string; name: string; unit?: string | null; sell_price?: Money; inventory?: { quantity: number } | null };
export type QuotationLineInput = {
  item_type: "SERVICE" | "PART"; service_id?: number; part_id?: number; description?: string; quantity: number; unit_price?: number;
  is_required?: boolean; required_reason?: string;
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

/**
 * Danh mục dịch vụ / phụ tùng: nhiều panel của chi tiết phiếu cùng cần → dùng chung một lần tải trong 30 giây
 * (tránh gọi lặp khi các bước đều được dựng sẵn). Lỗi thì bỏ cache để lần sau tải lại.
 */
const CATALOG_TTL_MS = 30_000;
const catalogCache = new Map<string, { at: number; promise: Promise<unknown> }>();
function cachedCatalog<T>(path: string): Promise<T> {
  const hit = catalogCache.get(path);
  if (hit && Date.now() - hit.at < CATALOG_TTL_MS) return hit.promise as Promise<T>;
  const promise = fetchApi<T>(path).catch(error => { catalogCache.delete(path); throw error; });
  catalogCache.set(path, { at: Date.now(), promise });
  return promise;
}

export const workflowApi = {
  order: (id: number) => fetchApi<WorkflowOrder>(`/repair-orders/${id}`),
  technicians: () => fetchApi<TechnicianOption[]>("/technicians"),
  services: () => cachedCatalog<CatalogService[]>("/services"),
  parts: () => cachedCatalog<CatalogPart[]>("/parts"),
  createQuotation: (id: number, payload: { discount_amount?: number; items: QuotationLineInput[]; type?: "INITIAL" | "SUPPLEMENT"; reason?: string; stays_overnight?: boolean }) =>
    fetchApi<WorkflowQuotation>(`/repair-orders/${id}/quotations`, { method: "POST", body: JSON.stringify(payload) }),
  /** P5: dịch vụ nhanh — báo giá niêm yết, bỏ chẩn đoán (backend kiểm điều kiện). */
  quickQuotation: (id: number, serviceIds: number[]) =>
    fetchApi<WorkflowQuotation>(`/repair-orders/${id}/quick-quotation`, { method: "POST", body: JSON.stringify({ service_ids: serviceIds }) }),
  /** Sửa báo giá nháp (chưa gửi khách): thay toàn bộ dòng + giảm giá. */
  updateQuotation: (quotationId: number, payload: { discount_amount?: number; items: QuotationLineInput[]; stays_overnight?: boolean }) =>
    fetchApi<WorkflowQuotation>(`/quotations/${quotationId}`, { method: "PUT", body: JSON.stringify(payload) }),
  sendQuotation: (quotationId: number) => fetchApi<WorkflowQuotation & { emailed_to?: string | null }>(`/quotations/${quotationId}/send`, { method: "POST" }),
  // Không có "respondQuotation" phía nhân viên: chỉ khách duyệt báo giá (customerApi.respondQuotation → /me/...).
  transition: (id: number, step: "start-repair" | "waiting-for-parts" | "resume" | "complete" | "hand-over", note?: string) =>
    fetchApi<WorkflowOrder>(`/repair-orders/${id}/${step}`, { method: "POST", body: JSON.stringify(note ? { note } : {}) }),
  /** ADV-01 (D-020): chờ phụ tùng phải có ≥ 1 yêu cầu đang mở — gửi kèm phụ tùng thiếu nếu chưa có. */
  waitForParts: (id: number, parts: ShortagePartInput[], note?: string) =>
    fetchApi<WorkflowOrder>(`/repair-orders/${id}/waiting-for-parts`, { method: "POST", body: JSON.stringify({ parts, ...(note ? { note } : {}) }) }),
  /** Cố vấn báo thiếu phụ tùng (kho / Admin đặt hàng và nhận hàng). */
  reportPartShortage: (id: number, input: ShortagePartInput) =>
    fetchApi<PartRequestRow>(`/repair-orders/${id}/part-requests`, { method: "POST", body: JSON.stringify(input) }),
  /** Rút lại báo thiếu khi kho chưa đặt hàng. */
  cancelPartRequest: (requestId: number, reason: string) =>
    fetchApi<PartRequestRow>(`/part-requests/${requestId}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }),
  /** Kiểm tra sau sửa chữa — phải tick đủ mọi hạng mục (QUALITY_ITEMS) trước khi bàn giao. */
  qualityCheck: (id: number, items: string[], note?: string) =>
    fetchApi<WorkflowOrder>(`/repair-orders/${id}/quality-check`, { method: "POST", body: JSON.stringify({ items, ...(note ? { note } : {}) }) }),
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
  /** Thu tại quầy (PO 17/11/2026): trừ tiền mặt bắt buộc mã giao dịch. */
  payAtCounter: (invoiceId: number, method: CounterMethod, amount: number, transactionCode?: string) =>
    fetchApi<WorkflowPayment>(`/invoices/${invoiceId}/payments`, { method: "POST", body: JSON.stringify({ payment_method: method, amount, ...(transactionCode ? { transaction_code: transactionCode } : {}) }) }),
  assignTechnician: (id: number, technicianId: number, note?: string) => fetchApi(`/repair-orders/${id}/assign-technician`, {
    method: "POST", body: JSON.stringify({ technician_id: technicianId, note: note || null }),
  }),
};
