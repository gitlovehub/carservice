import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Field, Textarea } from "../../components/ui/Field";
import { KmInput } from "../../components/ui/QuantityStepper";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { receiveWalkIn, type CounterVehicle } from "../../services/workflowService";
import { CustomerVehiclePicker } from "./CustomerVehiclePicker";
import { emptyPick, pickError, pickPayload, type CounterPick } from "./counterForms";
import { card, Notice } from "./WorkflowUI";
import { errorText } from "./workflowFormat";

/**
 * ADV-02 — Tiếp nhận khách vãng lai (không đặt lịch): chọn / tạo khách + xe (CustomerVehiclePicker),
 * ghi số km + tình trạng khách kể → tạo phiếu RECEIVED. Khách / xe mới được tạo cùng phiếu trong một giao dịch.
 */
export function WalkInReception() {
  const navigate = useNavigate();
  const { confirm } = useAppFeedback();
  const [pick, setPick] = useState<CounterPick>(emptyPick);
  const [ownVehicles, setOwnVehicles] = useState<CounterVehicle[]>([]);
  const [mileage, setMileage] = useState("");
  const [condition, setCondition] = useState("");
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (working) return;
    const invalid = pickError(pick);
    if (invalid) { setError(invalid); return; }
    const busy = pick.vehicleId !== "new" ? ownVehicles.find(v => v.id === pick.vehicleId)?.open_repair_order_code : null;
    if (busy) { setError(`Xe này đang có phiếu ${busy} chưa kết thúc — mở phiếu đó thay vì tạo phiếu mới.`); return; }
    if (mileage.trim() && !/^\d+$/.test(mileage.trim())) { setError("Số km phải là số nguyên không âm."); return; }

    const who = pick.customer === "new" ? pick.newCustomer.name.trim() : pick.customer?.full_name;
    const plate = pick.vehicleId === "new" ? pick.newVehicle.plate.trim().toUpperCase() : ownVehicles.find(v => v.id === pick.vehicleId)?.license_plate;
    const approved = await confirm({
      title: "Tạo phiếu tiếp nhận khách vãng lai",
      description: `Tạo phiếu sửa chữa cho ${who} · xe ${plate || "—"}.${pick.customer === "new" ? " Hồ sơ khách mới được tạo cùng lúc." : ""}${pick.vehicleId === "new" ? " Xe mới được thêm vào hồ sơ khách." : ""} Bước tiếp theo: lập biên bản nhận xe để khách xác nhận.`,
      confirmText: "Tạo phiếu", checklist: ["Khách và xe đang có mặt tại gara.", "Đã đối chiếu biển số với xe thực tế."],
    });
    if (!approved) return;
    setWorking(true); setError("");
    try {
      const order = await receiveWalkIn({
        ...pickPayload(pick),
        ...(mileage.trim() ? { mileage_received: Number(mileage) } : {}),
        ...(condition.trim() ? { initial_condition: condition.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      navigate(`/advisor/service-orders/${order.id}`, { state: { success: "Đã tạo phiếu tiếp nhận khách vãng lai. Lập biên bản nhận xe để khách xác nhận." } });
    } catch (err) { setError(errorText(err)); }
    finally { setWorking(false); }
  }

  return <form onSubmit={event => void submit(event)} className="mx-auto max-w-3xl space-y-5" data-testid="walk-in">
    {error && <Notice tone="error">{error}</Notice>}
    <CustomerVehiclePicker value={pick} onChange={setPick} blockBusyVehicles onVehiclesLoaded={setOwnVehicles}/>
    {pick.customer !== null && pick.vehicleId !== null && <section className={card}>
      <h2 className="text-lg font-bold text-cs-text">Tiếp nhận</h2>
      <div className="mt-4 grid gap-4">
        <Field label="Số km hiện tại" optional><KmInput label="Số km hiện tại" value={mileage} onChange={setMileage}/></Field>
        <Field label="Khách mô tả tình trạng / yêu cầu" hint="Chỉ ghi lời khách kể. Hiện trạng xe (trầy, móp, phụ kiện) ghi ở biên bản nhận xe ngay sau bước này."><Textarea rows={3} maxLength={2000} value={condition} onChange={e => setCondition(e.target.value)} placeholder="VD: thay dầu; xe kêu khi phanh"/></Field>
        <Field label="Ghi chú nội bộ" optional><Textarea rows={2} maxLength={2000} value={note} onChange={e => setNote(e.target.value)}/></Field>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <p className="mr-auto text-caption text-cs-muted">Phiếu tạo ở trạng thái Đã tiếp nhận · nguồn: khách vãng lai.</p>
        <Button type="submit" variant="primary" iconRight="arrow-right" loading={working} loadingText="Đang tạo phiếu...">Tạo phiếu tiếp nhận</Button>
      </div>
    </section>}
  </form>;
}
