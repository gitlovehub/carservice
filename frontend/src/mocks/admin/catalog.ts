/**
 * DỮ LIỆU DEMO khu Admin — danh mục (phụ tùng, tồn kho, nhập/xuất, hãng & dòng xe).
 * Kiểu bám theo bảng: parts, part_compatibilities, inventories, inventory_transactions, vehicle_brands, vehicle_models.
 */

export type PartCategory = "Động cơ" | "Phanh" | "Điều hoà" | "Điện" | "Lốp – mâm" | "Gầm";
export type DemoPart = {
  id: number; sku: string; name: string; description: string; category: PartCategory; unit: string;
  cost: number; price: number; stock: number; min: number; updatedAt: string; status: "ACTIVE" | "INACTIVE";
  compat: string[];
};

export const partCategories: PartCategory[] = ["Động cơ", "Phanh", "Điều hoà", "Điện", "Lốp – mâm", "Gầm"];
export const partUnits = ["Cái", "Bộ", "Can", "Lít", "Chai"];

export const demoParts: DemoPart[] = [
  { id: 1, sku: "TY-90915-YZZE1", name: "Lọc dầu Toyota 90915-YZZE1", description: "Lọc dầu động cơ chính hãng Toyota", category: "Động cơ", unit: "Cái", cost: 95_000, price: 150_000, stock: 38, min: 50, updatedAt: "08/11/2026 14:20", status: "ACTIVE", compat: ["Toyota › Vios", "Toyota › Corolla Cross", "Toyota › Innova"] },
  { id: 2, sku: "CS-5W30-4L", name: "Dầu Castrol 5W-30 (4L)", description: "Dầu động cơ tổng hợp toàn phần", category: "Động cơ", unit: "Can", cost: 720_000, price: 950_000, stock: 26, min: 30, updatedAt: "08/11/2026 13:47", status: "ACTIVE", compat: [] },
  { id: 3, sku: "HD-45022-T9A", name: "Má phanh trước Honda", description: "Bộ má phanh trước cho Honda City", category: "Phanh", unit: "Bộ", cost: 820_000, price: 1_150_000, stock: 6, min: 15, updatedAt: "08/11/2026 11:10", status: "ACTIVE", compat: ["Honda › City", "Honda › Civic", "Honda › HR-V", "Honda › CR-V"] },
  { id: 4, sku: "NGK-ILZKR7B11", name: "Bugi NGK Iridium ILZKR7B11", description: "Bugi iridium cho Toyota, Honda", category: "Động cơ", unit: "Cái", cost: 260_000, price: 390_000, stock: 12, min: 20, updatedAt: "07/11/2026 17:35", status: "ACTIVE", compat: ["Toyota › Vios", "Honda › City"] },
  { id: 5, sku: "TY-87139-0N010", name: "Lọc gió điều hoà Toyota", description: "Lọc gió máy lạnh Toyota Vios, Altis", category: "Điều hoà", unit: "Cái", cost: 190_000, price: 280_000, stock: 9, min: 20, updatedAt: "07/11/2026 16:02", status: "ACTIVE", compat: ["Toyota › Vios", "Toyota › Corolla Altis"] },
  { id: 6, sku: "BW-22-16", name: "Gạt mưa Bosch (22\"/16\")", description: "Bộ gạt mưa trước xe du lịch", category: "Điện", unit: "Bộ", cost: 350_000, price: 490_000, stock: 32, min: 40, updatedAt: "07/11/2026 15:10", status: "ACTIVE", compat: [] },
  { id: 7, sku: "HD-17220-5AA-A00", name: "Lọc gió động cơ Honda", description: "Lọc gió động cơ Honda City, Civic", category: "Động cơ", unit: "Cái", cost: 320_000, price: 460_000, stock: 4, min: 10, updatedAt: "06/11/2026 14:18", status: "ACTIVE", compat: ["Honda › City", "Honda › Civic"] },
  { id: 8, sku: "LLC-TOY-4L", name: "Nước làm mát Toyota (4L)", description: "Dung dịch làm mát động cơ, chính hãng", category: "Động cơ", unit: "Can", cost: 210_000, price: 320_000, stock: 18, min: 20, updatedAt: "06/11/2026 10:24", status: "INACTIVE", compat: ["Toyota › Vios", "Toyota › Innova"] },
  { id: 9, sku: "MC-BP-CX5-F", name: "Má phanh trước Mazda CX-5", description: "Má phanh gốm, giảm bụi phanh", category: "Phanh", unit: "Bộ", cost: 1_050_000, price: 1_450_000, stock: 0, min: 6, updatedAt: "05/11/2026 09:12", status: "ACTIVE", compat: ["Mazda › CX-5"] },
  { id: 10, sku: "GS-12V-45AH", name: "Ắc quy GS 12V 45Ah", description: "Ắc quy khô miễn bảo dưỡng", category: "Điện", unit: "Cái", cost: 1_380_000, price: 1_750_000, stock: 7, min: 5, updatedAt: "04/11/2026 16:40", status: "ACTIVE", compat: [] },
  { id: 11, sku: "MC-205-55R16", name: "Lốp Michelin 205/55R16", description: "Lốp du lịch êm ái, tiết kiệm nhiên liệu", category: "Lốp – mâm", unit: "Cái", cost: 1_900_000, price: 2_450_000, stock: 16, min: 8, updatedAt: "03/11/2026 11:05", status: "ACTIVE", compat: [] },
  { id: 12, sku: "R134A-500", name: "Gas điều hoà R134a (500g)", description: "Gas lạnh cho hệ thống điều hoà ô tô", category: "Điều hoà", unit: "Chai", cost: 160_000, price: 250_000, stock: 0, min: 10, updatedAt: "02/11/2026 15:30", status: "ACTIVE", compat: [] },
];

