const INVALID = '[aria-invalid="true"], [data-invalid="true"]';
const FOCUSABLE = 'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';
const EDGE_GAP = 16;

let pendingFrame = 0;

const isVisible = (element: HTMLElement) => element.getClientRects().length > 0;
const afterPaint = (run: () => void) => {
  cancelAnimationFrame(pendingFrame);
  pendingFrame = requestAnimationFrame(() => { pendingFrame = requestAnimationFrame(run); });
};

/** Mở <details>, tab hoặc khu vực thu gọn đang chứa ô lỗi. Trả về true nếu có mở thêm. */
function revealSection(target: HTMLElement): boolean {
  let opened = false;
  for (let node = target.parentElement; node; node = node.parentElement) {
    if (node instanceof HTMLDetailsElement && !node.open) { node.open = true; opened = true; }
    if (node.id) {
      const toggle = document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(node.id)}"][aria-expanded="false"], [role="tab"][aria-controls="${CSS.escape(node.id)}"][aria-selected="false"]`);
      if (toggle) { toggle.click(); opened = true; }
    }
  }
  return opened;
}

/** Đáy của header dính (sticky/fixed) đang che mép trên vùng cuộn. */
function stickyBottom(x: number, top: number, container: HTMLElement | null): number {
  const limit = window.innerHeight * 0.4;
  const covering = (node: Element) => {
    const { position, display, visibility } = getComputedStyle(node);
    if ((position !== "sticky" && position !== "fixed") || display === "none" || visibility === "hidden") return 0;
    const rect = node.getBoundingClientRect();
    return rect.top <= top + 1 && rect.bottom > top && rect.height <= limit && rect.left <= x && rect.right >= x ? rect.bottom : 0;
  };
  // Dò header theo thẻ (ổn định) và theo điểm chạm (bắt được thanh dính không phải <header>).
  const headers = [...(container ?? document).querySelectorAll("header, [role='banner']")].filter(node => container || !node.closest('[role="dialog"]'));
  const hit: Element[] = [];
  for (let node = document.elementFromPoint(x, top + 1); node && node !== document.body; node = node.parentElement) {
    if (!container || container.contains(node)) hit.push(node);
  }
  return Math.max(top, ...[...headers, ...hit].map(covering));
}

/** Cuộn từng vùng chứa vừa đủ để ô hiện ra; ô trong modal/drawer không làm trang phía sau cuộn theo. */
function scrollToField(target: HTMLElement) {
  const anchor = target.closest<HTMLElement>("[data-field], label") ?? target;
  const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  const rect = anchor.getBoundingClientRect();
  const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
  let moved = 0;
  const place = (container: HTMLElement | null, viewTop: number, viewBottom: number, scroll: (top: number) => void) => {
    const top = rect.top - moved;
    const bottom = rect.bottom - moved;
    const minTop = stickyBottom(x, viewTop, container) + EDGE_GAP;
    if (top >= minTop && bottom <= viewBottom - EDGE_GAP) return;
    const delta = top - minTop;
    scroll(delta);
    moved += delta;
  };

  let insideFixed = false;
  for (let node = anchor.parentElement; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
      const box = node.getBoundingClientRect();
      const scroller = node;
      place(scroller, box.top, box.bottom, top => scroller.scrollBy({ top, behavior }));
    }
    if (style.position === "fixed") { insideFixed = true; break; }
  }
  if (!insideFixed) place(null, 0, window.visualViewport?.height ?? window.innerHeight, top => window.scrollBy({ top, behavior }));
}

function focusField(target: HTMLElement) {
  const control = target.matches(FOCUSABLE) ? target : target.querySelector<HTMLElement>(FOCUSABLE);
  if (control) { control.focus({ preventScroll: true }); return; }
  target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

function goToFirstInvalid(root: ParentNode | null | undefined, canReveal: boolean) {
  const scope = root && (!(root instanceof Node) || root.isConnected) ? root
    : [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].pop() ?? document;
  const invalid = [...scope.querySelectorAll<HTMLElement>(INVALID)];
  const first = invalid.find(isVisible);
  if (!first) {
    if (canReveal && invalid[0] && revealSection(invalid[0])) afterPaint(() => goToFirstInvalid(root, false));
    return;
  }
  scrollToField(first);
  focusField(first);
}

/**
 * Cơ chế chung khi gửi form thất bại (frontend hoặc 422): mở khu vực chứa lỗi, cuộn mượt tới ô lỗi đầu tiên,
 * chừa khoảng cho header dính, rồi focus. Chỉ gọi khi gửi form, không gọi trong lúc người dùng đang nhập.
 */
export function focusFirstInvalid(root?: ParentNode | null) {
  afterPaint(() => goToFirstInvalid(root, true));
}
