import { useState } from "react";

/**
 * Ngôi sao đánh giá DÙNG CHUNG toàn hệ thống (khách, admin, trang chủ): sao đặc, góc bo tròn.
 * Mọi chỗ hiển thị / chấm sao đều dùng các component ở đây — không dùng ký tự "★" hay SVG riêng.
 */

/** Sao đặc; nét cùng màu + bo góc để đầu cánh tròn như icon thiết kế. */
export const STAR_PATH = "M12 3.2 14.7 8.7 20.8 9.6 16.4 13.9 17.4 19.9 12 17.1 6.6 19.9 7.6 13.9 3.2 9.6 9.3 8.7Z";

/** Màu sao đã chấm (vàng hổ phách) và sao trống (theo token viền, tự đúng sáng/tối). */
export const STAR_ON = "text-[#f5a623]";
export const STAR_OFF = "text-cs-border";

/** Một ngôi sao; mặc định màu vàng (đã chấm), `off` = sao trống. */
export function StarIcon({ size = 16, off = false, className = "" }: { size?: number; off?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${off ? STAR_OFF : STAR_ON} ${className}`} aria-hidden="true"
      fill="currentColor" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
      <path d={STAR_PATH}/>
    </svg>
  );
}

/** Hàng 5 sao chỉ đọc; hỗ trợ điểm lẻ (vd. trung bình 4.3 → sao thứ 5 tô 30%). */
export function RatingStars({ value, size = 16, gap = 2, className = "" }: { value: number; size?: number; gap?: number; className?: string }) {
  const score = Math.max(0, Math.min(5, Number(value) || 0));
  const label = `${Number.isInteger(score) ? score : score.toFixed(1)} trên 5 sao`;
  return (
    <span role="img" aria-label={label} className={`inline-flex items-center ${className}`} style={{ gap }}>
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, score - index));
        return (
          <span key={index} className="relative inline-flex" style={{ width: size, height: size }}>
            <StarIcon size={size} off/>
            {fill > 0 && (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <StarIcon size={size}/>
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Chọn số sao (1–5) cho form đánh giá. Rê chuột → tô xem trước tới sao đang trỏ (màu + phóng to mượt);
 * `onPreview` báo số sao đang xem trước (0 khi rời chuột) để hiện nhãn tương ứng. Phím ←/→ đổi số sao.
 */
export function RatingInput({ value, onChange, onPreview, label, size = 44 }: {
  value: number; onChange: (rating: number) => void; onPreview?: (rating: number) => void; label: string; size?: number;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const preview = (rating: number) => { setHover(rating); onPreview?.(rating); };
  return (
    <div className="inline-flex items-center gap-1.5" role="radiogroup" aria-label={label} onMouseLeave={() => preview(0)}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); onChange(Math.min(5, value + 1)); }
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); onChange(Math.max(1, value - 1)); }
      }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const lit = star <= shown;
        return (
          <button key={star} type="button" role="radio" aria-checked={value === star} aria-label={`${star} sao`} title={`${star} sao`}
            tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
            onClick={() => onChange(star)} onMouseEnter={() => preview(star)} onFocus={() => preview(star)} onBlur={() => preview(0)}
            className="cursor-pointer rounded-lg p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[#f5a623]/50">
            <span className={`block transition-transform duration-200 ease-out ${star === hover ? "scale-[1.18]" : lit ? "scale-105" : "scale-100"}`}
              style={{ transitionDelay: hover ? `${(star - 1) * 25}ms` : "0ms" }}>
              <StarIcon size={size} off={!lit} className={`transition-colors duration-200 ease-out ${hover && lit && star > value ? "opacity-80" : ""}`}/>
            </span>
          </button>
        );
      })}
    </div>
  );
}