export type DemoStockMove = { id: number; at: string; type: "IN" | "OUT" | "ADJUST"; sku: string; name: string; qty: number; ref: string; by: string; note?: string };
export const demoStockMoves: DemoStockMove[] = [
  { id: 1, at: "08/11/2026 14:20", type: "OUT", sku: "TY-90915-YZZE1", name: "Lọc dầu Toyota 90915-YZZE1", qty: 1, ref: "RO-20261101", by: "Nguyễn Văn Hải" },
  { id: 2, at: "08/11/2026 13:47", type: "OUT", sku: "CS-5W30-4L", name: "Dầu Castrol 5W-30 (4L)", qty: 1, ref: "RO-20261101", by: "Nguyễn Văn Hải" },
  { id: 3, at: "08/11/2026 11:10", type: "OUT", sku: "HD-45022-T9A", name: "Má phanh trước Honda", qty: 1, ref: "RO-20261108", by: "Hoàng Văn Tùng" },
  { id: 4, at: "07/11/2026 16:02", type: "IN", sku: "HD-45022-T9A", name: "Má phanh trước Honda", qty: 10, ref: "PN-261107-01", by: "Nguyễn Quản Trị", note: "Nhà cung cấp Honda VN" },
  { id: 5, at: "07/11/2026 15:10", type: "IN", sku: "BW-22-16", name: "Gạt mưa Bosch (22\"/16\")", qty: 20, ref: "PN-261107-02", by: "Nguyễn Quản Trị" },
  { id: 6, at: "06/11/2026 10:24", type: "ADJUST", sku: "LLC-TOY-4L", name: "Nước làm mát Toyota (4L)", qty: -2, ref: "KK-261106", by: "Nguyễn Quản Trị", note: "Kiểm kê: hỏng vỏ can" },
  { id: 7, at: "05/11/2026 09:12", type: "OUT", sku: "MC-BP-CX5-F", name: "Má phanh trước Mazda CX-5", qty: 1, ref: "RO-20261093", by: "Trần Quốc Huy" },
];

export type DemoBrand = { id: number; name: string; country: string; models: Array<{ id: number; name: string; segment: string; years: string; vehicles: number; packages: number }> };
export const demoBrands: DemoBrand[] = [
  { id: 1, name: "Toyota", country: "Nhật Bản", models: [
    { id: 11, name: "Vios", segment: "Sedan hạng B", years: "2014 – nay", vehicles: 184, packages: 4 },
    { id: 12, name: "Corolla Cross", segment: "SUV hạng C", years: "2020 – nay", vehicles: 76, packages: 3 },
    { id: 13, name: "Innova", segment: "MPV", years: "2016 – nay", vehicles: 52, packages: 2 },
    { id: 14, name: "Corolla Altis", segment: "Sedan hạng C", years: "2014 – nay", vehicles: 38, packages: 2 },
  ] },
  { id: 2, name: "Honda", country: "Nhật Bản", models: [
    { id: 21, name: "City", segment: "Sedan hạng B", years: "2014 – nay", vehicles: 142, packages: 3 },
    { id: 22, name: "Civic", segment: "Sedan hạng C", years: "2016 – nay", vehicles: 48, packages: 2 },
    { id: 23, name: "HR-V", segment: "SUV hạng B", years: "2018 – nay", vehicles: 41, packages: 2 },
    { id: 24, name: "CR-V", segment: "SUV hạng C", years: "2017 – nay", vehicles: 63, packages: 3 },
  ] },
  { id: 3, name: "Hyundai", country: "Hàn Quốc", models: [
    { id: 31, name: "Accent", segment: "Sedan hạng B", years: "2018 – nay", vehicles: 121, packages: 3 },
    { id: 32, name: "Tucson", segment: "SUV hạng C", years: "2019 – nay", vehicles: 34, packages: 2 },
  ] },
  { id: 4, name: "Mazda", country: "Nhật Bản", models: [
    { id: 41, name: "CX-5", segment: "SUV hạng C", years: "2017 – nay", vehicles: 98, packages: 3 },
    { id: 42, name: "Mazda3", segment: "Sedan hạng C", years: "2015 – nay", vehicles: 45, packages: 2 },
  ] },
  { id: 5, name: "Kia", country: "Hàn Quốc", models: [
    { id: 51, name: "Seltos", segment: "SUV hạng B", years: "2020 – nay", vehicles: 57, packages: 2 },
    { id: 52, name: "Morning", segment: "Hatchback hạng A", years: "2012 – nay", vehicles: 66, packages: 1 },
  ] },
  { id: 6, name: "VinFast", country: "Việt Nam", models: [
    { id: 61, name: "VF8", segment: "SUV điện hạng D", years: "2022 – nay", vehicles: 29, packages: 2 },
    { id: 62, name: "VF5", segment: "SUV điện hạng A", years: "2023 – nay", vehicles: 18, packages: 1 },
  ] },
];
