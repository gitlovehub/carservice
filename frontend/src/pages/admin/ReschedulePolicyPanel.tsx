import { useFieldErrors, type FieldErrors } from "../../components/ui/useFieldErrors";
import { useState } from "react";
import { Button, ErrorState, Field, Input, LoadingState } from "../../components/ui";
import { useAppFeedback } from "../../components/ui/feedbackContext";
import { adminApi, type ReschedulePolicy } from "../../services/adminApi";
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
  const fieldErrors = useFieldErrors();

  const value = draft ?? (policy ? { limit: String(policy.limit), cutoff_hours: String(policy.cutoff_hours) } : null);
  const changed = !!draft && !!policy && (draft.limit !== String(policy.limit) || draft.cutoff_hours !== String(policy.cutoff_hours));

  async function save() {
    if (!value) return;
    const body: ReschedulePolicy = { limit: Number(value.limit), cutoff_hours: Number(value.cutoff_hours) };
    const problems: FieldErrors = {};
    if (value.limit === "" || !Number.isInteger(body.limit) || body.limit < 0 || body.limit > 10) problems.limit = "Nhập số nguyên từ 0 đến 10.";
    if (value.cutoff_hours === "" || !Number.isInteger(body.cutoff_hours) || body.cutoff_hours < 0 || body.cutoff_hours > 168) problems.cutoff_hours = "Nhập số giờ nguyên từ 0 đến 168.";
    if (fieldErrors.show(problems)) return;
    setSaving(true);
    try {
      const response = await adminApi.saveReschedulePolicy(body);
      notify(response.message, "success");
      setDraft(null);
      query.reload();
    } catch (err) { fieldErrors.showApi(err, { limit: "limit", cutoff_hours: "cutoff_hours" }); }
    finally { setSaving(false); }
  }

  return <Panel title="Khách tự đổi lịch" icon="calendar" subtitle="Giới hạn khách tự đổi ngày giờ trên web khi lịch còn chờ xác nhận.">
    {!value ? (query.error ? <ErrorState compact description={query.error} onRetry={query.reload}/> : <LoadingState compact/>) :
      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Số lần tự đổi tối đa / lịch" error={fieldErrors.errors.limit} hint="0 = khách không tự đổi được.">
            <Input type="number" min={0} max={10} value={value.limit} onChange={e => { setDraft({ ...value, limit: e.target.value }); fieldErrors.clear("limit"); }}/>
          </Field>
          <Field label="Hạn chót trước giờ hẹn (giờ)" error={fieldErrors.errors.cutoff_hours} hint="Sát giờ hơn thì khách phải liên hệ gara.">
            <Input type="number" min={0} max={168} value={value.cutoff_hours} onChange={e => { setDraft({ ...value, cutoff_hours: e.target.value }); fieldErrors.clear("cutoff_hours"); }}/>
          </Field>
        </div>
        <p className="rounded-control bg-cs-surface-2 p-3 text-caption text-cs-text-2">
          Lịch đã được gara xác nhận thì khách không tự đổi; cố vấn đổi giúp sau khi thống nhất với khách. Mỗi lần khách tự đổi đều được ghi lịch sử.
        </p>
        <div className="flex justify-end gap-2">
          {changed && <Button disabled={saving} onClick={() => { setDraft(null); fieldErrors.reset(); }}>Huỷ</Button>}
          <Button variant="primary" icon="check" loading={saving} loadingText="Đang lưu..." disabled={!changed} onClick={() => void save()}>Lưu giới hạn</Button>
        </div>
      </div>}
  </Panel>;
}
