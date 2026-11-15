import { KmInput } from "../../../components/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { buttonClass } from "../../../components/ui/buttonClass";
import { Icon, type IconName } from "../../../components/ui/Icon";

/** Icon danh mục admin chọn (API trả tên icon); thiếu thì dùng icon mặc định. */
const iconOf = (name: string | undefined, fallback: IconName): IconName => (name ? (name as IconName) : fallback);
import { createPortal } from "react-dom";
import "./servicePicker.css";
import {
  formatCatalogPrice,
  formatMinutes,
  indexCatalogItems,
  servicesCoveredBySelection,
  type CatalogGroup,
  type CatalogItem,
} from "../../../services/bookingCatalog";

type ServicePickerProps = {
  groups: CatalogGroup[];
  loading: boolean;
  loadError: string;
  selectedKeys: string[];
  onSelectedKeysChange: (keys: string[]) => void;
  symptom: string;
  onSymptomChange: (value: string) => void;
  mileage: string;
  onMileageChange: (value: string) => void;
  error?: string;
};


function toggleSelection(keys: string[], item: CatalogItem, itemsByKey: Map<string, CatalogItem>): string[] {
  if (keys.includes(item.key)) {
    return keys.filter((key) => key !== item.key);
  }

  if (item.type === "service") {
    return [...keys, item.key];
  }

  // Mỗi lịch hẹn một gói: chọn gói mới thay gói cũ, bỏ các dịch vụ lẻ đã có trong gói.
  const included = new Set(item.included_service_ids ?? []);
  const kept = keys.filter((key) => {
    const selected = itemsByKey.get(key);
    if (!selected) return false;
    if (selected.type === "package") return false;
    return !included.has(selected.id);
  });

  return [item.key, ...kept];
}

