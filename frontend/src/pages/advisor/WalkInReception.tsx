import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { receiveWalkIn, type CounterVehicle } from "../../services/workflowService";
import { CustomerVehiclePicker } from "./CustomerVehiclePicker";
import { emptyPick, emptyReceptionDraft, PICK_API_FIELDS, pickPayload, pickProblems, RECEPTION_API_FIELDS, receptionPayload, receptionProblems, type CounterPick } from "./counterForms";
import { ReceptionFields } from "./ReceptionFields";
import { card, Notice } from "./WorkflowUI";
import { useFieldErrors } from "../../components/ui/useFieldErrors";

/**
 * ADV-02 — Tiếp nhận khách vãng lai (không đặt lịch): chọn / tạo khách + xe (CustomerVehiclePicker),
 * ghi số km + tình trạng khách kể → tạo phiếu RECEIVED. Khách / xe mới được tạo cùng phiếu trong một giao dịch.
 */
export function WalkInReception() {
  const navigate = useNavigate();
  const { confirm } = useAppFeedback();
  const [pick, setPick] = useState<CounterPick>(emptyPick);
  const [ownVehicles, setOwnVehicles] = useState<CounterVehicle[]>([]);
  const [reception, setReception] = useState(emptyReceptionDraft);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const fieldErrors = useFieldErrors();
  const isNewVehicle = pick.vehicleId === "new";
  const chosenVehicle = isNewVehicle ? null : ownVehicles.find(v => v.id === pick.vehicleId) ?? null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (working) return;
    const pickIssues = pickProblems(pick, true);
    if (Object.keys(pickIssues).length) { setError(""); fieldErrors.show(pickIssues); return; }
    const busy = pick.vehicleId !== "new" ? ownVehicles.find(v => v.id === pick.vehicleId)?.open_repair_order_code : null;
    if (busy) { fieldErrors.general(`Xe này đang có phiếu ${busy} chưa kết thúc — mở phiếu đó thay vì tạo phiếu mới.`); return; }
    setError("");
    if (fieldErrors.show(receptionProblems(reception, chosenVehicle, isNewVehicle))) return;

    const who = pick.customer === "new" ? pick.newCustomer.name.trim() : pick.customer?.full_name;
    const plate = pick.vehicleId === "new" ? pick.newVehicle.plate.trim().toUpperCase() : ownVehicles.find(v => v.id === pick.vehicleId)?.license_plate;
    const approved = await confirm({
      title: "Tạo phiếu tiếp nhận khách vãng lai",
      description: `Tạo phiếu sửa chữa cho ${who} · xe ${plate || "xxx.xx"}.${pick.customer === "new" ? " Hồ sơ khách mới được tạo cùng lúc." : ""}${pick.vehicleId === "new" ? " Xe mới được thêm vào hồ sơ khách." : ""} Bước tiếp theo: lập biên bản nhận xe để khách xác nhận.`,
      confirmText: "Tạo phiếu", checklist: ["Khách và xe đang có mặt tại gara.", "Đã đối chiếu ODO và số VIN với xe thực tế."],
    });
    if (!approved) return;
    setWorking(true); setError("");
    try {
      const order = await receiveWalkIn({
        ...pickPayload(pick),
        ...receptionPayload(reception, chosenVehicle, isNewVehicle),
      });
      navigate(`/advisor/service-orders/${order.id}`, { state: { success: "Đã tạo phiếu tiếp nhận khách vãng lai. Lập biên bản nhận xe để khách xác nhận." } });
    } catch (err) { fieldErrors.showApi(err, { ...PICK_API_FIELDS, ...RECEPTION_API_FIELDS }); }
    finally { setWorking(false); }
  }

  return <form noValidate onSubmit={event => void submit(event)} className="mx-auto max-w-3xl space-y-5" data-testid="walk-in">
    {error && <Notice tone="error">{error}</Notice>}
    <CustomerVehiclePicker value={pick} onChange={setPick} blockBusyVehicles onVehiclesLoaded={setOwnVehicles} errors={fieldErrors.errors} onClearError={fieldErrors.clear}/>
    {pick.customer !== null && pick.vehicleId !== null && <section className={card}>
      <h2 className="text-lg font-bold text-cs-text">Tiếp nhận</h2>
      <div className="mt-4"><ReceptionFields value={reception} onChange={setReception} errors={fieldErrors.errors} onClearError={key => fieldErrors.clear(key)} vehicle={chosenVehicle} isNewVehicle={isNewVehicle} hasBooking={false}/></div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <p className="mr-auto text-caption text-cs-muted">Phiếu tạo ở trạng thái Đã tiếp nhận · nguồn: khách vãng lai.</p>
        <Button type="submit" variant="primary" iconRight="arrow-right" loading={working} loadingText="Đang tạo phiếu...">Tạo phiếu tiếp nhận</Button>
      </div>
    </section>}
  </form>;
}
