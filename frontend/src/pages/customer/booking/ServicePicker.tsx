import { useEffect, useMemo, useRef, useState } from "react";
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

/** "19500" → "19.500"; giá trị lưu trong state chỉ gồm chữ số. */
function formatThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

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
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="vehicleMileage" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">
            Số km hiện tại <span className="font-normal normal-case text-slate-400">(không bắt buộc)</span>
          </label>
          <input
            id="vehicleMileage"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={11}
            value={formatThousands(mileage)}
            onChange={(event) => onMileageChange(event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9))}
            placeholder="VD: 5.000"
            className="w-full max-w-[220px] rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
          />
        </div>
        <p className="text-xs text-slate-500">Dùng để gợi ý gói bảo dưỡng phù hợp.</p>
      </div>

      <div className="rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-900">Dịch vụ đã chọn</h3>
          <span className="text-xs text-slate-500">{selectedItems.length} mục</span>
        </div>

        {selectedItems.length === 0 ? (
          <p className="px-4 py-5 text-sm text-slate-500">Chưa chọn dịch vụ nào.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {selectedItems.map((item) => (
              <li key={item.key} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {item.type === "package" && (
                      <span className="mr-1.5 rounded bg-[var(--cs-soft,#fff1f1)] px-1.5 py-0.5 text-[11px] font-bold uppercase text-cs-accent-text">
                        Gói
                      </span>
                    )}
                    {item.name}
                  </p>
                  {item.summary && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.summary}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">{formatCatalogPrice(item.price)}</span>
                  <button
                    type="button"
                    onClick={() => toggle(item)}
                    className="text-xs font-semibold text-cs-accent-text hover:underline"
                    aria-label={`Bỏ ${item.name}`}
                  >
                    Bỏ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-3">
          <button ref={openButtonRef} type="button" onClick={openDrawer} className="cs-btn cs-btn-primary" disabled={loading} aria-haspopup="dialog">
            <i className="fa-solid fa-plus text-xs"></i> {loading ? "Đang tải dịch vụ..." : "Thêm dịch vụ"}
          </button>
          {!showSymptom && (
            <button type="button" onClick={() => setShowSymptom(true)} className="cs-btn cs-btn-ghost">
              Chưa rõ xe bị gì?
            </button>
          )}
        </div>
      </div>

      {loadError && <p className="mt-2 text-xs text-red-500">{loadError}</p>}

      {showSymptom && (
        <div className="mt-4">
          <label htmlFor="symptomDescription" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-700">
            Tình trạng xe
          </label>
          <textarea
            id="symptomDescription"
            rows={3}
            maxLength={1000}
            value={symptom}
            onChange={(event) => onSymptomChange(event.target.value)}
            placeholder="VD: Phanh kêu khi dừng, điều hòa không mát..."
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">Gara sẽ kiểm tra và báo giá trước khi làm.</p>
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
              className="cs-service-drawer-scrim absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
            />
            <aside className="cs-service-drawer-panel absolute inset-y-0 right-0 flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-[var(--cs-surface)] text-[var(--cs-text)] shadow-2xl sm:rounded-l-2xl">
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

              <div className="cs-service-drawer-body min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-5 py-4">
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
                        <span className="min-w-0 truncate text-sm font-bold">{group.name}</span>
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
                                <li key={item.key} className="flex items-start justify-between gap-3 px-4 py-3">
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
                                    <p className="mt-1 text-xs font-semibold">
                                      {formatCatalogPrice(item.price)}
                                      {minutes && <span className="font-normal text-[var(--cs-muted)]"> · {minutes}</span>}
                                    </p>
                                  </div>
                                  {isCovered ? (
                                    <span className="shrink-0 pt-1 text-xs text-[var(--cs-muted)]">Có trong gói</span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => toggle(item)}
                                      aria-pressed={isSelected}
                                      aria-label={`${isSelected ? "Bỏ" : "Chọn"} ${item.name}`}
                                      className={`min-w-16 shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                                        isSelected
                                          ? "border border-[var(--cs-accent)] text-[var(--cs-accent)] hover:bg-[var(--cs-soft)]"
                                          : "bg-[var(--cs-accent)] text-white hover:brightness-95"
                                      }`}
                                    >
                                      {isSelected ? "Bỏ" : "Chọn"}
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
                <button type="button" onClick={closeDrawer} className="cs-btn cs-btn-primary w-full justify-center">
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
