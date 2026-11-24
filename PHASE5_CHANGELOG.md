# PHASE 5 – CHANGELOG

- **Nhánh:** `fix/apt` @ `d864927`. Chưa commit.
- **Phạm vi:** chỉ frontend. Không đổi API, DB hay nghiệp vụ.

| # | File | Thay đổi | Lý do (ID lỗi) | Ảnh hưởng / rủi ro hồi quy |
|---|---|---|---|---|
| 1 | `components/AtelierPublic.tsx` | Header công khai: dòng phụ của logo ẩn dưới 420 px; `gap` nhỏ hơn; nút sáng/tối và đăng xuất chuyển vào menu trên điện thoại; nút dùng `Button` / `IconButton`; màu chuyển sang token; logo ghi "CarService"; "AUTO CARE" → "CHĂM SÓC Ô TÔ"; khung đăng nhập / lỗi dùng token | H1, H6, L3, M1, M7 | Header của mọi trang công khai và Customer. Desktop giữ nguyên bố cục |
| 2 | `advisor/ReceptionWorkflow.tsx`, `AdvisorRepairOrders.tsx`, `AdvisorRepairOrderDetail.tsx` | Khung trang dùng `page-container` | H2 | Chỉ thêm lề. In phiếu vẫn dựa trên `data-print-repair-order` |
| 3 | `advisor/AdvisorRepairOrders.tsx` | Viết lại phần hiển thị: `PageHeader`, `Button`, `StatusBadge`, `Pagination`, Loading / Error / Empty; tải dữ liệu không còn `setState` đồng bộ trong effect | H4, H5, M2, ESLint | Cùng API `listWorkflowOrders`, cùng bộ lọc `?status=` |
| 4 | `components/ChatWidget.tsx` | Ẩn trong `/advisor` và `/admin` | H8 | Trợ lý vẫn có ở trang công khai và Customer |
| 5 | `admin/Reports.tsx`, `layouts/navigation.ts` | Bỏ toàn bộ số liệu viết sẵn; thay bằng EmptyState "Báo cáo đang được phát triển" + lối tắt tới số liệu thật; menu gắn "Sắp có" | H3 | Không còn số liệu giả. Nút "In báo cáo" bị gỡ |
| 6 | 22 file (xem PHASE5_PROGRESS M1) | Việt hóa 32 chuỗi: MY GARAGE, SERVICE DESK, *MANAGEMENT, READY WHEN YOU ARE, SEND MESSAGE, Garage, Hotline, check-in, Laravel / backend / seeder trong mô tả | M1, L4 | Chỉ đổi chữ hiển thị |
| 7 | `shared/ModulePlaceholder.tsx`, `App.tsx` | Trang khung "Sắp có" hiển thị nội dung cho người dùng (bỏ "Task 01", "Axios Client", tên nhóm phụ trách) | M1 | 3 route: Đặt lịch hộ, Danh mục phụ tùng, Nhân sự |
| 8 | `pages/NotFound.tsx` (mới), `App.tsx` | Trang 404 nằm trong `PublicLayout`, dùng `EmptyState` | L2 | Route `*` |
| 9 | 32 file trang | 313 class chữ xám viết cứng (`#8A949E`, `#757575`, `#7B858F`…) → `text-cs-muted`; 134 class nền sáng cố định → `bg-cs-surface-2` / `bg-cs-bg` | H6, M11 | Màu chú thích đậm hơn ở chế độ sáng, đúng màu ở chế độ tối |
| 10 | `services/customerApi.ts` | Các bảng nhãn trạng thái sinh từ `config/status.ts` | H5 | Một số nhãn thống nhất lại, ví dụ "Thanh toán một phần" → "Đã thanh toán một phần" |
| 11 | `advisor/WorkflowUI.tsx` | `Status` → `StatusBadge`; `WorkflowTitle` → `PageHeader` (bỏ nhãn trang trí) | H5, M2 | 3 trang nghiệp vụ Advisor |
| 12 | `advisor/Appointments.tsx`, `admin/AdminAppointments.tsx`, `customer/Appointments.tsx`, `ServiceHistory.tsx`, `RepairStatus.tsx`, `Quotation.tsx`, `advisor/RepairOrderPanels.tsx` | Badge trạng thái → `StatusBadge`; gỡ 9 bảng nhãn/màu riêng; nhãn tab lọc lấy từ `status.ts` | H5, L5 | Logic lọc của Admin › Lịch hẹn giữ nguyên (tra mã từ nhãn) |
| 13 | 7 trang Admin, 3 trang Advisor | Đầu trang → `PageHeader` (một `h1`, tiêu đề trùng menu); bỏ nhãn trang trí và avatar "AD/GB/PT"; nút "Thêm / Làm mới" → `Button` | M2, M4, H4 | Advisor › Lịch hẹn, Khách hàng, Xe khách hàng giờ đã có `h1` |
| 14 | `components/AdminHubNav.tsx` (xóa), Accounts / Inventory / Services | Gỡ thanh điều hướng trùng sidebar | M4 | Điều hướng module Admin chỉ còn ở sidebar |
| 15 | `components/ui/Modal.tsx` | Thêm chế độ `bare` (render tại chỗ để giữ quy tắc dark mode cũ) | H7 | Không ảnh hưởng `Modal` thường |
| 16 | 10 trang (15 modal) | Lớp phủ tự viết → `<Modal bare>`: Esc, khóa cuộn, giữ và trả focus, `role="dialog"` + `aria-modal` + tên, không đóng khi đang lưu | H7 | Nội dung và form trong modal giữ nguyên. Không còn hiệu ứng đóng khi modal phụ thuộc biến đã null |
| 17 | `admin/Services.tsx` | Nút "Đóng" ở chế độ xem chi tiết: primary → secondary | H4 | |
| 18 | `layouts/workspace.css` | Nhãn sidebar dài được xuống dòng thay vì bị cắt | L1 | |
| 19 | `styles/atelier-public.css`, `styles/atelier-booking.css` (xóa) | CSS không được import ở đâu | M10 | Không ảnh hưởng hiển thị |
| 20 | `tests/*.mjs` (5 file) | Cập nhật theo kiến trúc hiện hành: điều hướng Admin qua `navigation.ts`, chuỗi tiếng Việt, cấu trúc timeline, CSS thực sự được nạp; thêm kiểm tra tương phản | Kiểm thử | 3 test fail từ trước Phase 5 nay đạt. Nghiệp vụ được kiểm tra không giảm |

## Kiểm tra sau thay đổi

| Hạng mục | Kết quả |
|---|---|
| `tsc -b` | Đạt |
| `vite build` | Đạt |
| Smoke test | 13/13 |
| `eslint` | 22 lỗi (trước Phase 5: 23), đều có từ trước |
| Trình duyệt | Xem `FINAL_UI_UX_AUDIT_AFTER_PHASE5.md` |
