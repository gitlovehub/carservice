import type { CounterCustomer, CounterVehicle, NewCustomerInput, NewVehicleInput } from "../../services/workflowService";
import { emptySelection, type VehicleSelection } from "../../services/vehicleCatalog";

/** Biểu mẫu tại quầy (ADV-02/03): khách vãng lai mới, xe chưa có trong hệ thống. */
export type NewVehicleDraft = { selection: VehicleSelection; plate: string; year: string; vin: string };
export const emptyVehicleDraft: NewVehicleDraft = { selection: emptySelection, plate: "", year: "", vin: "" };

/** Phần ghi nhận khi tiếp nhận xe: ODO, năm / VIN còn thiếu, lời khách, tình trạng xe. */
export type ReceptionDraft = { mileage: string; year: string; vin: string; customerRequest: string; condition: string };
export const emptyReceptionDraft: ReceptionDraft = { mileage: "", year: "", vin: "", customerRequest: "", condition: "" };
export type ReceptionVehicle = { year?: number | null; vin?: string | null; mileage?: number | null };
export const RECEPTION_API_FIELDS: Record<string, string> = {
  mileage_received: "mileage", vehicle_year: "receptionYear", vehicle_vin: "receptionVin",
  customer_request: "customerRequest", initial_condition: "condition",
};

export type NewCustomerDraft = { name: string; phone: string; email: string };
export const emptyCustomerDraft: NewCustomerDraft = { name: "", phone: "", email: "" };

/** Lựa chọn khách + xe tại quầy (CustomerVehiclePicker). */
export type CounterPick = {
  customer: CounterCustomer | "new" | null; newCustomer: NewCustomerDraft;
  vehicleId: number | "new" | null; newVehicle: NewVehicleDraft;
};
export const emptyPick: CounterPick = { customer: null, newCustomer: emptyCustomerDraft, vehicleId: null, newVehicle: emptyVehicleDraft };

/** Phần khách + xe của payload gửi backend (khách / xe mới tạo cùng giao dịch). */
export function pickPayload(pick: CounterPick) {
  return {
    ...(pick.customer === "new" ? { customer: toNewCustomer(pick.newCustomer) } : { customer_id: (pick.customer as CounterCustomer).id }),
    ...(pick.vehicleId === "new" ? { vehicle: toNewVehicle(pick.newVehicle) } : { vehicle_id: pick.vehicleId as number }),
  };
}

export const vehicleTitle = (v: CounterVehicle) => [v.model?.brand?.name, v.model?.name, v.trim?.name || v.variant].filter(Boolean).join(" ") || "Chưa rõ dòng xe";

const PLATE =/^[0-9A-Z][0-9A-Z.\- ]{3,18}$/;
const PHONE = /^[0-9+\s.-]{8,20}$/;
/** VIN chuẩn 17 ký tự (không có I, O, Q) hoặc số khung xe đời cũ 6–16 chữ và số. */
const VIN = /^(?:[A-HJ-NPR-Z0-9]{17}|[A-Z0-9]{6,16})$/;
const yearIsValid = (year: string) => /^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= new Date().getFullYear() + 1;

/** VIN khi gõ: viết hoa, bỏ khoảng trắng, tối đa 17 ký tự. */
export const formatVin = (text: string) => text.replace(/\s/g, "").toUpperCase().slice(0, 17);
const vinProblem = (vin: string) => !vin ? "Nhập số VIN của xe." : VIN.test(vin) ? null : "Số VIN gồm 6–17 chữ và số (đủ 17 ký tự thì không có I, O, Q).";

/** Lỗi theo từng ô của xe mới (backend vẫn kiểm lại). Tiếp nhận: bắt buộc năm + VIN, biển số không bắt buộc. */
export function vehicleDraftProblems({ selection, plate, year, vin }: NewVehicleDraft, atReception = false): Record<string, string> {
  const problems: Record<string, string> = {};
  if (selection.modelId === null) problems.vehicleModel = "Chọn hãng và dòng xe khách mang tới.";
  const cleanPlate = plate.trim().toUpperCase();
  if ((!atReception || cleanPlate) && !PLATE.test(cleanPlate)) problems.vehiclePlate = "Nhập biển số xe hợp lệ (ví dụ 51K-123.45).";
  const y = year.trim();
  if (atReception && !y) problems.vehicleYear = "Nhập năm sản xuất của xe.";
  else if (y && !yearIsValid(y)) problems.vehicleYear = "Năm sản xuất không hợp lệ.";
  if (atReception) {
    const issue = vinProblem(vin.trim());
    if (issue) problems.vehicleVin = issue;
  }
  return problems;
}

