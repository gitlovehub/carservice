import { useEffect, useState } from "react";
import { Button, IconButton } from "../../components/ui/Button";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { fetchApi } from "../../services/api";

type Step = { name: string; standard_minutes: number; requires_photo?: boolean };

const clean = (steps: Step[]) => steps.map(step => ({ ...step, name: step.name.trim(), requires_photo: !!step.requires_photo }));

/** Lỗi của từng dòng: tên trống, trùng tên (không phân biệt hoa thường), phút ngoài 1–1440. */
function stepProblem(step: Step, index: number, steps: Step[]): string | null {
  const name = step.name.trim().toLocaleLowerCase("vi");
  if (!name) return "Nhập tên bước.";
  if (steps.findIndex(other => other.name.trim().toLocaleLowerCase("vi") === name) !== index) return "Tên bước bị trùng.";
  if (!Number.isInteger(step.standard_minutes) || step.standard_minutes < 1 || step.standard_minutes > 1440) return "Phút chuẩn phải từ 1 đến 1440.";
  return null;
}

/**
 * Bước chuẩn + phút chuẩn của dịch vụ (P5). Khi bắt đầu sửa, mỗi bước thành một công việc;
 * giờ dự kiến xong tính từ tổng phút chuẩn. Không ảnh hưởng giá.
 */
export function ServiceStepsEditor({ serviceId, onSaved, onDirtyChange }: {
  serviceId: number; onSaved?: (estimatedMinutes: number | null, stepsCount: number) => void; onDirtyChange?: (dirty: boolean) => void;
}) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [savedSteps, setSavedSteps] = useState<Step[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const { notify } = useAppFeedback();

  useEffect(() => {
    let active = true;
    fetchApi<{ data: Step[] }>(`/admin/services/${serviceId}/steps`)
      .then(response => {
        if (!active) return;
        const rows = response.data.map(({ name, standard_minutes, requires_photo }) => ({ name, standard_minutes, requires_photo }));
        setSteps(rows); setSavedSteps(rows); setLoaded(true);
      })
      // Tải lỗi thì không mở trình sửa: danh sách rỗng mà lưu sẽ xóa mất các bước đang có.
      .catch(() => { if (active) { setLoadFailed(true); setLoaded(true); } });
    return () => { active = false; };
  }, [serviceId, attempt]);

  const dirty = loaded && !loadFailed && JSON.stringify(clean(steps)) !== JSON.stringify(clean(savedSteps));
  const problems = steps.map(stepProblem);
  const invalid = problems.some(Boolean);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  async function save() {
    const next = clean(steps);
    setSaving(true);
    try {
      const response = await fetchApi<{ service: { estimated_minutes: number | null } }>(`/admin/services/${serviceId}/steps`, {
        method: "PUT", body: JSON.stringify({ steps: next }),
      });
      setSteps(next); setSavedSteps(next);
      onSaved?.(response.service.estimated_minutes, next.length);
      notify(`Đã lưu ${next.length} bước chuẩn của dịch vụ (tổng ${next.reduce((sum, step) => sum + step.standard_minutes, 0)} phút).`, "success");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Không lưu được các bước chuẩn.", "error");
    } finally { setSaving(false); }
  }

  const set = (index: number, patch: Partial<Step>) => setSteps(steps.map((step, i) => i === index ? { ...step, ...patch } : step));
  const field = "rounded-lg border border-cs-border bg-cs-surface-2 px-2 py-1.5 text-sm";
  const retry = () => { setLoadFailed(false); setLoaded(false); setAttempt(n => n + 1); };

  return <div className="border-t border-cs-border pt-3" data-testid="service-steps-editor">
    <dt className="text-xs text-cs-muted">Quy trình chuẩn (bước + phút)</dt>
    {!loaded ? <p className="mt-1 text-xs text-cs-muted">Đang tải…</p>
      : loadFailed ? <dd className="mt-2 flex flex-wrap items-center gap-2">
        <p role="alert" className="text-small text-danger-fg">Không tải được quy trình. Tải lại trước khi chỉnh sửa.</p>
        <Button size="sm" variant="tonal" icon="refresh" onClick={retry}>Thử lại</Button>
      </dd>
      : <dd className="mt-2 space-y-2">
      {steps.map((step, index) => <div key={index}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-5 text-xs text-cs-muted">{index + 1}.</span>
          <input className={`${field} min-w-40 flex-1`} aria-label="Tên bước" aria-invalid={!!problems[index] || undefined} maxLength={150} value={step.name} onChange={e => set(index, { name: e.target.value })}/>
          <input className={`${field} w-20`} aria-label="Phút chuẩn" aria-invalid={!!problems[index] || undefined} type="number" min={1} max={1440} value={step.standard_minutes} onChange={e => set(index, { standard_minutes: Number(e.target.value) || 0 })}/>
          <span className="text-xs text-cs-muted">phút</span>
          <IconButton size="sm" icon="trash" tone="danger" label="Xóa bước" onClick={() => setSteps(steps.filter((_, i) => i !== index))}/>
        </div>
        {problems[index] && <p role="alert" className="ml-7 mt-1 text-caption text-danger-fg">{problems[index]}</p>}
      </div>)}
      {!steps.length && <p className="text-xs text-cs-muted">Chưa có bước. Công việc sẽ dùng "Thời gian dự kiến" của dịch vụ.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="tonal" icon="plus" onClick={() => setSteps([...steps, { name: "", standard_minutes: 15 }])}>Thêm bước</Button>
        <Button size="sm" variant="primary" loading={saving} disabled={!dirty || invalid || saving} onClick={() => void save()}>Lưu quy trình</Button>
      </div>
    </dd>}
  </div>;
}
