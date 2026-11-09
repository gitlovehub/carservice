/**
 * DỮ LIỆU DEMO khu Admin — vận hành (phiếu sửa chữa, hoá đơn, thanh toán, đánh giá, nhật ký)
 * và số liệu tổng hợp cho Tổng quan / Báo cáo.
 * Kiểu bám theo bảng: repair_orders, assignments, invoices, payments, reviews, audit_logs.
 */

export type RepairStatus = "RECEIVED" | "INSPECTING" | "QUOTING" | "WAITING_APPROVAL" | "WAITING_FOR_PARTS" | "IN_PROGRESS" | "COMPLETED" | "HANDED_OVER";
export type DemoRepairOrder = {
  id: number; code: string; customer: string; phone: string; vehicle: string; plate: string;
  advisor: string; technician?: string; status: RepairStatus; receivedAt: string; promisedAt: string;
  estimate: number; items: Array<{ name: string; status: "PENDING" | "IN_PROGRESS" | "COMPLETED"; price: number }>;
  timeline: Array<{ at: string; label: string; by: string }>;
};

const ro = (id: number, customer: string, phone: string, vehicle: string, plate: string, advisor: string, technician: string | undefined,
  status: RepairStatus, receivedAt: string, promisedAt: string, estimate: number): DemoRepairOrder => ({
  id, code: `RO-202611${String(id).padStart(2, "0")}`, customer, phone, vehicle, plate, advisor, technician, status, receivedAt, promisedAt, estimate,
  items: [
    { name: "Thay dầu động cơ", status: status === "RECEIVED" || status === "INSPECTING" ? "PENDING" : "COMPLETED", price: 350_000 },
    { name: "Thay lọc dầu", status: ["IN_PROGRESS", "COMPLETED", "HANDED_OVER"].includes(status) ? "COMPLETED" : "PENDING", price: 150_000 },
    { name: "Kiểm tra hệ thống phanh", status: status === "IN_PROGRESS" ? "IN_PROGRESS" : ["COMPLETED", "HANDED_OVER"].includes(status) ? "COMPLETED" : "PENDING", price: 200_000 },
  ],
  timeline: [
    { at: receivedAt, label: "Tiếp nhận xe", by: advisor },
    ...(status !== "RECEIVED" ? [{ at: receivedAt.replace(/\d{2}:\d{2}$/, "09:15"), label: "Bắt đầu kiểm tra", by: technician ?? advisor }] : []),
    ...(["WAITING_APPROVAL", "WAITING_FOR_PARTS", "IN_PROGRESS", "COMPLETED", "HANDED_OVER"].includes(status) ? [{ at: receivedAt.replace(/\d{2}:\d{2}$/, "10:30"), label: "Gửi báo giá cho khách", by: advisor }] : []),
    ...(["IN_PROGRESS", "COMPLETED", "HANDED_OVER"].includes(status) ? [{ at: receivedAt.replace(/\d{2}:\d{2}$/, "11:05"), label: "Khách duyệt báo giá", by: customer }] : []),
    ...(["COMPLETED", "HANDED_OVER"].includes(status) ? [{ at: promisedAt, label: "Hoàn tất sửa chữa", by: technician ?? advisor }] : []),
  ],
});

