import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { fetchApi } from "../../services/api";

type Step = { name: string; standard_minutes: number; requires_photo?: boolean };

/**
 * Bước chuẩn + phút chuẩn của dịch vụ (P5). Khi bắt đầu sửa, mỗi bước thành một công việc;
 * giờ dự kiến xong tính từ tổng phút chuẩn. Không ảnh hưởng giá.
 */
export function ServiceStepsEditor({ serviceId, onSaved }: { serviceId: number; onSaved?: (estimatedMinutes: number | null) => void }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetchApi<{ data: Step[] }>(`/admin/services/${serviceId}/steps`)
      .then(response => { if (active) { setSteps(response.data.map(({ name, standard_minutes, requires_photo }) => ({ name, standard_minutes, requires_photo }))); setLoaded(true); } })
      .catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [serviceId]);

  async function save() {
    setSaving(true); setMessage("");
    try {
      const response = await fetchApi<{ service: { estimated_minutes: number | null } }>(`/admin/services/${serviceId}/steps`, {
        method: "PUT", body: JSON.stringify({ steps: steps.filter(step => step.name.trim()) }),
      });
      onSaved?.(response.service.estimated_minutes);
      setMessage("Đã lưu các bước.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không lưu được.");
    } finally { setSaving(false); }
  }

  const set = (index: number, patch: Partial<Step>) => setSteps(steps.map((step, i) => i === index ? { ...step, ...patch } : step));
  const field = "rounded-lg border border-cs-border bg-cs-surface-2 px-2 py-1.5 text-sm";

  return <div className="border-t border-cs-border pt-3" data-testid="service-steps-editor">
    <dt className="text-xs text-cs-muted">Quy trình chuẩn (bước + phút)</dt>
    {!loaded ? <p className="mt-1 text-xs text-cs-muted">Đang tải…</p> : <dd className="mt-2 space-y-2">
      {steps.map((step, index) => <div key={index} className="flex flex-wrap items-center gap-2">
        <span className="w-5 text-xs text-cs-muted">{index + 1}.</span>
        <input className={`${field} min-w-40 flex-1`} aria-label="Tên bước" maxLength={150} value={step.name} onChange={e => set(index, { name: e.target.value })}/>
        <input className={`${field} w-20`} aria-label="Phút chuẩn" type="number" min={0} max={1440} value={step.standard_minutes} onChange={e => set(index, { standard_minutes: Number(e.target.value) || 0 })}/>
        <span className="text-xs text-cs-muted">phút</span>
        <Button size="sm" variant="ghost" aria-label="Xóa bước" onClick={() => setSteps(steps.filter((_, i) => i !== index))}>✕</Button>
      </div>)}
      {!steps.length && <p className="text-xs text-cs-muted">Chưa có bước. Công việc sẽ dùng "Thời gian dự kiến" của dịch vụ.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => setSteps([...steps, { name: "", standard_minutes: 15 }])}>Thêm bước</Button>
        <Button size="sm" variant="primary" loading={saving} onClick={() => void save()}>Lưu quy trình</Button>
        {message && <span className="text-xs text-cs-muted" role="status">{message}</span>}
      </div>
    </dd>}
  </div>;
}
