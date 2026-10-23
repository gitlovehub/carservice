import { fetchApi } from "./api";
import { getAdvisorAppointment, getAdvisorAppointments, confirmAdvisorAppointment, checkInAdvisorAppointment } from "./advisorAppointmentService";

/** Laravel responses in backend/routes/api.php, RepairOrderController and AdvisorAppointmentController. */
export type AppointmentWorkflowStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CANCELLED";
export type WorkflowAppointment = {
  id: number;
  appointment_code?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: AppointmentWorkflowStatus;
  customer_id?: number | null;
  vehicle_id?: number | null;
  customer?: { id: number; full_name?: string; phone?: string } | null;
  vehicle?: { id: number; license_plate?: string; variant?: string } | null;
  symptom_description?: string | null;
  note?: string | null;
};
export type WorkflowInspection = {
  id: number; diagnosis?: string | null; condition_description?: string | null; inspected_at?: string | null;
  items?: Array<{ id: number; item_name: string; condition_status?: string | null; note?: string | null }>;
  recommendations?: Array<{ id: number; item_type?: string; quantity?: number; note?: string | null }>;
};
export type WorkflowOrder = {
  id: number;
  appointment_id?: number | null;
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
};
export type WorkflowPage<T> = { data: T[]; current_page: number; last_page: number; total: number };
export type ReceivePayload = {
  appointment_id: number;
  customer_id: number;
  vehicle_id: number;
  mileage_received?: number;
  initial_condition?: string;
  note?: string;
};

export async function advisorAppointment(id: number): Promise<WorkflowAppointment> {
  const response = await getAdvisorAppointment(id) as { data: WorkflowAppointment };
  if (!response?.data) throw new Error("API không trả thông tin lịch hẹn.");
  return response.data;
}

/** Index is pagination-based; do not silently assume a single page contains every matching order. */
export async function listWorkflowOrders(page = 1): Promise<WorkflowPage<WorkflowOrder>> {
  return fetchApi<WorkflowPage<WorkflowOrder>>(`/repair-orders?page=${page}`);
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
  if (data.customer_id !== actualCustomer || data.vehicle_id !== actualVehicle) throw new Error("Thông tin xe/khách không khớp lịch hẹn.");
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

export const workflowApi = {
  order: (id: number) => fetchApi<WorkflowOrder>(`/repair-orders/${id}`),
  assignTechnician: (id: number, technicianId: number, note?: string) => fetchApi(`/repair-orders/${id}/assign-technician`, {
    method: "POST", body: JSON.stringify({ technician_id: technicianId, note: note || null }),
  }),
};
