import { useState } from "react";
import { Button, ErrorState, Field, Input, LoadingState } from "../../components/ui";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, errorMessage, type ReschedulePolicy } from "../../services/adminApi";
import { Panel } from "./kit/AdminKit";
import { useAdminQuery } from "./kit/useAdminQuery";

/**
 * Giới hạn khách TỰ đổi lịch trên web (chỉ khi lịch còn Chờ xác nhận): số lần tối đa mỗi lịch + hạn chót trước giờ hẹn.
 * Quá giới hạn khách phải liên hệ gara, cố vấn đổi giúp (đã thống nhất với khách).
 */
export function ReschedulePolicyPanel() {
  const { notify } = useAppFeedback();
  const query = useAdminQuery("reschedule-policy", signal => adminApi.reschedulePolicy(signal));
  const policy = query.data ?? query.stale;
  const [draft, setDraft] = useState<{ limit: string; cutoff_hours: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const value = draft ?? (policy ? { limit: String(policy.limit), cutoff_hours: String(policy.cutoff_hours) } : null);
  const changed = !!draft && !!policy && (draft.limit !== String(policy.limit) || draft.cutoff_hours !== String(policy.cutoff_hours));

  async function save() {
    if (!value) return;
    const body: ReschedulePolicy = { limit: Number(value.limit), cutoff_hours: Number(value.cutoff_hours) };
    setSaving(true); setError("");
    try {
      const response = await adminApi.saveReschedulePolicy(body);
      notify(response.message, "success");
      setDraft(null);
      query.reload();
    } catch (err) { setError(errorMessage(err, "Không lưu được giới hạn đổi lịch.")); }
    finally { setSaving(false); }
  }

  return <Panel title="Khách tự đổi lịch" icon="calendar" subtitle="Giới hạn khách tự đổi ngày giờ trên web khi lịch còn chờ xác nhận.">
    {!value ? (query.error ? <ErrorState compact description={query.error} onRetry={query.reload}/> : <LoadingState compact/>) :
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Số lần tự đổi tối đa / lịch" hint="0 = khách không tự đổi được.">
            <Input type="number" min={0} max={10} value={value.limit} onChange={e => setDraft({ ...value, limit: e.target.value })}/>
          </Field>
          <Field label="Hạn chót trước giờ hẹn (giờ)" hint="Sát giờ hơn thì khách phải liên hệ gara.">
            <Input type="number" min={0} max={168} value={value.cutoff_hours} onChange={e => setDraft({ ...value, cutoff_hours: e.target.value })}/>
          </Field>
        </div>
        <p className="rounded-control bg-cs-surface-2 p-3 text-caption text-cs-text-2">
          Lịch đã được gara xác nhận thì khách không tự đổi; cố vấn đổi giúp sau khi thống nhất với khách. Mỗi lần khách tự đổi đều được ghi lịch sử.
        </p>
        {error && <p role="alert" className="rounded-control bg-danger-soft p-3 text-small text-danger-fg">{error}</p>}
        <div className="flex justify-end gap-2">
          {changed && <Button disabled={saving} onClick={() => { setDraft(null); setError(""); }}>Huỷ</Button>}
          <Button variant="primary" icon="check" loading={saving} loadingText="Đang lưu..." disabled={!changed} onClick={() => void save()}>Lưu giới hạn</Button>
        </div>
      </div>}
  </Panel>;
}
