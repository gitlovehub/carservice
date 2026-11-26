import { ToastError } from "../../../components/ui/ToastError";
import { useEffect, useMemo, useState } from "react";
import { Button, Field, Input, Modal, Select, Switch, Textarea } from "../../../components/ui";
import { useAppFeedback } from "../../../components/ui/feedbackContext";
import { errorMessage } from "../../../services/adminApi";
import {
  catalogAdminApi, money, serviceActivationProblems, type AdminService, type ServiceCategory, type ServiceLevel, type ServicePayload,
} from "../../../services/catalogAdminApi";
import { ServiceStepsEditor } from "../ServiceStepsEditor";
import { useFieldErrors, type FieldErrors } from "../../../components/ui/useFieldErrors";
import { FieldError } from "../../../components/ui/Field";

const LEVEL_TEXT: Record<ServiceLevel, string> = { QUICK: "Nhanh (không cần chẩn đoán)", STANDARD: "Tiêu chuẩn", MAJOR: "Sửa lớn" };

type Form = { name: string; category_id: string; description: string; base_price: string; estimated_minutes: string; status: boolean; is_visible: boolean; service_level: ServiceLevel };
const toForm = (s: AdminService | null, categoryId: number | null): Form => ({
  name: s?.name ?? "", category_id: String(s?.category_id ?? categoryId ?? ""), description: s?.description ?? "",
  base_price: s ? String(Math.round(Number(s.base_price))) : "", estimated_minutes: s?.estimated_minutes ? String(s.estimated_minutes) : "",
  // Dịch vụ mới luôn bắt đầu tắt cả 2 trạng thái; admin bật lần lượt: Đang áp dụng → Hiển thị.
  status: s?.status === "ACTIVE", is_visible: s?.status === "ACTIVE" && (s.is_visible ?? true), service_level: s?.service_level ?? "STANDARD",
});
const priceDigits = (text: string) => text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
const groupPrice = (digits: string) => digits.replace(/\B(?=(\d{3})+$)/g, ".");

/** Thêm / sửa dịch vụ. `service = null` → thêm mới (mặc định vào danh mục đang chọn). */
export function ServiceFormModal({ open, service, categories, defaultCategoryId, onClose, onSaved }: {
  open: boolean; service: AdminService | null; categories: ServiceCategory[]; defaultCategoryId: number | null;
  onClose: () => void; onSaved: (service: AdminService) => void;
}) {
  const { confirm, notify } = useAppFeedback();
  const [initialForm] = useState<Form>(() => toForm(service, defaultCategoryId));
  const [form, setForm] = useState<Form>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fieldErrors = useFieldErrors();
  const set = (patch: Partial<Form>) => { setForm(f => ({ ...f, ...patch })); setError(""); fieldErrors.clear(...Object.keys(patch)); };
  const hasSteps = (service?.steps_count ?? 0) > 0;
  const missing = serviceActivationProblems(form);
  // Bỏ danh mục thì dịch vụ về nháp; tắt Đang áp dụng thì Hiển thị tắt theo.
  const changeCategory = (category_id: string) => set(category_id ? { category_id } : { category_id, status: false, is_visible: false });
  const changeStatus = (on: boolean) => set(on ? { status: true } : { status: false, is_visible: false });

  // Định dạng lại làm con trỏ nhảy về cuối, nên đặt lại đúng vị trí theo số chữ số đứng trước nó.
  const changePrice = (input: HTMLInputElement) => {
    const digitsBefore = priceDigits(input.value.slice(0, input.selectionStart ?? input.value.length)).length;