export const demoRepairOrders: DemoRepairOrder[] = [
  ro(1, "Trần Minh Quân", "0912 345 678", "Toyota Vios", "30A-123.45", "Phạm Gia Long", "Nguyễn Văn Hải", "IN_PROGRESS", "08/11/2026 08:40", "08/11/2026 16:00", 1_470_000),
  ro(2, "Lê Thu Hà", "0987 654 321", "Honda City", "30K-567.89", "Nguyễn Thị Lan", "Trần Quốc Huy", "WAITING_APPROVAL", "08/11/2026 10:05", "09/11/2026 11:00", 2_850_000),
  ro(3, "Phạm Gia Bảo", "0936 888 222", "Mazda CX-5", "30H-456.78", "Phạm Gia Long", "Trần Quốc Huy", "INSPECTING", "08/11/2026 13:30", "08/11/2026 17:30", 820_000),
  ro(4, "Đỗ Quang Huy", "0904 111 222", "Kia Seltos", "51K-234.56", "Nguyễn Thị Lan", "Đỗ Thành Nam", "WAITING_FOR_PARTS", "07/11/2026 14:10", "10/11/2026 10:00", 4_650_000),
  ro(5, "Vũ Đức Anh", "0977 888 999", "VinFast VF8", "30G-678.90", "Phạm Gia Long", "Lý Quốc Bình", "COMPLETED", "07/11/2026 09:00", "07/11/2026 17:00", 1_250_000),
  ro(6, "Hoàng Văn Nam", "0915 222 333", "Toyota Vios", "30A-987.65", "Nguyễn Thị Lan", undefined, "RECEIVED", "08/11/2026 15:20", "09/11/2026 09:00", 0),
  ro(7, "Bùi Anh Tuấn", "0933 777 555", "Mazda CX-5", "30H-222.33", "Phạm Gia Long", "Bùi Đức Anh", "QUOTING", "08/11/2026 11:45", "09/11/2026 15:00", 3_200_000),
  ro(8, "Trần Kim Ngân", "0989 456 789", "Honda City", "30K-111.22", "Nguyễn Thị Lan", "Hoàng Văn Tùng", "IN_PROGRESS", "08/11/2026 09:30", "08/11/2026 15:30", 960_000),
  ro(9, "Phan Thùy Linh", "0908 999 444", "Hyundai Accent", "30L-333.44", "Phạm Gia Long", "Đinh Công Sơn", "HANDED_OVER", "06/11/2026 08:15", "06/11/2026 16:00", 2_300_000),
  ro(10, "Nguyễn Thị Mai", "0965 321 987", "Hyundai Accent", "30L-789.01", "Nguyễn Thị Lan", "Nguyễn Văn Hải", "COMPLETED", "07/11/2026 13:00", "08/11/2026 10:00", 1_780_000),
  ro(11, "Đặng Hải Yến", "0912 004 556", "Kia Morning", "18A-120.45", "Phạm Gia Long", "Mai Xuân Trường", "IN_PROGRESS", "08/11/2026 07:50", "08/11/2026 12:00", 640_000),
];

export type InvoiceStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "VNPAY";
export type DemoInvoice = {
  id: number; code: string; orderCode: string; customer: string; plate: string; issuedAt: string;
  subtotal: number; discount: number; total: number; paid: number; status: InvoiceStatus;
  lines: Array<{ name: string; qty: number; price: number }>;
  payments: Array<{ code: string; method: PaymentMethod; amount: number; at: string; status: "SUCCESS" | "PENDING" | "FAILED" }>;
};

const inv = (id: number, orderCode: string, customer: string, plate: string, issuedAt: string, total: number, paid: number, status: InvoiceStatus,
  method: PaymentMethod = "CASH", paymentStatus: "SUCCESS" | "PENDING" | "FAILED" = "SUCCESS"): DemoInvoice => ({
  id, code: `HD-2611${String(id).padStart(3, "0")}`, orderCode, customer, plate, issuedAt, subtotal: total, discount: 0, total, paid, status,
  lines: [
    { name: "Dầu động cơ Toyota 5W-30 (4L)", qty: 1, price: Math.round(total * 0.35 / 1000) * 1000 },
    { name: "Lọc dầu động cơ", qty: 1, price: Math.round(total * 0.1 / 1000) * 1000 },
    { name: "Công bảo dưỡng định kỳ", qty: 1, price: total - Math.round(total * 0.35 / 1000) * 1000 - Math.round(total * 0.1 / 1000) * 1000 },
  ],
  payments: paid > 0 || paymentStatus !== "SUCCESS"
    ? [{ code: `PAY-${8800 + id}`, method, amount: paid > 0 ? paid : total, at: issuedAt, status: paymentStatus }] : [],
});

