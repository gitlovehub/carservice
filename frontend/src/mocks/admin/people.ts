/**
 * DỮ LIỆU DEMO khu Admin — con người (khách hàng, nhân sự, tài khoản).
 * Thay bằng API khi backend sẵn sàng; giữ nguyên kiểu dữ liệu để trang không phải sửa nhiều.
 * Kiểu bám theo bảng: customers, vehicles, employees, technician_profiles, accounts.
 */

export type CustomerVehicle = { id: number; brand: string; model: string; plate: string; year: number; color: "white" | "red" | "grey" | "black" };
export type ServiceVisit = { date: string; title: string; vehicle: string; amount: number };
export type DemoCustomer = {
  id: number; name: string; phone: string; email: string; city: string; address: string;
  vehicles: CustomerVehicle[]; lastVisit: string; totalSpent: number; vip?: boolean;
  history: ServiceVisit[]; lastReview?: { rating: number; date: string; comment: string };
};

export const demoCustomers: DemoCustomer[] = [
  { id: 1, name: "Trần Minh Quân", phone: "0912 345 678", email: "minhquan@gmail.com", city: "Hà Nội", address: "Quận Cầu Giấy, TP. Hà Nội", vip: true,
    vehicles: [
      { id: 11, brand: "Toyota", model: "Vios", plate: "30A-123.45", year: 2021, color: "white" },
      { id: 12, brand: "Mazda", model: "CX-5", plate: "30H-456.78", year: 2023, color: "red" },
    ],
    lastVisit: "08/11/2026", totalSpent: 12_850_000,
    history: [
      { date: "08/11/2026", title: "Bảo dưỡng định kỳ 10.000 km", vehicle: "Toyota Vios – 30A-123.45", amount: 1_470_000 },
      { date: "02/08/2026", title: "Thay dầu, lọc dầu", vehicle: "Toyota Vios – 30A-123.45", amount: 550_000 },
      { date: "15/05/2026", title: "Kiểm tra hệ thống phanh", vehicle: "Mazda CX-5 – 30H-456.78", amount: 820_000 },
      { date: "10/02/2026", title: "Bảo dưỡng định kỳ 20.000 km", vehicle: "Mazda CX-5 – 30H-456.78", amount: 2_300_000 },
    ],
    lastReview: { rating: 5, date: "08/11/2026", comment: "Dịch vụ tốt, kỹ thuật viên tư vấn rất nhiệt tình, làm việc chuyên nghiệp và nhanh chóng." } },
  { id: 2, name: "Lê Thu Hà", phone: "0987 654 321", email: "thuha@gmail.com", city: "Hồ Chí Minh", address: "Quận 3, TP. Hồ Chí Minh",
    vehicles: [{ id: 21, brand: "Honda", model: "City", plate: "30K-567.89", year: 2022, color: "red" }], lastVisit: "05/11/2026", totalSpent: 6_420_000,
    history: [{ date: "05/11/2026", title: "Thay dầu, lọc dầu", vehicle: "Honda City – 30K-567.89", amount: 550_000 }] },
  { id: 3, name: "Phạm Gia Bảo", phone: "0936 888 222", email: "giabao@gmail.com", city: "Đà Nẵng", address: "Quận Hải Châu, Đà Nẵng",
    vehicles: [{ id: 31, brand: "Mazda", model: "CX-5", plate: "30H-456.78", year: 2020, color: "grey" }], lastVisit: "02/11/2026", totalSpent: 8_900_000,
    history: [{ date: "02/11/2026", title: "Kiểm tra hệ thống phanh", vehicle: "Mazda CX-5 – 30H-456.78", amount: 820_000 }] },
  { id: 4, name: "Nguyễn Thị Mai", phone: "0965 321 987", email: "mainguyen@gmail.com", city: "Hải Phòng", address: "Quận Lê Chân, Hải Phòng",
    vehicles: [{ id: 41, brand: "Hyundai", model: "Accent", plate: "30L-789.01", year: 2021, color: "white" }], lastVisit: "30/10/2026", totalSpent: 4_350_000, history: [] },
  { id: 5, name: "Đỗ Quang Huy", phone: "0904 111 222", email: "quanghuy@gmail.com", city: "Hà Nội", address: "Quận Đống Đa, Hà Nội", vip: true,
    vehicles: [
      { id: 51, brand: "Kia", model: "Seltos", plate: "51K-234.56", year: 2022, color: "grey" },
      { id: 52, brand: "VinFast", model: "VF8", plate: "30G-678.90", year: 2024, color: "red" },
    ], lastVisit: "08/11/2026", totalSpent: 15_600_000, history: [] },
  { id: 6, name: "Vũ Đức Anh", phone: "0977 888 999", email: "ducanh@gmail.com", city: "Bắc Ninh", address: "TP. Bắc Ninh",
    vehicles: [{ id: 61, brand: "VinFast", model: "VF8", plate: "30G-678.90", year: 2023, color: "red" }], lastVisit: "01/11/2026", totalSpent: 9_120_000, history: [] },
  { id: 7, name: "Hoàng Văn Nam", phone: "0915 222 333", email: "vannam@gmail.com", city: "Hải Dương", address: "TP. Hải Dương",
    vehicles: [{ id: 71, brand: "Toyota", model: "Vios", plate: "30A-987.65", year: 2019, color: "white" }], lastVisit: "28/10/2026", totalSpent: 5_800_000, history: [] },
  { id: 8, name: "Trần Kim Ngân", phone: "0989 456 789", email: "kimngan@gmail.com", city: "TP. Huế", address: "TP. Huế",
    vehicles: [{ id: 81, brand: "Honda", model: "City", plate: "30K-111.22", year: 2021, color: "black" }], lastVisit: "27/10/2026", totalSpent: 7_250_000, history: [] },
  { id: 9, name: "Bùi Anh Tuấn", phone: "0933 777 555", email: "anhtuan@gmail.com", city: "Quảng Ninh", address: "TP. Hạ Long, Quảng Ninh",
    vehicles: [
      { id: 91, brand: "Mazda", model: "CX-5", plate: "30H-222.33", year: 2022, color: "grey" },
      { id: 92, brand: "Toyota", model: "Corolla Cross", plate: "14A-345.67", year: 2023, color: "white" },
    ], lastVisit: "06/11/2026", totalSpent: 14_200_000, history: [] },
  { id: 10, name: "Phan Thùy Linh", phone: "0908 999 444", email: "thuylinh@gmail.com", city: "Cần Thơ", address: "Quận Ninh Kiều, Cần Thơ",
    vehicles: [{ id: 101, brand: "Hyundai", model: "Accent", plate: "30L-333.44", year: 2020, color: "white" }], lastVisit: "25/10/2026", totalSpent: 4_900_000, history: [] },
  { id: 11, name: "Ngô Thanh Tâm", phone: "0938 456 120", email: "thanhtam@gmail.com", city: "Hà Nội", address: "Quận Hà Đông, Hà Nội",
    vehicles: [], lastVisit: "—", totalSpent: 0, history: [] },
  { id: 12, name: "Đặng Hải Yến", phone: "0912 004 556", email: "haiyen@gmail.com", city: "Nam Định", address: "TP. Nam Định",
    vehicles: [{ id: 121, brand: "Kia", model: "Morning", plate: "18A-120.45", year: 2018, color: "red" }], lastVisit: "12/10/2026", totalSpent: 2_150_000, history: [] },
];

