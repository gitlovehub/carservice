import { useEffect, useState, useSyncExternalStore } from "react";
import { brandLogoSnapshot, loadBrandLogos, subscribeBrandLogos } from "../../services/vehicleCatalog";

/**
 * Logo hãng xe, tự host ở public/brand-logos/{slug}.png
 * (nguồn: github.com/filippofilip95/car-logos-dataset, bản thumb — đã cắt sát viền, khung vuông 256×256).
 * Hãng chưa có logo hoặc ảnh lỗi → hiện chữ cái đầu tên hãng.
 */
const BRAND_LOGO_SLUGS: Record<string, string> = {
  "aston martin": "aston-martin",
  audi: "audi",
  bentley: "bentley",
  bestune: "bestune",
  bmw: "bmw",
  byd: "byd",
  chevrolet: "chevrolet",
  daewoo: "daewoo",
  dongfeng: "dongfeng",
  ford: "ford",
  gac: "gac-group",
  geely: "geely",
  haima: "haima",
  haval: "haval",
  honda: "honda",
  hongqi: "hongqi",
  hyundai: "hyundai",
  isuzu: "isuzu",
  // Logo chỉ có chữ (không có biểu tượng riêng) — giữ nguyên chữ JAECOO.
  jaecoo: "jaecoo",
  jeep: "jeep",
  // Logo mới 2021 (chữ KIA cách điệu), thay bản oval đỏ cũ.
  kia: "kia",
  "land rover": "land-rover",
  lexus: "lexus",
  lotus: "lotus",
  "lynk & co": "lynk-and-co",
  maserati: "maserati",
  mazda: "mazda",
  "mercedes-benz": "mercedes-benz",
  mercedes: "mercedes-benz",
  mg: "mg",
  mini: "mini",
  mitsubishi: "mitsubishi",
  nissan: "nissan",
  omoda: "omoda",
  peugeot: "peugeot",
  porsche: "porsche",
  ram: "ram",
  skoda: "skoda",
  subaru: "subaru",
  suzuki: "suzuki",
  toyota: "toyota",
  vinfast: "vinfast",
  volkswagen: "volkswagen",
  volvo: "volvo",
  wuling: "wuling",
};

/**
 * Ưu tiên: logo Admin tải lên (Danh mục xe → Hãng xe) → logo có sẵn trong public/brand-logos → chữ cái đầu.
 * `uploaded` = danh sách logo Admin tải lên (tên hãng chữ thường → URL).
 */
function getBrandLogoUrl(brandName: string | null | undefined, uploaded: Map<string, string> = brandLogoSnapshot()): string | null {
  const key = (brandName ?? "").trim().toLowerCase();
  const custom = uploaded.get(key);
  if (custom) return custom;
  const slug = BRAND_LOGO_SLUGS[key];
  if (!slug) return null;
  // Giá trị có đuôi file (vd "kia.svg") dùng nguyên; còn lại mặc định .png.
  return `/brand-logos/${slug.includes(".") ? slug : `${slug}.png`}`;
}

/**
 * Logo hãng nền trong suốt (PO 16/11/2026). `size` = cạnh px.
 * Theme tối: `.cs-brand-logo img` có viền sáng mảnh (index.css) để phần màu đen của logo (BMW, Mercedes…) không chìm vào nền.
 * Không dùng class `bg-white` / `text-[#…]`: shell.css đổi các class đó theo theme tối.
 */
export function VehicleBrandLogo({ brand, size = 32, className = "" }: { brand: string | null | undefined; size?: number; className?: string }) {
  const uploaded = useSyncExternalStore(subscribeBrandLogos, brandLogoSnapshot);
  useEffect(() => { void loadBrandLogos(); }, []);
  const url = getBrandLogoUrl(brand, uploaded);
  // Nhớ URL bị lỗi (không dùng cờ chung) để đổi sang logo mới vẫn thử tải lại.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = failedUrl !== null && failedUrl === url;
  const initial = (brand ?? "").trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={`cs-brand-logo flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {url && !failed
        ? <img src={url} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain p-[4%]" onError={() => setFailedUrl(url)}/>
        : <span className="font-extrabold text-cs-text" style={{ fontSize: Math.round(size * 0.42) }}>{initial}</span>}
    </span>
  );
}