export const demoInvoices: DemoInvoice[] = [
  inv(1, "RO-20261109", "Phan Thùy Linh", "30L-333.44", "06/11/2026 16:20", 2_300_000, 2_300_000, "PAID", "VNPAY"),
  inv(2, "RO-20261105", "Vũ Đức Anh", "30G-678.90", "07/11/2026 17:10", 1_250_000, 0, "UNPAID"),
  inv(3, "RO-20261110", "Nguyễn Thị Mai", "30L-789.01", "08/11/2026 10:15", 1_780_000, 1_000_000, "PARTIALLY_PAID", "BANK_TRANSFER"),
  inv(4, "RO-20261098", "Trần Minh Quân", "30A-123.45", "02/08/2026 15:40", 550_000, 550_000, "PAID", "CASH"),
  inv(5, "RO-20261087", "Lê Thu Hà", "30K-567.89", "05/11/2026 14:00", 3_420_000, 3_420_000, "PAID", "BANK_TRANSFER"),
  inv(6, "RO-20261090", "Bùi Anh Tuấn", "30H-222.33", "06/11/2026 11:30", 5_600_000, 0, "UNPAID", "VNPAY", "FAILED"),
  inv(7, "RO-20261092", "Đỗ Quang Huy", "51K-234.56", "06/11/2026 17:45", 2_150_000, 2_150_000, "PAID", "VNPAY"),
  inv(8, "RO-20261080", "Trần Kim Ngân", "30K-111.22", "04/11/2026 10:10", 1_320_000, 0, "CANCELLED"),
  inv(9, "RO-20261085", "Hoàng Văn Nam", "30A-987.65", "05/11/2026 09:20", 980_000, 980_000, "PAID", "CASH"),
  inv(10, "RO-20261082", "Phạm Gia Bảo", "30H-456.78", "04/11/2026 16:30", 4_200_000, 0, "UNPAID", "VNPAY", "PENDING"),
  inv(11, "RO-20261079", "Đặng Hải Yến", "18A-120.45", "03/11/2026 15:05", 640_000, 0, "UNPAID"),
];

export type DemoReview = {
  id: number; customer: string; vehicle: string; orderCode: string; rating: number; comment: string; date: string;
  technician: string; hidden?: boolean; reply?: string;
};

export const demoReviews: DemoReview[] = [
  { id: 1, customer: "Trần Minh Quân", vehicle: "Toyota Vios – 30A-123.45", orderCode: "RO-20261098", rating: 5, date: "08/11/2026", technician: "Nguyễn Văn Hải",
    comment: "Dịch vụ tốt, kỹ thuật viên tư vấn rất nhiệt tình, làm việc chuyên nghiệp và nhanh chóng.", reply: "Cảm ơn anh Quân đã tin tưởng CarService!" },
  { id: 2, customer: "Lê Thu Hà", vehicle: "Honda City – 30K-567.89", orderCode: "RO-20261087", rating: 4, date: "05/11/2026", technician: "Trần Quốc Huy",
    comment: "Thay dầu nhanh, giá hợp lý. Phòng chờ hơi nóng vào buổi trưa." },
  { id: 3, customer: "Phan Thùy Linh", vehicle: "Hyundai Accent – 30L-333.44", orderCode: "RO-20261109", rating: 5, date: "06/11/2026", technician: "Đinh Công Sơn",
    comment: "Được báo giá rõ ràng từng hạng mục, xe giao đúng hẹn. Sẽ quay lại." },
  { id: 4, customer: "Bùi Anh Tuấn", vehicle: "Mazda CX-5 – 30H-222.33", orderCode: "RO-20261090", rating: 2, date: "06/11/2026", technician: "Bùi Đức Anh",
    comment: "Thời gian chờ báo giá lâu hơn dự kiến, mong gara cải thiện khâu thông báo tiến độ." },
  { id: 5, customer: "Hoàng Văn Nam", vehicle: "Toyota Vios – 30A-987.65", orderCode: "RO-20261085", rating: 5, date: "05/11/2026", technician: "Nguyễn Văn Hải",
    comment: "Rất hài lòng, nhân viên lễ phép." },
  { id: 6, customer: "Ẩn danh", vehicle: "—", orderCode: "RO-20261070", rating: 1, date: "01/11/2026", technician: "—",
    comment: "Nội dung quảng cáo không liên quan.", hidden: true },
  { id: 7, customer: "Đỗ Quang Huy", vehicle: "Kia Seltos – 51K-234.56", orderCode: "RO-20261092", rating: 4, date: "06/11/2026", technician: "Đỗ Thành Nam",
    comment: "Điều hoà mát lại như mới. Giá hơi cao so với nơi khác nhưng làm kỹ." },
];

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "STATUS";
export type DemoAuditLog = { id: number; at: string; actor: string; role: string; action: AuditAction; target: string; detail: string; ip: string };