export default function ServicePicker({
  groups,
  loading,
  loadError,
  selectedKeys,
  onSelectedKeysChange,
  symptom,
  onSymptomChange,
  mileage,
  onMileageChange,
  error,
}: ServicePickerProps) {
  const [drawerState, setDrawerState] = useState<"closed" | "open" | "closing">("closed");
  const drawerOpen = drawerState !== "closed";
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const groupRefs = useRef(new Map<string, HTMLElement>());
  const [showSymptom, setShowSymptom] = useState(symptom.trim() !== "");

  const itemsByKey = useMemo(() => indexCatalogItems(groups), [groups]);
  const coveredServiceIds = useMemo(
    () => servicesCoveredBySelection(selectedKeys, itemsByKey),
    [selectedKeys, itemsByKey],
  );
  const selectedItems = selectedKeys
    .map((key) => itemsByKey.get(key))
    .filter((item): item is CatalogItem => Boolean(item));

  const closeDrawer = () => setDrawerState((state) => (state === "open" ? "closing" : state));

  // Khách chỉnh km (nút +/− hoặc gõ) và dừng đúng một mốc của gói bảo dưỡng (5.000, 10.000...):
  // tự mở ngăn kéo, mở nhóm "Gói bảo dưỡng" và nhấp nháy gói khớp mốc.
  // Chờ 600ms sau lần chỉnh cuối để không bật lên khi khách đang bấm/gõ lướt qua mốc.
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const lastMileage = useRef(mileage);
  const drawerBodyRef = useRef<HTMLDivElement>(null);
  // Danh mục tải lại theo km (gợi ý "Phù hợp với xe") — đọc bản mới nhất qua ref để không huỷ hẹn giờ.
  const groupsRef = useRef(groups);
  useEffect(() => { groupsRef.current = groups; }, [groups]);
  useEffect(() => {
    if (mileage === lastMileage.current) return; // lần đầu / khôi phục nháp: không tự mở
    lastMileage.current = mileage;
    const km = Number(mileage);
    if (!mileage || !Number.isFinite(km) || km <= 0) return;
    const timer = window.setTimeout(() => {
      const packageGroup = groupsRef.current.find((group) => group.items.some((item) => item.type === "package"));
      const match = packageGroup?.items.find((item) => item.type === "package" && item.mileage_milestone === km);
      if (!packageGroup || !match) return;
      setOpenGroupKey(packageGroup.key);
      setDrawerState("open");
      setFlashKey(match.key);
      // Đợi ngăn kéo trượt ra + nhóm mở xong rồi cuộn tới gói.
      window.setTimeout(() => {
        drawerBodyRef.current?.querySelector(`[data-item-key="${CSS.escape(match.key)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 320);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [mileage]);

  // Tắt hiệu ứng sau khi nhấp nháy xong (4 × 0,7s).
  useEffect(() => {
    if (!flashKey) return;
    const timer = window.setTimeout(() => setFlashKey(null), 3000);
    return () => window.clearTimeout(timer);
  }, [flashKey]);

  // Khóa cuộn trang phía sau, đóng bằng Esc, đưa focus vào ngăn kéo.
  useEffect(() => {
    if (!drawerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerState((state) => (state === "open" ? "closing" : state));
    };
    document.addEventListener("keydown", closeOnEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  // Chờ hiệu ứng trượt ra xong mới gỡ khỏi DOM rồi trả focus về nút mở.
  useEffect(() => {
    if (drawerState !== "closing") return;
    const timer = window.setTimeout(() => {
      setDrawerState("closed");
      openButtonRef.current?.focus({ preventScroll: true });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [drawerState]);

  const openDrawer = () => {
    setOpenGroupKey((current) => current ?? groups[0]?.key ?? null);
    setDrawerState("open");
  };

  const toggleGroup = (key: string) => {
    const willOpen = openGroupKey !== key;
    setOpenGroupKey(willOpen ? key : null);
    if (willOpen) {
      // Sau khi nhóm mở xong, cuộn vừa đủ để thấy nhóm đó.
      window.setTimeout(() => groupRefs.current.get(key)?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 230);
    }
  };

  const toggle = (item: CatalogItem) => {
    onSelectedKeysChange(toggleSelection(selectedKeys, item, itemsByKey));
  };

  const countInGroup = (group: CatalogGroup) =>
    group.items.filter((item) => selectedKeys.includes(item.key)).length;

  return (
    <div>
      {/* Đồng bộ với bước "Ngày giờ": tiêu đề có vạch đỏ + khung rounded-2xl có viền. */}
      <h3 className="mb-3 border-l-4 border-[#e11d2e] pl-3 text-lg font-extrabold text-slate-900">
        Số km hiện tại <span className="text-sm font-normal text-slate-400">(không bắt buộc)</span>
      </h3>
      <div className="mb-7 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-[#fff4ec] to-white p-3 sm:flex-row sm:items-center sm:gap-4 dark:from-[#3a2a22] dark:to-transparent">
        <div className="flex min-w-0 flex-1 items-center gap-3 px-1">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#e11d2e] shadow-sm"><Icon name="gauge" size={20}/></span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">Odo trên đồng hồ xe</p>
            <p className="text-xs text-slate-500">Dùng để gợi ý gói bảo dưỡng phù hợp với mốc km.</p>
          </div>
        </div>
        <KmInput id="vehicleMileage" label="Số km hiện tại" value={mileage} onChange={onMileageChange} placeholder="VD: 5.000"
          className="w-full sm:w-[220px] !rounded-xl"/>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="border-l-4 border-[#e11d2e] pl-3 text-lg font-extrabold text-slate-900">Dịch vụ đã chọn</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${selectedItems.length ? "bg-[#e11d2e] text-white" : "bg-slate-100 text-slate-500"}`}>{selectedItems.length} mục</span>
      </div>
      <div>
        {selectedItems.length === 0 ? (
          <div className="px-4 py-5 text-sm text-slate-500">
            Chưa chọn dịch vụ nào. Bấm “Thêm dịch vụ” để chọn dịch vụ lẻ hoặc gói bảo dưỡng.
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {selectedItems.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.type === "package" ? "bg-[#e11d2e] text-white" : "bg-[#fde8eb] text-[#e11d2e] dark:bg-[var(--cs-soft)] dark:text-[var(--cs-accent-text)]"}`}>
                    <Icon name={iconOf(item.icon, item.type === "package" ? "layers" : "wrench")} size={18}/>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {item.type === "package" && (
                        <span className="mr-1.5 rounded bg-[var(--cs-soft,#fff1f1)] px-1.5 py-0.5 text-[11px] font-bold uppercase text-cs-accent-text">Gói</span>
                      )}
                      {item.name}
                    </p>
                    {item.summary && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.summary}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold text-slate-900">{formatCatalogPrice(item.price)}</span>
                  <button type="button" onClick={() => toggle(item)} aria-label={`Xóa ${item.name}`}
                    className="rounded-lg px-2 py-1 text-xs font-bold text-cs-accent-text hover:bg-[var(--cs-soft,#fff1f1)]">
                    Xóa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-4 py-3">
          <button ref={openButtonRef} type="button" onClick={openDrawer} className={buttonClass({ variant: "primary" })} disabled={loading} aria-haspopup="dialog">
            <i className="fa-solid fa-plus text-xs"></i> {loading ? "Đang tải dịch vụ..." : "Thêm dịch vụ"}
          </button>
          {!showSymptom && (
            <button type="button" onClick={() => setShowSymptom(true)} className={buttonClass({ variant: "ghost" })}>
              Chưa rõ xe bị gì?
            </button>
          )}
        </div>
      </div>

      {loadError && <p className="mt-2 text-xs text-red-500">{loadError}</p>}

      {showSymptom && (
        <div className="mt-7">
          <label htmlFor="symptomDescription" className="mb-3 block border-l-4 border-[#e11d2e] pl-3 text-lg font-extrabold text-slate-900">
            Tình trạng xe
          </label>
          <textarea
            id="symptomDescription"
            rows={3}
            maxLength={1000}
            value={symptom}
            onChange={(event) => onSymptomChange(event.target.value)}
            placeholder="VD: Phanh kêu khi dừng, điều hòa không mát..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:bg-white"
          />
          <p className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
            <Icon name="info" size={18}/>Gara sẽ kiểm tra và báo giá trước khi làm.
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}

      {drawerOpen &&
        createPortal(
          // Render ra body để không bị header dính (sticky) của trang đè lên; cs-feedback-layer mang theo màu theme.
          <div
            className="cs-feedback-layer cs-service-drawer fixed inset-0 z-[300]"
            data-state={drawerState}
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-drawer-title"
          >
            <button
              type="button"
              tabIndex={-1}
              aria-label="Đóng"
              onClick={closeDrawer}
              className="cs-service-drawer-scrim absolute inset-0 cursor-default bg-black/55"
            />
            <aside className="cs-service-drawer-panel absolute inset-y-0 right-0 flex h-[100dvh] w-full max-w-xl flex-col overflow-hidden bg-[var(--cs-surface)] text-[var(--cs-text)] shadow-2xl sm:rounded-l-2xl">
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--cs-border)] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
                <div className="min-w-0">
                  <h2 id="service-drawer-title" className="text-lg font-extrabold">Chọn dịch vụ</h2>
                  <p className="text-xs text-[var(--cs-muted)]">
                    {selectedItems.length > 0 ? `Đã chọn ${selectedItems.length} mục` : "Chọn gói hoặc dịch vụ lẻ"}
                  </p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={closeDrawer}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--cs-muted)] transition hover:bg-[var(--cs-surface-2)] hover:text-[var(--cs-text)]"
                  aria-label="Đóng"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </header>

              <div ref={drawerBodyRef} className="cs-service-drawer-body min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-5 py-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSymptom(true);
                    closeDrawer();
                  }}
                  className="w-full rounded-2xl border border-dashed border-[var(--cs-border)] px-4 py-3 text-left transition hover:border-[var(--cs-accent)] hover:bg-[var(--cs-soft)]"
                >
                  <span className="block text-sm font-bold">Chưa rõ xe bị gì?</span>
                  <span className="block text-xs text-[var(--cs-muted)]">Mô tả tình trạng, garage sẽ kiểm tra.</span>
                </button>

                {groups.length === 0 && !loading && (
                  <p className="py-6 text-center text-sm text-[var(--cs-muted)]">Chưa có dịch vụ nào.</p>
                )}

                {groups.map((group) => {
                  const isOpen = openGroupKey === group.key;
                  const count = countInGroup(group);
                  const panelId = `service-group-${group.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
                  return (
                    <section
                      key={group.key}
                      ref={(element) => {
                        if (element) groupRefs.current.set(group.key, element);
                        else groupRefs.current.delete(group.key);
                      }}
                      className={`scroll-mt-2 rounded-2xl border transition-colors ${isOpen ? "border-[var(--cs-accent)]/40" : "border-[var(--cs-border)]"}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-[var(--cs-surface-2)]"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--cs-soft,#fff1f1)] text-cs-accent-text"><Icon name={iconOf(group.icon, "wrench")} size={16}/></span>
                          <span className="truncate text-sm font-bold">{group.name}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {count > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--cs-accent)] px-1.5 text-[12px] font-bold text-white">
                              {count}
                            </span>
                          )}
                          <i className={`fa-solid fa-chevron-down text-xs text-[var(--cs-muted)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}></i>
                        </span>
                      </button>

                      <div id={panelId} className="cs-service-group-content" data-open={isOpen} inert={!isOpen}>
                        <div>
                          <ul className="divide-y divide-[var(--cs-border)] border-t border-[var(--cs-border)]">
                            {group.items.map((item) => {
                              const isSelected = selectedKeys.includes(item.key);
                              const isCovered = item.type === "service" && coveredServiceIds.has(item.id);
                              const minutes = formatMinutes(item.minutes);
                              return (
                                <li key={item.key} data-item-key={item.key}
                                  className={`flex items-start justify-between gap-3 px-4 py-3 ${flashKey === item.key ? "cs-milestone-flash" : ""}`}>
                                  <div className="min-w-0">
                                    <p className="break-words text-sm font-semibold">
                                      {item.name}
                                      {item.recommended && (
                                        <span className="ml-1.5 inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 align-middle text-[11px] font-bold text-emerald-600">
                                          Phù hợp với xe
                                        </span>
                                      )}
                                    </p>
                                    {item.summary && <p className="mt-0.5 line-clamp-2 text-xs text-[var(--cs-muted)]">{item.summary}</p>}
                                    {item.includes && <p className="mt-0.5 line-clamp-2 text-xs text-[var(--cs-muted)]">Gồm: {item.includes}</p>}
                                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs font-semibold">
                                      {formatCatalogPrice(item.price)}
                                      {minutes && (
                                        <span className="inline-flex items-center gap-1 font-normal text-[var(--cs-muted)]">
                                          <span aria-hidden="true">·</span>
                                          <span className="text-[#e11d2e] dark:text-[var(--cs-accent-text)]"><Icon name="clock" size={12}/></span>
                                          {minutes}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  {isCovered ? (
                                    <span className="shrink-0 pt-1 text-xs text-[var(--cs-muted)]">Có trong gói</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => toggle(item)}
                                      aria-pressed={isSelected}
                                      aria-label={`${isSelected ? "Xóa" : "Chọn"} ${item.name}`}
                                      className={`min-w-16 shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                                        isSelected
                                          ? "border border-[var(--cs-accent)] text-[var(--cs-accent)] hover:bg-[var(--cs-soft)]"
                                          : "bg-[var(--cs-accent)] text-white hover:brightness-95"
                                      }`}
                                    >
                                      {isSelected ? "Xóa" : "Chọn"}
                                    </button>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>

              <footer className="shrink-0 border-t border-[var(--cs-border)] bg-[var(--cs-surface)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
                {selectedItems.length > 0 && (
                  <ul className="cs-service-drawer-body mb-3 max-h-24 space-y-1 overflow-y-auto">
                    {selectedItems.map((item) => (
                      <li key={item.key} className="flex min-w-0 items-center gap-2 text-sm">
                        <i className="fa-regular fa-circle-check shrink-0 text-emerald-600"></i>
                        <span className="truncate">{item.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={closeDrawer} className={buttonClass({ variant: "primary", className: "w-full justify-center" })}>
                  {selectedItems.length > 0 ? `Xong (${selectedItems.length})` : "Đóng"}
                </button>
              </footer>
            </aside>
          </div>,
          document.body,
        )}
    </div>
  );
}
