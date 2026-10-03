import type { FieldConfig, PageDataConfig, Role } from "../types";

export const customerNavItems = ["Trang chủ", "Dịch vụ", "Đặt lịch", "Lịch hẹn", "Xe của tôi", "Tài khoản"];

export const roleNavMap: Record<Role, string[]> = {
  "Khách hàng": customerNavItems,
  "Cố vấn dịch vụ": ["Khách hàng", "Xe của khách", "Lịch hẹn", "Phiếu sửa chữa", "Báo giá"],
  "Kỹ thuật viên": ["Phiếu được phân công", "Kiểm tra xe", "Chẩn đoán", "Tiến độ sửa chữa"],
  "Quản trị viên": ["Tài khoản & nhân viên", "Dịch vụ & gói bảo dưỡng", "Phụ tùng & tồn kho", "Báo cáo & thống kê"],
};

export const initialCustomerRows = [
  ["Nguyễn Tiến Hiền", "0901234567", "nguyentienhien@gmail.com", "Cầu Giấy, Hà Nội"],
  ["Phùng Đức Anh", "0912345678", "phungducanh@gmail.com", "Cổ Nhuế, Hà Nội"],
  ["Bùi Việt", "0987654321", "buiviet@gmail.com", "Đống Đa, Hà Nội"],
];

export const customerFormFields: FieldConfig[] = [
  { label: "Họ và tên", placeholder: "Nhập họ và tên" },
  { label: "Số điện thoại", placeholder: "Nhập số điện thoại", type: "tel" },
  { label: "Email", placeholder: "Nhập địa chỉ email", type: "email" },
  { label: "Địa chỉ", placeholder: "Nhập địa chỉ" },
];

export const vehicleFormFields: FieldConfig[] = [
  { label: "Tên xe / dòng xe", placeholder: "Nhập tên xe" },
  { label: "Biển số", placeholder: "Để trống nếu chưa có biển số" },
  { label: "Chủ xe", placeholder: "Nhập tên khách hàng" },
];

export const bookingFormFields: FieldConfig[] = [
  {
    label: "Chọn xe",
    options: ["Chọn xe", "Toyota Vios · 30A-123.45", "Honda City · 30F-678.90"],
  },
  {
    label: "Dịch vụ / gói bảo dưỡng",
    options: ["Chọn dịch vụ", "Bảo dưỡng định kỳ", "Kiểm tra tổng quát", "Thay dầu động cơ"],
  },
  { label: "Ngày hẹn", type: "date" },
  {
    label: "Khung giờ",
    options: ["Chọn khung giờ", "08:00 – 10:00", "10:00 – 12:00", "13:00 – 15:00", "15:00 – 17:00"],
  },
  { label: "Ghi chú", placeholder: "Thông tin thêm (nếu có)" },
];