/** Lỗi phần ghi nhận khi tiếp nhận: ODO luôn bắt buộc; năm / VIN chỉ hỏi khi hồ sơ xe có sẵn còn thiếu. */
export function receptionProblems(draft: ReceptionDraft, vehicle: ReceptionVehicle | null, isNewVehicle: boolean): Record<string, string> {
  const problems: Record<string, string> = {};
  const mileage = draft.mileage.trim();
  if (!mileage) problems.mileage = "Nhập số ODO khi tiếp nhận xe.";
  else if (!/^\d+$/.test(mileage)) problems.mileage = "Số ODO phải là số nguyên không âm.";
  if (isNewVehicle) return problems;
  if (!vehicle?.year) {
    const year = draft.year.trim();
    if (!year) problems.receptionYear = "Nhập năm sản xuất của xe.";
    else if (!yearIsValid(year)) problems.receptionYear = "Năm sản xuất không hợp lệ.";
  }
  if (!vehicle?.vin) {
    const issue = vinProblem(draft.vin.trim());
    if (issue) problems.receptionVin = issue;
  }
  return problems;
}

/** Phần ghi nhận trong payload tạo phiếu. */
export function receptionPayload(draft: ReceptionDraft, vehicle: ReceptionVehicle | null, isNewVehicle: boolean) {
  return {
    mileage_received: Number(draft.mileage),
    ...(!isNewVehicle && !vehicle?.year ? { vehicle_year: Number(draft.year) } : {}),
    ...(!isNewVehicle && !vehicle?.vin ? { vehicle_vin: draft.vin.trim() } : {}),
    ...(draft.customerRequest.trim() ? { customer_request: draft.customerRequest.trim() } : {}),
    ...(draft.condition.trim() ? { initial_condition: draft.condition.trim() } : {}),
  };
}

/** Lỗi theo từng ô của phần khách + xe, để tô đỏ đúng ô thay vì báo chung đầu form. */
export function pickProblems(pick: CounterPick, atReception = false): Record<string, string> {
  const problems: Record<string, string> = {};
  if (pick.customer === null) problems.customer = "Chọn khách hàng hoặc thêm khách mới.";
  if (pick.customer === "new") {
    const { name, phone, email } = pick.newCustomer;
    if (name.trim().length < 2) problems.newName = "Nhập họ tên khách.";
    if (!PHONE.test(phone.trim())) problems.newPhone = "Nhập số điện thoại hợp lệ.";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) problems.newEmail = "Email không hợp lệ.";
  }
  if (pick.customer !== null && pick.vehicleId === null) problems.vehicle = "Chọn xe của khách.";
  return pick.vehicleId === "new" ? { ...problems, ...vehicleDraftProblems(pick.newVehicle, atReception) } : problems;
}

/** Lỗi máy chủ của khách / xe mới → đúng ô trong form. */
export const PICK_API_FIELDS: Record<string, string> = {
  customer_id: "customer", vehicle_id: "vehicle",
  "customer.full_name": "newName", "customer.phone": "newPhone", "customer.email": "newEmail",
  "vehicle.model_id": "vehicleModel", "vehicle.trim_id": "vehicleModel", "vehicle.license_plate": "vehiclePlate", "vehicle.year": "vehicleYear", "vehicle.vin": "vehicleVin",
};

export const toNewVehicle = (draft: NewVehicleDraft): NewVehicleInput => ({
  model_id: draft.selection.modelId as number,
  trim_id: draft.selection.trimId,
  ...(draft.plate.trim() ? { license_plate: draft.plate.trim().toUpperCase() } : {}),
  ...(draft.year.trim() ? { year: Number(draft.year) } : {}),
  ...(draft.vin.trim() ? { vin: draft.vin.trim() } : {}),
});

export const toNewCustomer = (draft: NewCustomerDraft): NewCustomerInput => ({
  full_name: draft.name.trim(),
  phone: draft.phone.trim(),
  ...(draft.email.trim() ? { email: draft.email.trim() } : {}),
});