export type StaffRole = "ADVISOR" | "TECHNICIAN";
export type DemoStaff = {
  id: number; name: string; email: string; phone: string; role: StaffRole; specialty?: string;
  level?: "JUNIOR" | "SENIOR" | "MASTER"; status: "ACTIVE" | "INACTIVE"; joinedAt: string;
};

export const demoStaff: DemoStaff[] = [
  { id: 1, name: "Phạm Gia Long", email: "gialong@carservice.vn", phone: "0912 345 678", role: "ADVISOR", status: "ACTIVE", joinedAt: "03/2023" },
  { id: 2, name: "Nguyễn Thị Lan", email: "ntlan@carservice.vn", phone: "0989 456 789", role: "ADVISOR", status: "ACTIVE", joinedAt: "08/2024" },
  { id: 3, name: "Nguyễn Văn Hải", email: "nvhai@carservice.vn", phone: "0987 654 321", role: "TECHNICIAN", specialty: "Động cơ", level: "MASTER", status: "ACTIVE", joinedAt: "01/2021" },
  { id: 4, name: "Trần Quốc Huy", email: "tqhuy@carservice.vn", phone: "0904 111 222", role: "TECHNICIAN", specialty: "Gầm – phanh", level: "SENIOR", status: "ACTIVE", joinedAt: "06/2022" },
  { id: 5, name: "Lê Minh Đức", email: "lmduc@carservice.vn", phone: "0977 888 999", role: "TECHNICIAN", specialty: "Điện – điện tử", level: "SENIOR", status: "INACTIVE", joinedAt: "02/2022" },
  { id: 6, name: "Đỗ Thành Nam", email: "dtnam@carservice.vn", phone: "0965 321 987", role: "TECHNICIAN", specialty: "Điều hoà", level: "JUNIOR", status: "ACTIVE", joinedAt: "09/2024" },
  { id: 7, name: "Bùi Đức Anh", email: "bdanh@carservice.vn", phone: "0933 777 555", role: "TECHNICIAN", specialty: "Hộp số", level: "SENIOR", status: "ACTIVE", joinedAt: "11/2023" },
  { id: 8, name: "Hoàng Văn Tùng", email: "hvtung@carservice.vn", phone: "0915 222 333", role: "TECHNICIAN", specialty: "Gầm – phanh", level: "JUNIOR", status: "ACTIVE", joinedAt: "04/2025" },
  { id: 9, name: "Vũ Thị Hồng", email: "vthong@carservice.vn", phone: "0936 552 118", role: "ADVISOR", status: "ACTIVE", joinedAt: "05/2025" },
  { id: 10, name: "Đinh Công Sơn", email: "dcson@carservice.vn", phone: "0978 112 334", role: "TECHNICIAN", specialty: "Động cơ", level: "SENIOR", status: "ACTIVE", joinedAt: "07/2023" },
  { id: 11, name: "Mai Xuân Trường", email: "mxtruong@carservice.vn", phone: "0904 776 001", role: "TECHNICIAN", specialty: "Lốp – mâm", level: "JUNIOR", status: "ACTIVE", joinedAt: "02/2026" },
  { id: 12, name: "Lý Quốc Bình", email: "lqbinh@carservice.vn", phone: "0919 450 870", role: "TECHNICIAN", specialty: "Điện – điện tử", level: "MASTER", status: "ACTIVE", joinedAt: "10/2020" },
];

