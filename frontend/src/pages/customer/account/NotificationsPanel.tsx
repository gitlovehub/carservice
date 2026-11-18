import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppFeedback } from "../../../components/ui/feedbackContext";
import { Icon } from "../../../components/ui/Icon";
import { formatDateTime } from "../../../services/customerApi";
import {
  clearCustomerNotifications, getCustomerNotifications, NOTIFICATION_GROUPS, notificationGroup, notificationTarget,
  readAllCustomerNotifications, readCustomerNotification, type CustomerNotification, type NotificationGroup,
} from "../../../services/customerNotifications";
import { useLiveRefresh } from "../../../services/liveSync";

type Filter = "all" | "unread" | NotificationGroup;
const LIMIT = 200;

/**
 * Hồ sơ > Thông báo: toàn bộ thông báo của khách (chuông chỉ xem nhanh 30 tin).
 * Lọc theo Chưa đọc / nhóm; bấm một dòng = như bấm trong chuông (đánh dấu đã đọc + mở đúng chi tiết);
 * "Đánh dấu đã đọc hết", "Xóa tất cả". Tự cập nhật khi có thông báo mới (đồng bộ nhanh).
 */
export function NotificationsPanel() {
  const { confirm, notify } = useAppFeedback();
  const navigate = useNavigate();
  const [items, setItems] = useState<CustomerNotification[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await getCustomerNotifications(LIMIT);
      setItems(response.items);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được thông báo.");
    }
  }, []);
  useEffect(() => {
    let active = true;
    getCustomerNotifications(LIMIT)
      .then(response => { if (active) setItems(response.items); })
      .catch((cause: unknown) => { if (active) { setItems([]); setError(cause instanceof Error ? cause.message : "Không tải được thông báo."); } });
    return () => { active = false; };
  }, []);
  useLiveRefresh(() => void load());

  const list = useMemo(() => items ?? [], [items]);
  const unread = list.filter(n => !n.read_at).length;
  const counts = useMemo(() => {
    const map: Partial<Record<Filter, number>> = { all: list.length, unread };
    for (const n of list) { const g = notificationGroup(n); map[g] = (map[g] ?? 0) + 1; }
    return map;
  }, [list, unread]);
  const shown = list.filter(n => filter === "all" || (filter === "unread" ? !n.read_at : notificationGroup(n) === filter));
  const chips: Array<{ key: Filter; label: string }> = [
    { key: "all", label: "Tất cả" }, { key: "unread", label: "Chưa đọc" },
    ...NOTIFICATION_GROUPS.filter(g => counts[g.key]),
  ];

  const open = (n: CustomerNotification) => {
    if (!n.read_at) {
      setItems(rows => rows?.map(row => row.id === n.id ? { ...row, read_at: new Date().toISOString() } : row) ?? rows);
      void readCustomerNotification(n.id).catch(() => undefined);
    }
    navigate(notificationTarget(n).to);
  };

  async function readAll() {
    setBusy(true);
    try {
      await readAllCustomerNotifications();
      const now = new Date().toISOString();
      setItems(rows => rows?.map(row => row.read_at ? row : { ...row, read_at: now }) ?? rows);
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Không thể đánh dấu đã đọc.", "error");
    } finally { setBusy(false); }
  }

  async function clearAll() {
    const ok = await confirm({
      title: "Xóa toàn bộ thông báo?",
      description: `${list.length} thông báo sẽ bị xóa và không thể khôi phục. Lịch hẹn, báo giá, hóa đơn… của bạn vẫn giữ nguyên.`,
      confirmText: "Xóa tất cả", cancelText: "Quay lại", variant: "danger", confirmIcon: "trash",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await clearCustomerNotifications();
      setItems([]);
      setFilter("all");
      notify("Đã xóa toàn bộ thông báo.", "success");
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Không thể xóa thông báo.", "error");
    } finally { setBusy(false); }
  }

  const chipClass = (active: boolean) => `inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors ${active
    ? "border-[#e11d2e] bg-[#e11d2e] text-white"
    : "border-cs-border bg-cs-surface text-cs-text hover:border-[#e11d2e] hover:text-cs-accent-text"}`;
  const actionClass = "inline-flex items-center gap-1.5 rounded-full border border-cs-border px-3.5 py-1.5 text-sm font-bold text-cs-text transition-colors hover:border-[#e11d2e] hover:text-cs-accent-text disabled:cursor-not-allowed disabled:opacity-50";

  return <div className="rounded-2xl border border-cs-border bg-cs-surface p-5 sm:p-6" data-testid="account-notifications">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-[#e11d2e]/10 text-cs-accent-text"><Icon name="bell" size={20}/></span>
        <div>
          <h2 className="text-lg font-extrabold text-cs-text">Thông báo</h2>
          <p className="text-sm text-cs-muted">{unread > 0 ? `${unread} thông báo chưa đọc` : "Cập nhật về lịch hẹn, báo giá và tiến độ sửa xe của bạn."}</p>
        </div>
      </div>
      {list.length > 0 && <div className="flex flex-wrap gap-2">
        <button type="button" className={actionClass} disabled={busy || unread === 0} onClick={() => void readAll()}><Icon name="check" size={15}/>Đánh dấu đã đọc hết</button>
        <button type="button" className={`${actionClass} hover:border-[#e11d2e] hover:text-[#e11d2e]`} disabled={busy} onClick={() => void clearAll()}><Icon name="trash" size={15}/>Xóa tất cả</button>
      </div>}
    </div>

    {list.length > 0 && <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Lọc thông báo">
      {chips.map(chip => <button key={chip.key} type="button" role="tab" aria-selected={filter === chip.key} className={chipClass(filter === chip.key)} onClick={() => setFilter(chip.key)}>
        {chip.label}<span className={`text-xs ${filter === chip.key ? "text-white/80" : "text-cs-muted"}`}>{counts[chip.key] ?? 0}</span>
      </button>)}
    </div>}

    {items === null ? <p className="mt-5 text-sm text-cs-muted">Đang tải thông báo…</p>
      : error && !list.length ? <p className="mt-5 rounded-xl bg-cs-soft px-4 py-8 text-center text-sm text-cs-muted">{error} <button type="button" className="font-bold text-cs-accent-text" onClick={() => void load()}>Thử lại</button></p>
      : !list.length ? <p className="mt-5 rounded-xl bg-cs-soft px-4 py-8 text-center text-sm text-cs-muted">Bạn chưa có thông báo nào.</p>
      : !shown.length ? <p className="mt-5 rounded-xl bg-cs-soft px-4 py-8 text-center text-sm text-cs-muted">{filter === "unread" ? "Bạn đã đọc hết thông báo." : "Không có thông báo nào trong mục này."}</p>
      : <ul className="mt-4 divide-y divide-cs-border">{shown.map(n => {
        const target = notificationTarget(n);
        return <li key={n.id}>
          <button type="button" onClick={() => open(n)} title={target.action}
            className={`group -mx-3 flex w-[calc(100%+1.5rem)] cursor-pointer gap-3 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-cs-soft ${n.read_at ? "" : "font-semibold"}`}>
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-cs-border" : "bg-[#e11d2e]"}`} aria-hidden="true"/>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-cs-text transition-colors group-hover:text-cs-accent-text">{n.title}</span>
              <span className="mt-0.5 block text-sm font-normal text-cs-muted">{n.content}</span>
              <span className="mt-1 block text-xs font-normal text-cs-muted">{formatDateTime(n.created_at)}</span>
            </span>
            <span className="shrink-0 self-center text-sm font-bold text-cs-accent-text">Xem</span>
          </button>
        </li>;
      })}</ul>}
  </div>;
}