export const pageConfigs: Record<string, PageDataConfig> = {
  "Xe của khách": {
    title: "Quản lý xe của khách",
    description: "Tra cứu xe và lịch sử bảo dưỡng của khách hàng tại gara.",
    columns: ["CHỦ XE", "XE / DÒNG XE", "BIỂN SỐ", "LỊCH SỬ", "THAO TÁC"],
    rows: [
      ["Nguyễn Tiến Hiền", "Toyota Vios", "30A-123.45", "2 lần bảo dưỡng"],
      ["Phùng Đức Anh", "Honda City", "30F-678.90", "1 lần bảo dưỡng"],
      ["Bùi Việt", "Mazda 3", "30G-456.78", "3 lần bảo dưỡng"],
    ],
    primary: "Thêm xe",
    fields: vehicleFormFields,
    actions: ["Xem lịch sử", "Cập nhật xe"],
  },
  "Lịch hẹn": {
    title: "Quản lý lịch hẹn",
    description: "Xem, xác nhận, đổi và hủy lịch hẹn bảo dưỡng.",
    columns: ["MÃ LỊCH HẸN", "KHÁCH HÀNG", "XE", "NGÀY HẸN", "TRẠNG THÁI", "THAO TÁC"],
    rows: [
      ["LH-001", "Nguyễn Tiến Hiền", "Toyota Vios", "24/06/2026", "Chờ xác nhận"],
      ["LH-002", "Phùng Đức Anh", "Honda City", "25/06/2026", "Đã xác nhận"],
      ["LH-003", "Bùi Việt", "Mazda 3", "26/06/2026", "Đã xác nhận"],
    ],
    primary: "Tiếp nhận xe",
    fields: [{ label: "Khách hàng / số điện thoại" }, { label: "Xe" }, { label: "Tình trạng ban đầu" }],
    actions: ["Xác nhận", "Đổi lịch", "Hủy lịch"],
  },
  "Phiếu sửa chữa": {
    title: "Quản lý phiếu sửa chữa",
    description: "Theo dõi phiếu sửa chữa, tình trạng xe và kết quả tiếp nhận.",
    columns: ["MÃ PHIẾU", "KHÁCH HÀNG", "XE", "NGÀY TẠO", "TRẠNG THÁI", "THAO TÁC"],
    rows: [
      ["PSC-001", "Nguyễn Tiến Hiền", "Toyota Vios", "23/06/2026", "Đang sửa chữa"],
      ["PSC-002", "Phùng Đức Anh", "Honda City", "22/06/2026", "Chờ báo giá"],
    ],
    primary: "Tạo phiếu sửa chữa",
    fields: [{ label: "Khách hàng" }, { label: "Xe" }, { label: "Tình trạng ban đầu" }],
    actions: ["Xem chi tiết", "Cập nhật", "Đóng phiếu"],
  },
  "Báo giá": {
    title: "Quản lý báo giá",
    description: "Lập báo giá dịch vụ, phụ tùng và gửi tới khách hàng.",
    columns: ["MÃ BÁO GIÁ", "PHIẾU SỬA CHỮA", "KHÁCH HÀNG", "DỊCH VỤ / PHỤ TÙNG", "TRẠNG THÁI", "THAO TÁC"],
    rows: [
      ["BG-001", "PSC-001", "Nguyễn Tiến Hiền", "Bảo dưỡng định kỳ", "Chờ duyệt"],
      ["BG-002", "PSC-002", "Phùng Đức Anh", "Thay dầu động cơ", "Đã gửi"],
    ],
    primary: "Tạo báo giá",
    fields: [
      { label: "Phiếu sửa chữa" },
      { label: "Dịch vụ" },
      { label: "Phụ tùng" },
      { label: "Giá dự kiến", type: "number" },
    ],
    actions: ["Xem chi tiết", "Gửi báo giá"],
  },
  "Phiếu được phân công": {
    title: "Phiếu sửa chữa được phân công",
    description: "Xem yêu cầu dịch vụ, báo giá và các phiếu đang phụ trách.",
    columns: ["MÃ PHIẾU", "XE", "YÊU CẦU DỊCH VỤ", "NGÀY NHẬN", "TRẠNG THÁI", "THAO TÁC"],
    rows: [
      ["PSC-001", "Toyota Vios", "Bảo dưỡng định kỳ", "23/06/2026", "Đang kiểm tra"],
      ["PSC-003", "Mazda 3", "Kiểm tra tổng quát", "24/06/2026", "Chưa bắt đầu"],
    ],
    actions: ["Xem yêu cầu", "Xem báo giá"],
  },
  "Kiểm tra xe": {
    title: "Kiểm tra & checklist",
    description: "Ghi nhận tình trạng xe, kết quả kiểm tra và hình ảnh nếu có.",
    columns: ["MÃ PHIẾU", "XE", "HẠNG MỤC", "KẾT QUẢ", "TRẠNG THÁI", "THAO TÁC"],
    rows: [
      ["PSC-001", "Toyota Vios", "Kiểm tra tổng quát", "Đang cập nhật", "Đang kiểm tra"],
      ["PSC-003", "Mazda 3", "Kiểm tra tổng quát", "Chưa ghi nhận", "Chưa bắt đầu"],
    ],
    actions: ["Cập nhật checklist", "Ghi nhận tình trạng"],
  },
  "Chẩn đoán": {
    title: "Cập nhật chẩn đoán",
    description: "Ghi nhận lỗi và đề xuất dịch vụ hoặc phụ tùng cần thiết.",
    columns: ["MÃ PHIẾU", "XE", "CHẨN ĐOÁN", "ĐỀ XUẤT", "TRẠNG THÁI", "THAO TÁC"],
    rows: [
      ["PSC-001", "Toyota Vios", "Cần kiểm tra thêm", "Chưa có", "Đang thực hiện"],
      ["PSC-003", "Mazda 3", "Chưa cập nhật", "Chưa có", "Chưa bắt đầu"],
    ],
    actions: ["Ghi nhận lỗi", "Đề xuất dịch vụ"],
  },
  "Tiến độ sửa chữa": {
    title: "Tiến độ sửa chữa",
    description: "Cập nhật tiến độ và đánh dấu xe sẵn sàng bàn giao.",
    columns: ["MÃ PHIẾU", "XE", "CÔNG VIỆC", "CẬP NHẬT", "TRẠNG THÁI", "THAO TÁC"],
    rows: [
      ["PSC-001", "Toyota Vios", "Bảo dưỡng định kỳ", "24/06/2026", "Đang sửa chữa"],
      ["PSC-003", "Mazda 3", "Kiểm tra tổng quát", "24/06/2026", "Chưa bắt đầu"],
    ],
    actions: ["Cập nhật tiến độ", "Đánh dấu hoàn thành"],
  },
  "Tài khoản & nhân viên": {
    title: "Tài khoản & nhân viên",
    description: "Quản lý tài khoản người dùng và phân quyền nhân viên.",
    columns: ["HỌ VÀ TÊN", "TÀI KHOẢN", "VAI TRÒ", "TRẠNG THÁI", "THAO TÁC"],
    rows: [
      ["Nguyễn Văn A", "nguyenvana", "Cố vấn dịch vụ", "Hoạt động"],
      ["Trần Thị B", "tranthib", "Kỹ thuật viên", "Hoạt động"],
    ],
    primary: "Tạo tài khoản",
    fields: [
      { label: "Họ và tên" },
      { label: "Tên tài khoản" },
      { label: "Vai trò", options: ["Chọn vai trò", "Cố vấn dịch vụ", "Kỹ thuật viên", "Quản trị viên"] },
    ],
    actions: ["Phân quyền", "Khóa / Mở khóa"],
  },
  "Dịch vụ & gói bảo dưỡng": {
    title: "Dịch vụ & gói bảo dưỡng",
    description: "Quản lý danh mục dịch vụ, gói bảo dưỡng và giá mô tả.",
    columns: ["TÊN DỊCH VỤ / GÓI", "PHÂN LOẠI", "GIÁ DỰ KIẾN", "TRẠNG THÁI", "THAO TÁC"],
    rows: [
      ["Bảo dưỡng định kỳ", "Gói bảo dưỡng", "Theo báo giá", "Hoạt động"],
      ["Thay dầu động cơ", "Dịch vụ", "Theo báo giá", "Hoạt động"],
      ["Kiểm tra tổng quát", "Dịch vụ", "Theo báo giá", "Hoạt động"],
    ],
    primary: "Thêm dịch vụ / gói",
    fields: [
      { label: "Tên dịch vụ / gói" },
      { label: "Phân loại", options: ["Chọn phân loại", "Dịch vụ", "Gói bảo dưỡng"] },
      { label: "Giá / mô tả" },
    ],
    actions: ["Sửa", "Xóa"],
  },
  "Phụ tùng & tồn kho": {
    title: "Phụ tùng & tồn kho",
    description: "Quản lý phụ tùng, lượng tồn và lịch sử xuất nhập kho.",
    columns: ["MÃ PHỤ TÙNG", "TÊN PHỤ TÙNG", "TƯƠNG THÍCH", "TỒN KHO", "THAO TÁC"],
    rows: [
      ["PT-001", "Lọc dầu", "Toyota Vios", "24"],
      ["PT-002", "Má phanh", "Honda City", "12"],
      ["PT-003", "Bugi", "Mazda 3", "8"],
    ],
    primary: "Thêm phụ tùng",
    fields: [{ label: "Tên phụ tùng" }, { label: "Xe tương thích" }, { label: "Số lượng", type: "number" }],
    actions: ["Sửa", "Xóa", "Nhập / Xuất kho", "Lịch sử xuất nhập"],
  },
};