export const staffSpecialties = ["Động cơ", "Gầm – phanh", "Điện – điện tử", "Điều hoà", "Hộp số", "Lốp – mâm"];

export type AccountRole = "ADMIN" | "ADVISOR" | "TECHNICIAN" | "CUSTOMER";
export type AccountStatus = "ACTIVE" | "PENDING" | "LOCKED" | "INACTIVE";
export type DemoAccount = { id: number; email: string; name: string; role: AccountRole; status: AccountStatus; verified: boolean; lastLogin: string };

export const demoAccounts: DemoAccount[] = [
  { id: 1, email: "admin@carservice.vn", name: "Nguyễn Quản Trị", role: "ADMIN", status: "ACTIVE", verified: true, lastLogin: "08/11/2026 08:12" },
  { id: 2, email: "gialong@carservice.vn", name: "Phạm Gia Long", role: "ADVISOR", status: "ACTIVE", verified: true, lastLogin: "08/11/2026 07:55" },
  { id: 3, email: "ntlan@carservice.vn", name: "Nguyễn Thị Lan", role: "ADVISOR", status: "ACTIVE", verified: true, lastLogin: "07/11/2026 17:20" },
  { id: 4, email: "nvhai@carservice.vn", name: "Nguyễn Văn Hải", role: "TECHNICIAN", status: "ACTIVE", verified: true, lastLogin: "08/11/2026 07:40" },
  { id: 5, email: "tqhuy@carservice.vn", name: "Trần Quốc Huy", role: "TECHNICIAN", status: "ACTIVE", verified: true, lastLogin: "08/11/2026 07:48" },
  { id: 6, email: "lmduc@carservice.vn", name: "Lê Minh Đức", role: "TECHNICIAN", status: "LOCKED", verified: true, lastLogin: "20/09/2026 16:02" },
  { id: 7, email: "vthong@carservice.vn", name: "Vũ Thị Hồng", role: "ADVISOR", status: "PENDING", verified: false, lastLogin: "—" },
  { id: 8, email: "minhquan@gmail.com", name: "Trần Minh Quân", role: "CUSTOMER", status: "ACTIVE", verified: true, lastLogin: "08/11/2026 06:30" },
  { id: 9, email: "thuha@gmail.com", name: "Lê Thu Hà", role: "CUSTOMER", status: "ACTIVE", verified: true, lastLogin: "05/11/2026 21:14" },
  { id: 10, email: "giabao@gmail.com", name: "Phạm Gia Bảo", role: "CUSTOMER", status: "ACTIVE", verified: true, lastLogin: "02/11/2026 09:03" },
  { id: 11, email: "thanhtam@gmail.com", name: "Ngô Thanh Tâm", role: "CUSTOMER", status: "PENDING", verified: false, lastLogin: "—" },
  { id: 12, email: "old.user@gmail.com", name: "Lâm Văn Phúc", role: "CUSTOMER", status: "INACTIVE", verified: true, lastLogin: "11/03/2025 10:40" },
];
