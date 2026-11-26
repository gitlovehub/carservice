/** Logo chính thức của web (public/brand/carservice-logo.png, nền trong suốt, tỉ lệ ~2.7:1). Đã có chữ "CarService" trong ảnh. */
export const SITE_LOGO_SRC = "/brand/carservice-logo.png";

export default function SiteLogo({ height = 44, className = "" }: { height?: number; className?: string }) {
  return <img src={SITE_LOGO_SRC} alt="CarService" height={height} style={{ height, width: "auto" }} className={`block shrink-0 select-none ${className}`} draggable={false} decoding="async"/>;
}