export const demoAuditLogs: DemoAuditLog[] = [
  { id: 1, at: "08/11/2026 10:42", actor: "Nguyễn Quản Trị", role: "Admin", action: "UPDATE", target: "Dịch vụ · Thay dầu động cơ", detail: "Giá cơ bản 500.000 ₫ → 550.000 ₫", ip: "113.161.24.8" },
  { id: 2, at: "08/11/2026 10:05", actor: "Nguyễn Thị Lan", role: "Cố vấn", action: "STATUS", target: "Phiếu RO-20261102", detail: "Đang lập báo giá → Chờ khách duyệt", ip: "113.161.24.15" },
  { id: 3, at: "08/11/2026 09:31", actor: "Nguyễn Quản Trị", role: "Admin", action: "STATUS", target: "Tài khoản · lmduc@carservice.vn", detail: "Đang hoạt động → Đã khoá", ip: "113.161.24.8" },
  { id: 4, at: "08/11/2026 08:40", actor: "Phạm Gia Long", role: "Cố vấn", action: "CREATE", target: "Phiếu RO-20261101", detail: "Tiếp nhận xe 30A-123.45", ip: "113.161.24.12" },
  { id: 5, at: "08/11/2026 08:12", actor: "Nguyễn Quản Trị", role: "Admin", action: "LOGIN", target: "Hệ thống", detail: "Đăng nhập thành công", ip: "113.161.24.8" },
  { id: 6, at: "07/11/2026 17:30", actor: "Nguyễn Quản Trị", role: "Admin", action: "CREATE", target: "Ngày nghỉ · 01/01/2027", detail: "Tết Dương lịch", ip: "113.161.24.8" },
  { id: 7, at: "07/11/2026 16:02", actor: "Nguyễn Quản Trị", role: "Admin", action: "UPDATE", target: "Kho · BRK-0005", detail: "Nhập thêm 10 bộ má phanh trước", ip: "113.161.24.8" },
  { id: 8, at: "07/11/2026 15:44", actor: "Nguyễn Thị Lan", role: "Cố vấn", action: "DELETE", target: "Lịch hẹn APT-20261107-004", detail: "Huỷ theo yêu cầu khách", ip: "113.161.24.15" },
  { id: 9, at: "07/11/2026 14:20", actor: "Nguyễn Quản Trị", role: "Admin", action: "UPDATE", target: "Gói · Bảo dưỡng 40.000 km – Mazda CX-5", detail: "Tạm ngừng áp dụng", ip: "113.161.24.8" },
  { id: 10, at: "07/11/2026 09:10", actor: "Trần Quốc Huy", role: "Kỹ thuật viên", action: "STATUS", target: "Phiếu RO-20261104", detail: "Đang sửa chữa → Chờ phụ tùng", ip: "113.161.24.21" },
];

/* ---------- Số liệu tổng hợp ---------- */
export const revenue30d = {
  labels: Array.from({ length: 31 }, (_, i) => {
    const d = new Date(2026, 9, 10 + i);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  }),
  values: [6.1, 5.2, 10, 7.8, 5.6, 7.2, 8.1, 9.2, 6.4, 8, 9.6, 11.4, 12.3, 6.8, 11, 9.4, 13.2, 7.7, 11.6, 9.8, 7.4, 9.1, 14.6, 16.8, 9.2, 18.2, 15.4, 14.3, 15.6, 17.1, 20.8].map(v => v * 1_000_000),
};
export const movingAverage = (values: number[], window = 7) => values.map((_, i) => {
  const slice = values.slice(Math.max(0, i - window + 1), i + 1);
  return slice.reduce((s, v) => s + v, 0) / slice.length;
});

