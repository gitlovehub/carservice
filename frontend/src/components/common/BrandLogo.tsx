import { Link } from "react-router-dom";
import SiteLogo from "./SiteLogo";

type BrandLogoProps = {
  to?: string;
  className?: string;
  /** Giữ để tương thích chỗ gọi cũ; logo ảnh đã có tên thương hiệu nên không hiện mô tả. */
  subtitle?: string;
  theme?: "light" | "dark";
  size?: "sm" | "md" | "lg";
};

export default function BrandLogo({ to = "/", className = "", size = "md" }: BrandLogoProps) {
  const height = size === "sm" ? 38 : size === "lg" ? 60 : 48;
  return (
    <Link to={to} aria-label="CarService - Trang chủ" className={`flex items-center ${className}`}>
      <SiteLogo height={height}/>
    </Link>
  );
}
