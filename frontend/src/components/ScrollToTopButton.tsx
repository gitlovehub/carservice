import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/** Cuộn quá chừng này (px) mới hiện nút. */
const SHOW_AFTER = 400;

/**
 * Nút "Lên đầu trang" dùng chung toàn site (gắn một lần ở App).
 * Trang khách: đứng ngay trên nút chatbot (cùng kích thước 44px, thẳng cột, cách 12px); khu Advisor/Admin không có chatbot → sát góc dưới.
 * z-index thấp hơn chatbot để khung chat mở ra thì che nút này.
 */
export default function ScrollToTopButton() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > SHOW_AFTER);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const workspace = /^\/(advisor|admin)(\/|$)/.test(pathname);

  const scrollTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={scrollTop}
      aria-label="Lên đầu trang"
      title="Lên đầu trang"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`fixed z-[80] grid size-11 cursor-pointer place-items-center rounded-full bg-[#e11d2e] text-white shadow-lg shadow-[#e11d2e]/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#c81627] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d2e] motion-reduce:transition-none print:hidden ${
        workspace ? "right-5 bottom-5" : "right-5 bottom-[76px]"
      } ${visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6 14 6-6 6 6"/>
      </svg>
    </button>
  );
}
