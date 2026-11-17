import type { CounterCustomer, CounterVehicle, NewCustomerInput, NewVehicleInput } from "../../services/workflowService";
import { emptySelection, type VehicleSelection } from "../../services/vehicleCatalog";

/** Biểu mẫu tại quầy (ADV-02/03): khách vãng lai mới, xe chưa có trong hệ thống. */
export type NewVehicleDraft = { selection: VehicleSelection; plate: string; year: string };
export const emptyVehicleDraft: NewVehicleDraft = { selection: emptySelection, plate: "", year: "" };

export type NewCustomerDraft = { name: string; phone: string; email: string };
export const emptyCustomerDraft: NewCustomerDraft = { name: "", phone: "", email: "" };

/** Lựa chọn khách + xe tại quầy (CustomerVehiclePicker). */
export type CounterPick = {
  customer: CounterCustomer | "new" | null; newCustomer: NewCustomerDraft;
  vehicleId: number | "new" | null; newVehicle: NewVehicleDraft;
};
export const emptyPick: CounterPick = { customer: null, newCustomer: emptyCustomerDraft, vehicleId: null, newVehicle: emptyVehicleDraft };

/** Kiểm tra lựa chọn trước khi gửi; trả "" nếu hợp lệ. */
export function pickError(pick: CounterPick): string {
  if (pick.customer === null) return "Chọn khách hàng hoặc thêm khách mới.";
  if (pick.customer === "new") { const message = customerDraftError(pick.newCustomer); if (message) return message; }
  if (pick.vehicleId === null) return "Chọn xe của khách.";
  if (pick.vehicleId === "new") return vehicleDraftError(pick.newVehicle);
  return "";
}

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

/** Lỗi kiểm tra trước khi gửi (backend vẫn kiểm lại, kể cả trùng biển số / SĐT). */
export function vehicleDraftError(draft: NewVehicleDraft): string {
  if (draft.selection.modelId === null) return "Chọn hãng và dòng xe khách mang tới.";
  if (!PLATE.test(draft.plate.trim().toUpperCase())) return "Nhập biển số xe hợp lệ (ví dụ 51K-123.45).";
  const year = draft.year.trim();
  if (year && (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > new Date().getFullYear() + 1)) return "Năm sản xuất không hợp lệ.";
  return "";
}

export function customerDraftError(draft: NewCustomerDraft): string {
  if (draft.name.trim().length < 2) return "Nhập họ tên khách.";
  if (!PHONE.test(draft.phone.trim())) return "Nhập số điện thoại hợp lệ.";
  if (draft.email.trim() && !/^\S+@\S+\.\S+$/.test(draft.email.trim())) return "Email không hợp lệ.";
  return "";
}

export const toNewVehicle = (draft: NewVehicleDraft): NewVehicleInput => ({
  model_id: draft.selection.modelId as number,
  trim_id: draft.selection.trimId,
  license_plate: draft.plate.trim().toUpperCase(),
  ...(draft.year.trim() ? { year: Number(draft.year) } : {}),
});

export const toNewCustomer = (draft: NewCustomerDraft): NewCustomerInput => ({
  full_name: draft.name.trim(),
  phone: draft.phone.trim(),
  ...(draft.email.trim() ? { email: draft.email.trim() } : {}),
});
