import { useAppFeedback } from "../../../components/ui/feedbackContext";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, Busy, Heading, StatusBadge, control, panel, primary, secondary } from "./TechnicianUI";
import { dateLabel, isNotFound, messageForError, technicianApi } from "./technicianApi";
import type { Inspection, InspectionItemStatus, InspectionPayload, RepairOrder } from "./technicianApi";

const itemStatuses: Array<[InspectionItemStatus, string]> = [
  ["PASSED", "Đạt"], ["WARNING", "Cần lưu ý"], ["FAILED", "Không đạt"],
  ["NORMAL", "Bình thường"], ["NEEDS_SERVICE", "Cần bảo dưỡng"], ["NEEDS_REPLACEMENT", "Cần thay thế"],
];
type Row = { item_name: string; status: InspectionItemStatus; condition_description: string; note: string };
const blank = (): Row => ({ item_name: "", status: "PASSED", condition_description: "", note: "" });

export default function TechnicianInspection() {
  const { confirm } = useAppFeedback();
  const navigate = useNavigate();
  const id = Number(useParams().orderId);
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [rows, setRows] = useState<Row[]>([blank()]);
  const [condition, setCondition] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [recommendationType, setRecommendationType] = useState<"SERVICE" | "PART">("SERVICE");
  const [recommendationId, setRecommendationId] = useState("");
  const [recommendationQuantity, setRecommendationQuantity] = useState("1");
  const [recommendationNote, setRecommendationNote] = useState("");
  const [recommendationMessage, setRecommendationMessage] = useState("");
  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) return;
    const abort = new AbortController(); let active = true;
    queueMicrotask(() => { if (active) { setBusy(true); setError(""); } });
    Promise.all([technicianApi.detail(id, abort.signal), technicianApi.inspection(id, abort.signal).catch(err => {
      if (isNotFound(err)) return null;
      throw err;
    })]).then(([detail, inspect]) => { if (active) { setOrder(detail); setInspection(inspect); } })
      .catch(err => { if (active && !abort.signal.aborted) setError(messageForError(err)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; abort.abort(); };
  }, [id, revision]);

  function updateRow(index: number, changes: Partial<Row>) {
    setRows(previous => previous.map((row, i) => i === index ? { ...row, ...changes } : row));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!order || inspection) return;
    if (rows.some(row => !row.item_name.trim())) { setError("Nhập tên cho tất cả hạng mục kiểm tra."); return; }
    setSaving(true); setError("");
    const payload: InspectionPayload = { condition_description: condition.trim(), diagnosis: diagnosis.trim(), inspection_items: rows.map(row => ({ ...row, item_name: row.item_name.trim() })) };
    try { await technicianApi.startInspection(id, payload); navigate(`/technician/orders/${id}`, { replace: true }); }
    catch (err) { setError(messageForError(err)); } finally { setSaving(false); }
  }
  async function addRecommendation(event: FormEvent) {
    event.preventDefault();
    if (!order || !inspection || inspection.inspected_at || order.status !== "INSPECTING" || saving) return;
    const relatedId = Number(recommendationId);
    const quantity = Number(recommendationQuantity);
    if (!Number.isSafeInteger(relatedId) || relatedId < 1 || !Number.isSafeInteger(quantity) || quantity < 1) {
      setError("Nhập ID danh mục và số lượng nguyên dương."); return;
    }
    setSaving(true); setError(""); setRecommendationMessage("");
    try {
      await technicianApi.addRecommendation(id, {
        item_type: recommendationType,
        ...(recommendationType === "SERVICE" ? { service_id: relatedId } : { part_id: relatedId }),
        quantity, ...(recommendationNote.trim() ? { note: recommendationNote.trim() } : {}),
      });
      setRecommendationMessage("Đã gửi đề xuất dịch vụ/phụ tùng lên Laravel.");
      setRecommendationId(""); setRecommendationNote(""); setRecommendationQuantity("1");
      setRevision(value => value + 1);
    } catch (err) { setError(messageForError(err)); }
    finally { setSaving(false); }
  }
  async function finish() {
    if (!inspection || !order || inspection.inspected_at || order.status !== "INSPECTING") return;
    if (!await confirm({ title: "Hoàn tất kiểm tra và chẩn đoán", description: "Kết thúc bước kiểm tra trên phiếu này và chuyển hồ sơ sang giai đoạn lập báo giá. Hãy đảm bảo thông tin chẩn đoán đã được lưu đầy đủ.", confirmText: "Hoàn tất kiểm tra", checklist: ["Tôi đã hoàn thành và rà soát các hạng mục kiểm tra."] })) return;
    setSaving(true); setError("");
    try { await technicianApi.finishInspection(id); setRevision(value => value + 1); }
    catch (err) { setError(messageForError(err)); } finally { setSaving(false); }
  }
  if (!Number.isSafeInteger(id) || id < 1) return <Alert>Mã phiếu không hợp lệ.</Alert>;
  return <>
    <div className="mb-5"><Link to={`/technician/orders/${id}`} className="text-sm text-ktv-highlight hover:underline">← Trở lại phiếu sửa chữa</Link></div>
    <Heading label="WORKSHOP / VEHICLE INSPECTION" title="Kiểm tra và chẩn đoán" description="Ghi nhận tình trạng xe và kết quả kiểm tra ban đầu. Tất cả dữ liệu được gửi tới Laravel." action={order && <StatusBadge status={order.status}/>}/>
    {busy && <Busy/>}{error && <div className="mb-5"><Alert retry={() => setRevision(v => v + 1)}>{error}</Alert></div>}
    {!busy && order && inspection && <section className={`${panel} p-6 sm:p-8`}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold text-ktv-strong">Phiếu kiểm tra #{inspection.id}</h2><StatusBadge status={inspection.inspected_at ? "COMPLETED" : "INSPECTING"}/></div>
      <p className="mt-3 text-sm text-ktv-muted">{inspection.inspected_at ? `Hoàn tất: ${dateLabel(inspection.inspected_at)}` : "Đang chẩn đoán"}</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2"><div><p className="text-xs text-ktv-subtle">Tình trạng ban đầu</p><p className="mt-2 text-sm text-ktv-text">{inspection.condition_description || "Không có ghi chú"}</p></div><div><p className="text-xs text-ktv-subtle">Kết luận</p><p className="mt-2 text-sm text-ktv-text">{inspection.diagnosis || "Chưa có kết luận"}</p></div></div>
      <h3 className="mt-8 mb-3 font-bold text-ktv-strong">Hạng mục kiểm tra</h3><div className="divide-y divide-ktv-line/60 rounded-xl border border-ktv-line/60">{inspection.items?.length ? inspection.items.map(item => <div className="flex flex-wrap justify-between gap-3 p-4" key={item.id}><div><strong className="text-sm text-ktv-text">{item.item_name}</strong>{item.condition_description && <p className="mt-1 text-xs text-ktv-muted">{item.condition_description}</p>}</div><span className="text-xs font-medium text-ktv-highlight">{itemStatuses.find(([value]) => value === item.condition_status)?.[1] || item.condition_status || "Chưa đánh giá"}</span></div>) : <p className="p-4 text-sm text-ktv-muted">Không có hạng mục nào.</p>}</div>
      {!!inspection.recommendations?.length && <div className="mt-6"><h3 className="mb-3 font-bold text-ktv-strong">Đề xuất đã ghi nhận</h3><div className="space-y-2">{inspection.recommendations.map(rec => <p key={rec.id} className="rounded-xl border border-ktv-line/60 bg-ktv-inset p-3 text-sm text-ktv-muted">{rec.item_type} · Số lượng {rec.quantity ?? 1} {rec.note ? `· ${rec.note}` : ""}</p>)}</div></div>}
      {!inspection.inspected_at && order.status === "INSPECTING" && <div className="mt-6 space-y-5 border-t border-ktv-line/60 pt-6">
        <div><h3 className="font-bold text-ktv-strong">Đề xuất hạng mục sửa chữa / phụ tùng</h3><p className="mt-1 text-xs text-ktv-muted">Gửi qua API hiện có; không đồng nghĩa khách đã duyệt báo giá hoặc xuất kho.</p></div>
        {recommendationMessage && <p role="status" className="text-sm text-ktv-highlight">{recommendationMessage}</p>}
        <form onSubmit={event => void addRecommendation(event)} className="grid gap-3 md:grid-cols-[1fr_1fr_100px]">
          <label className="text-xs font-semibold text-ktv-muted">Loại đề xuất<select className={`${control} mt-2`} value={recommendationType} onChange={e => { setRecommendationType(e.target.value as "SERVICE" | "PART"); setRecommendationId(""); }}><option value="SERVICE">Dịch vụ</option><option value="PART">Phụ tùng</option></select></label>
          <label className="text-xs font-semibold text-ktv-muted">{recommendationType === "SERVICE" ? "ID dịch vụ" : "ID phụ tùng"} *<input className={`${control} mt-2`} type="number" min="1" step="1" required value={recommendationId} onChange={e => setRecommendationId(e.target.value)} placeholder={recommendationType === "SERVICE" ? "services.id" : "parts.id"}/></label>
          <label className="text-xs font-semibold text-ktv-muted">Số lượng<input className={`${control} mt-2`} type="number" min="1" step="1" value={recommendationQuantity} onChange={e => setRecommendationQuantity(e.target.value)} required/></label>
          <label className="text-xs font-semibold text-ktv-muted md:col-span-3">Lý do đề xuất<input className={`${control} mt-2`} value={recommendationNote} onChange={e => setRecommendationNote(e.target.value)} placeholder="Giải thích hạng mục cần xử lý"/></label>
          <div className="md:col-span-3"><button type="submit" className={secondary} disabled={saving}>+ Thêm đề xuất</button></div>
        </form>
        <p className="text-xs leading-5 text-ktv-subtle">API chưa có danh sách phụ tùng riêng cho KTV; ID phải lấy từ danh mục thực trong hệ thống. Backend kiểm tra ID tồn tại.</p>
        <button type="button" className={primary} disabled={saving} onClick={() => void finish()}>{saving ? "Đang xử lý..." : "Hoàn tất kiểm tra và chuyển báo giá →"}</button>
      </div>}
    </section>}
    {!busy && order && !inspection && <section className={`${panel} p-5 sm:p-8`}>
      {!["RECEIVED", "INSPECTING"].includes(order.status) ? <Alert>Phiếu đang ở trạng thái {order.status}; Backend không cho tạo phiếu kiểm tra mới.</Alert> : <form onSubmit={event => void submit(event)} className="space-y-6">
        <div><h2 className="text-xl font-bold text-ktv-strong">Phiếu chẩn đoán mới</h2><p className="mt-2 text-sm text-ktv-muted">Mỗi phiếu sửa chữa chỉ được tạo một phiếu kiểm tra tổng thể.</p></div>
        <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold text-ktv-muted">Tình trạng tổng thể<textarea value={condition} onChange={e => setCondition(e.target.value)} rows={3} className={`${control} mt-2`} placeholder="Tình trạng khi tiếp nhận, kiểm tra thực tế..."/></label>
          <label className="text-sm font-semibold text-ktv-muted">Kết luận chẩn đoán<textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={3} className={`${control} mt-2`} placeholder="Nhận định nguyên nhân, hướng kiểm tra..."/></label></div>
        <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-ktv-strong">Hạng mục kiểm tra</h3><button className={secondary} type="button" onClick={() => setRows(prev => [...prev, blank()])}>+ Thêm hạng mục</button></div>
          <div className="space-y-4">{rows.map((row, index) => <div key={index} className="grid gap-3 rounded-xl border border-ktv-line/60 bg-ktv-inset p-4 sm:grid-cols-[1fr_180px]">
            <label className="text-xs font-semibold text-ktv-muted">Hạng mục *<input required maxLength={150} value={row.item_name} onChange={e => updateRow(index, { item_name: e.target.value })} className={`${control} mt-2`} placeholder="Ví dụ: Kiểm tra hệ thống phanh"/></label>
            <label className="text-xs font-semibold text-ktv-muted">Kết quả<select className={`${control} mt-2`} value={row.status} onChange={e => updateRow(index, { status: e.target.value as InspectionItemStatus })}>{itemStatuses.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs font-semibold text-ktv-muted sm:col-span-2">Tình trạng chi tiết<input maxLength={255} className={`${control} mt-2`} placeholder="Mô tả tình trạng" value={row.condition_description} onChange={e => updateRow(index, { condition_description: e.target.value })}/></label>
            {rows.length > 1 && <button type="button" className="justify-self-start text-xs font-semibold text-ktv-danger hover:underline" onClick={() => setRows(prev => prev.filter((_,i) => i !== index))}>Xóa hạng mục</button>}
          </div>)}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3"><button type="submit" className={primary} disabled={saving}>{saving ? "Đang lưu..." : "Lưu phiếu kiểm tra"}</button><Link to={`/technician/orders/${id}`} className={secondary}>Hủy</Link></div>
      </form>}
    </section>}
  </>;
}
