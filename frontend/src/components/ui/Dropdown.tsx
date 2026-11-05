import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LABELS } from "../../config/labels";
import { IconButton } from "./Button";
import { Icon, type IconName } from "./Icon";
import { useOverlayArea } from "./useOverlayArea";
import "./overlay.css";

export type DropdownItem =
  | { type?: "item"; label: string; icon?: IconName; onSelect: () => void; danger?: boolean; disabled?: boolean }
  | { type: "separator" };

type TriggerProps = {
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  "aria-controls": string;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
};

const triggerButton = (anchor: HTMLElement | null) => anchor?.querySelector<HTMLElement>("button, [role='button']") ?? null;

function TriggerSlot({ render, ...props }: TriggerProps & { render: (props: TriggerProps) => ReactNode }) {
  return <>{render(props)}</>;
}

/**
 * Menu thao tác (⋯ trong dòng bảng, menu tài khoản). Render qua portal nên không bị bảng cuộn cắt.
 * Bàn phím: ↑/↓/Home/End di chuyển, Enter chọn, Esc/Tab đóng và trả focus về nút mở.
 */
export function Dropdown({ items, label = LABELS.action.more, align = "end", trigger, header }: {
  items: DropdownItem[];
  label?: string;
  align?: "start" | "end";
  /** Nút mở tùy biến; mặc định là IconButton "⋯". */
  trigger?: (props: TriggerProps) => ReactNode;
  /** Nội dung đầu menu (ví dụ tên + email tài khoản). */
  header?: ReactNode;
}) {
  const area = useOverlayArea();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left?: number; right?: number } | null>(null);
  // Bọc nút mở trong <span> để định vị menu và trả focus mà không cần truyền ref vào render prop.
  const anchorRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusFirst = useRef<"first" | "last">("first");

  const itemNodes = () => [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])];
  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerButton(anchorRef.current)?.focus({ preventScroll: true });
  }, []);
  const openMenu = (focus: "first" | "last") => {
    const rect = (triggerButton(anchorRef.current) ?? anchorRef.current)?.getBoundingClientRect();
    if (!rect) return;
    const top = rect.bottom + 6;
    focusFirst.current = focus;
    setPosition(align === "end" ? { top, right: Math.max(8, window.innerWidth - rect.right) } : { top, left: Math.max(8, rect.left) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const nodes = itemNodes();
    (focusFirst.current === "last" ? nodes[nodes.length - 1] : nodes[0])?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !anchorRef.current?.contains(target)) close(false);
    };
    const onViewportChange = () => close(false);
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [open, close]);

  const onTriggerKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(event.key === "ArrowUp" ? "last" : "first");
    }
  };

  const onMenuKey = (event: KeyboardEvent) => {
    const nodes = itemNodes();
    const index = nodes.indexOf(document.activeElement as HTMLButtonElement);
    const move = (next: number) => { event.preventDefault(); nodes[(next + nodes.length) % nodes.length]?.focus(); };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(nodes.length - 1);
    else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
    else if (event.key === "Tab") close(false);
  };

  const triggerProps: TriggerProps = {
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": menuId,
    onClick: () => { if (open) close(false); else openMenu("first"); },
    onKeyDown: onTriggerKey,
  };

  return <>
    <span ref={anchorRef} className="inline-flex">
      {trigger ? <TriggerSlot render={trigger} {...triggerProps}/> : <IconButton icon="more" label={label} {...triggerProps}/>}
    </span>
    {open && position && createPortal(
      <div ref={menuRef} id={menuId} role="menu" aria-label={label} data-area={area} onKeyDown={onMenuKey}
        style={{ top: position.top, left: position.left, right: position.right }}
        className="cs-feedback-layer cs-menu-panel fixed z-[350] min-w-[200px] max-w-[min(320px,calc(100vw-16px))] overflow-hidden rounded-card border border-cs-border bg-cs-surface py-1.5 text-cs-text shadow-raised">
        {header && <div className="border-b border-cs-border px-3.5 pb-2.5 pt-1.5">{header}</div>}
        {items.map((item, index) => item.type === "separator"
          ? <div key={index} role="separator" className="my-1.5 h-px bg-cs-border"/>
          : <button key={index} type="button" role="menuitem" disabled={item.disabled} tabIndex={-1}
              onClick={() => { close(); item.onSelect(); }}
              className={`flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-small outline-none disabled:cursor-not-allowed disabled:opacity-50
                ${item.danger ? "text-danger hover:bg-danger-soft focus-visible:bg-danger-soft" : "text-cs-text hover:bg-cs-hover focus-visible:bg-cs-hover"}`}>
              {item.icon && <Icon name={item.icon} size={16} className={item.danger ? "" : "text-cs-muted"}/>}
              <span className="flex-1">{item.label}</span>
            </button>)}
      </div>,
      document.body,
    )}
  </>;
}