export const customerPageDataMap: Record<string, PageDataConfig> = {
  "Dịch vụ": {
    title: "Dịch vụ & gói bảo dưỡng",
    description: "Khám phá các dịch vụ và gói bảo dưỡng hiện có.",
    columns: ["DỊCH VỤ / GÓI", "PHÂN LOẠI", "MÔ TẢ", "THAO TÁC"],
    rows: [
      ["Bảo dưỡng định kỳ", "Gói bảo dưỡng", "Kiểm tra và bảo dưỡng định kỳ"],
      ["Kiểm tra tổng quát", "Dịch vụ", "Kiểm tra tình trạng xe"],
      ["Thay dầu động cơ", "Dịch vụ", "Thay dầu theo nhu cầu"],
    ],
    actions: ["Xem chi tiết"],
  },
  "Lịch hẹn": {
    title: "Lịch hẹn của tôi",
    description: "Xem chi tiết, đổi hoặc hủy lịch hẹn bảo dưỡng.",
    columns: ["MÃ LỊCH HẸN", "XE", "DỊCH VỤ", "NGÀY HẸN", "TRẠNG THÁI", "THAO TÁC"],
    rows: [
      ["LH-001", "Toyota Vios", "Bảo dưỡng định kỳ", "24/06/2026", "Chờ xác nhận"],
      ["LH-002", "Honda City", "Kiểm tra tổng quát", "25/06/2026", "Đã xác nhận"],
    ],
    actions: ["Xem chi tiết", "Đổi lịch", "Hủy lịch"],
  },
  "Xe của tôi": {
    title: "Xe của tôi",
    description: "Quản lý xe và xem lịch sử bảo dưỡng.",
    columns: ["XE / DÒNG XE", "BIỂN SỐ", "LỊCH SỬ BẢO DƯỠNG", "THAO TÁC"],
    rows: [
      ["Toyota Vios", "30A-123.45", "2 lần bảo dưỡng"],
      ["Honda City", "30F-678.90", "1 lần bảo dưỡng"],
    ],
    primary: "Thêm xe",
    fields: vehicleFormFields,
    actions: ["Xem chi tiết", "Lịch sử", "Cập nhật xe", "Xóa xe"],
  },
};