export const monthlyRevenue = {
  labels: ["Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11"],
  service: [72, 88, 86, 92, 104, 106, 120, 142.2].map(v => v * 1_000_000),
  parts: [36, 34, 36, 34, 41, 43, 42, 44.2].map(v => v * 1_000_000),
  orders: [78, 92, 82, 98, 90, 106, 120, 138],
};

export const topServices = [
  { name: "Bảo dưỡng định kỳ", count: 52, revenue: 78_000_000 },
  { name: "Sửa chữa hệ thống phanh", count: 18, revenue: 28_500_000 },
  { name: "Thay dầu, lọc dầu", count: 40, revenue: 24_000_000 },
  { name: "Kiểm tra hệ thống điện", count: 12, revenue: 18_000_000 },
  { name: "Vệ sinh điều hoà", count: 16, revenue: 15_200_000 },
];
export const topParts = [
  { name: "Dầu Castrol 5W-30 (4L)", sku: "CS-5W30-4L", qty: 46, revenue: 43_700_000 },
  { name: "Lọc dầu Toyota 90915-YZZE1", sku: "TY-90915-YZZE1", qty: 52, revenue: 7_800_000 },
  { name: "Má phanh trước Honda", sku: "HD-45022-T9A", qty: 14, revenue: 16_100_000 },
  { name: "Bugi NGK Iridium", sku: "NGK-ILZKR7B11", qty: 36, revenue: 14_040_000 },
  { name: "Lọc gió điều hoà", sku: "TY-87139-0N010", qty: 21, revenue: 5_880_000 },
];
export const paymentMethods = [
  { method: "CASH" as const, label: "Tiền mặt", count: 56, revenue: 69_400_000 },
  { method: "BANK_TRANSFER" as const, label: "Chuyển khoản", count: 66, revenue: 96_800_000 },
  { method: "VNPAY" as const, label: "VNPAY", count: 16, revenue: 20_200_000 },
];
export const technicianPerformance = [
  { name: "Nguyễn Văn Hải", specialty: "Động cơ", orders: 34, hours: 112, rating: 4.9 },
  { name: "Trần Quốc Huy", specialty: "Gầm – phanh", orders: 29, hours: 96, rating: 4.7 },
  { name: "Lý Quốc Bình", specialty: "Điện – điện tử", orders: 22, hours: 81, rating: 4.8 },
  { name: "Bùi Đức Anh", specialty: "Hộp số", orders: 17, hours: 74, rating: 4.4 },
  { name: "Đỗ Thành Nam", specialty: "Điều hoà", orders: 21, hours: 58, rating: 4.6 },
];

export const upcomingAppointments = [
  { time: "08:30 - 09:30", customer: "Trần Minh Quân", phone: "0912 345 678", vehicle: "Toyota Vios", plate: "30A-123.45", service: "Bảo dưỡng định kỳ", status: "PENDING" },
  { time: "10:00 - 11:00", customer: "Lê Thu Hà", phone: "0987 654 321", vehicle: "Honda City", plate: "30K-567.89", service: "Thay dầu, lọc dầu", status: "CONFIRMED" },
  { time: "13:30 - 15:00", customer: "Phạm Gia Bảo", phone: "0936 888 222", vehicle: "Mazda CX-5", plate: "30H-456.78", service: "Kiểm tra hệ thống phanh", status: "CONFIRMED" },
  { time: "15:30 - 16:30", customer: "Nguyễn Thị Mai", phone: "0965 321 987", vehicle: "Hyundai Accent", plate: "30L-789.01", service: "Bảo dưỡng toàn diện", status: "PENDING" },
];
