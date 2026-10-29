
export type ServiceProduct = {
  id: string;
  title: string;
  description: string;
  price: string;
  backendServiceName: string;
  icon: string;
  iconColor: string;
  time?: string;
};

export const SERVICE_PRODUCTS: ServiceProduct[] = [
  {
    id: "std-maintenance",
    title: "Bảo dưỡng định kỳ",
    description:
      "Kiểm tra và bảo dưỡng xe theo định kỳ để xe luôn hoạt động ổn định.",
    price: "Từ 500.000 đ",
    backendServiceName: "Bảo dưỡng định kỳ",
    icon: "fa-solid fa-wrench",
    iconColor: "text-blue-600",
  },
  {
    id: "oil-filter",
    title: "Thay dầu động cơ",
    description:
      "Thay dầu động cơ và kiểm tra hệ thống bôi trơn, lọc dầu cùng các bộ phận liên quan.",
    price: "Từ 350.000 đ",
    backendServiceName: "Thay dầu động cơ",
    icon: "fa-solid fa-oil-can",
    iconColor: "text-amber-500",
  },
  {
    id: "brake-check",
    title: "Kiểm tra phanh",
    description:
      "Kiểm tra má phanh, đĩa phanh và hệ thống phanh nhằm đảm bảo an toàn.",
    price: "Từ 300.000 đ",
    backendServiceName: "Kiểm tra tổng quát",
    icon: "fa-solid fa-car-burst",
    iconColor: "text-red-500",
  },
  {
    id: "air-conditioning-check",
    title: "Kiểm tra điều hòa",
    description:
      "Kiểm tra khả năng làm lạnh, lọc gió và các bộ phận của hệ thống điều hòa.",
    price: "Từ 400.000 đ",
    backendServiceName: "Kiểm tra tổng quát",
    icon: "fa-solid fa-snowflake",
    iconColor: "text-cyan-500",
  },
  {
    id: "engine-check",
    title: "Kiểm tra động cơ",
    description:
      "Kiểm tra tình trạng động cơ, phát hiện dấu hiệu bất thường và tư vấn sửa chữa.",
    price: "Từ 600.000 đ",
    backendServiceName: "Kiểm tra tổng quát",
    icon: "fa-solid fa-gauge-high",
    iconColor: "text-emerald-600",
  },
  {
    id: "detailing-spa",
    title: "Chăm sóc xe",
    description:
      "Vệ sinh và chăm sóc tổng thể, giúp xe sạch sẽ và duy trì tình trạng tốt.",
    price: "Từ 300.000 đ",
    backendServiceName: "Kiểm tra tổng quát",
    icon: "fa-solid fa-spray-can-sparkles",
    iconColor: "text-purple-500",
  },
];

/**
 * Chuẩn hóa tên dịch vụ để so sánh.
 * Không xóa dấu tiếng Việt nhằm tránh trùng tên ngoài ý muốn.
 */
export function normalizeServiceName(value: string): string {
  return value
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi-VN");
}

/**
 * Tìm gói dịch vụ bằng ID nội bộ frontend.
 */
export function getServiceProductById(
  id: string | null | undefined
): ServiceProduct | undefined {
  if (!id) return undefined;

  return SERVICE_PRODUCTS.find(product => product.id === id);
}

/**
 * Tìm gói dịch vụ từ tên hiển thị.
 *
 * Chỉ tự động khớp backendServiceName khi duy nhất
 * một gói dùng tên backend đó.
 *
 * Ví dụ: "Kiểm tra tổng quát" đang được dùng cho
 * nhiều gói, nên không tự ý chọn một gói bất kỳ.
 */
export function getServiceProductByName(
  name: string | null | undefined
): ServiceProduct | undefined {
  if (!name) return undefined;

  const normalizedName = normalizeServiceName(name);

  const exactTitle = SERVICE_PRODUCTS.find(
    product =>
      normalizeServiceName(product.title) === normalizedName
  );

  if (exactTitle) return exactTitle;

  const backendMatches = SERVICE_PRODUCTS.filter(
    product =>
      normalizeServiceName(product.backendServiceName) ===
      normalizedName
  );

  return backendMatches.length === 1
    ? backendMatches[0]
    : undefined;
}

/**
 * Tạo đường dẫn đặt lịch theo mã gói frontend.
 * Không truyền trực tiếp ID database vào mã gói.
 */
export function getServiceBookingUrl(
  product: ServiceProduct
): string {
  return `/booking?service=${encodeURIComponent(product.id)}`;
}

/**
 * Ánh xạ dịch vụ từ API sang gói frontend.
 *
 * Nếu không tìm được gói tương ứng, đưa khách đến
 * trang đặt lịch chung để tự chọn nhu cầu.
 */
export function getBookingUrlFromServiceName(
  name: string
): string {
  const product = getServiceProductByName(name);

  return product ? getServiceBookingUrl(product) : "/booking";
}