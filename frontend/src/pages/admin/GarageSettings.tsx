import { useFieldErrors, type FieldErrors } from "../../components/ui/useFieldErrors";
import { FieldError } from "../../components/ui/Field";
import { useEffect, useState, type FormEvent } from "react";
import { Button, EmptyState, PageHeader } from "../../components/ui";
import { AddressAutocomplete } from "../../components/address/AddressAutocomplete";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { garageApi, type GarageInfo } from "../../services/garageService";

type Form = GarageInfo & { place_provider?: string | null; place_id?: string | null };
const empty: Form = { name: "CarService", phone: "", email: "", address_line: "", ward: "", district: "", province: "", latitude: null, longitude: null };

/** Tạm đóng trang để nâng cấp. Đổi về `false` để mở lại form (code form vẫn giữ nguyên bên dưới). */
const UNDER_MAINTENANCE = true;

/** Admin: thông tin gara hiển thị cho khách (Footer, Liên hệ) — hiện đang tạm đóng để bảo trì. */
export default function GarageSettings() {
  if (UNDER_MAINTENANCE) return <main className="page-container">
    <PageHeader title="Thông tin gara"/>
    <div className="rounded-card border border-cs-border bg-cs-surface shadow-card" data-testid="garage-settings-maintenance">
      <EmptyState icon="wrench" title="Trang đang nâng cấp, bảo trì"
        description="Chức năng chỉnh sửa thông tin gara tạm thời chưa sử dụng được. Thông tin hiện tại vẫn hiển thị bình thường cho khách. Vui lòng quay lại sau."/>
    </div>