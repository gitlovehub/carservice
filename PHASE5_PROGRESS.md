# PHASE 5 – Tiến độ

- **Nhánh:** `fix/apt` @ `d864927`, chưa commit.
- **Nguồn lỗi:** `FINAL_UI_UX_AUDIT.md`.
- **Trạng thái:** `VERIFIED` = đã kiểm trên trình duyệt thật (Edge, tài khoản demo). `FIXED` = đã sửa, đã build và chạy test, nhưng chưa có bằng chứng trình duyệt riêng. `PARTIAL` = mới làm một phần. `PENDING` = chưa làm. `BLOCKED` = cần phê duyệt.

| ID | Mô tả | Trạng thái | Thay đổi | Bằng chứng |
|---|---|---|---|---|
| H1 | Header công khai tràn 375/400 px | **VERIFIED** | Logo co lại, dòng phụ ẩn dưới 420 px, nút sáng/tối và đăng xuất vào menu mobile | Tràn ngang 375 px: 34 → **0 px**; 400 px: 9 → **0 px** trên 6 trang công khai |
| H2 | 3 trang Advisor không có lề | **VERIFIED** | `page-container` | Ảnh chụp 1280 px sau sửa (mục C trong báo cáo sau Phase 5) |
| H3 | Báo cáo dùng dữ liệu mẫu | **VERIFIED** | EmptyState + lối tắt tới số liệu thật; menu "Sắp có" | Không còn số liệu trong mã nguồn; trang đã quét trên trình duyệt |
| H4 | Nút không đồng bộ | **PARTIAL** | Nút ở header công khai, đầu trang 10 trang Advisor/Admin, Danh sách phiếu, modal Dịch vụ → `Button` | Phần lớn nút bên trong bảng và form trang cũ vẫn tự viết (xem mục còn lại) |
| H5 | Màu trạng thái 4 kiểu | **FIXED** | `StatusBadge` ở 9 trang; nhãn `customerApi` sinh từ `status.ts`; gỡ 9 bảng nhãn/màu riêng | tsc + 13/13 smoke test; ảnh trình duyệt |
| H6 | Tương phản chú thích / header tối | **VERIFIED** (sáng), PARTIAL (tối) | 313 class xám → `text-cs-muted`; token `--cs-accent-text` cho chữ màu nhấn (32 chỗ + `.at-customer-eyebrow`) | Không đạt AA @1280: sáng 10,7% → **0,3%**; tối 10,3% → **3,0%** (bản sửa token cuối chưa đo lại) |
| H7 | Modal tự viết | **VERIFIED** | 15 modal ở 10 trang → `<Modal bare>` | Esc đóng modal: Advisor › Khách hàng, Admin › Dịch vụ, Customer › Hủy lịch (trước đều không đóng) |
| H8 | Nút chat che thao tác | **FIXED** | Ẩn ở `/advisor`, `/admin` | Mã nguồn + quét trình duyệt |
| M1 | Tiếng Anh còn sót | **FIXED** | 32 chuỗi + trang "Sắp có" + mô tả trong `App.tsx` | Quét DOM: mục 5 trong báo cáo sau Phase 5 |
| M2 | Tiêu đề / `h1` không đồng bộ | **PARTIAL** | `PageHeader` ở 7 trang Admin, 6 trang Advisor; mọi trang Advisor đã có `h1` | Trang Customer vẫn dùng đầu trang riêng |
| M3 | 3 cơ chế thông báo | **PENDING** | — | `auth/Toast` còn ở 7 trang |
| M4 | Đầu trang Admin nhiều tầng, AdminHubNav | **FIXED** | Gỡ nhãn trang trí, avatar chữ, `AdminHubNav` | Test `ui-contrast-regression` và `atelier-customer-admin-final` cập nhật |
| M5 | Thẻ xe thiếu hãng | **BLOCKED** | — | API `/me/vehicles` không trả `model.brand`. Không tự suy đoán hãng |
| M6 | Mobile: thẻ 1 cột, vùng bấm nhỏ | **PENDING** | — | |
| M7 | 3 hệ icon | **PARTIAL** | Header công khai dùng `Icon` | Font Awesome và emoji vẫn còn ở trang cũ |
| M8 | Ngày giờ ISO | **FIXED** | `formatSlot()` → `dd/mm/yyyy · hh:mm` (3 chỗ ở Tiếp nhận) | tsc + test |
| M9 | Hiệu năng | **PENDING** | — | Font 9 độ đậm, bundle 1 file. API tổng hợp → BLOCKED |
| M10 | Code chết / CSS cũ | **PARTIAL** | Xóa `AdminHubNav`, `atelier-public.css`, `atelier-booking.css` | Header cũ còn (test `base-smoke` buộc giữ) |
| M11 | Mảng sáng dark mode (Thanh toán) | **FIXED** | `bg-[#FAF8F5]` → `bg-cs-surface-2` | |
| L1 | Nhãn sidebar bị cắt | **FIXED** | Cho xuống dòng | |
| L2 | Trang 404 sơ sài | **VERIFIED** | `NotFound` trong `PublicLayout` | Có `h1`, 0 tràn ngang, tương phản đạt |
| L3 | Tên thương hiệu không thống nhất | **FIXED** | "CarService" | |
| L4 | Garage / Hotline | **FIXED** | "Gara", "Đường dây nóng" | |
| L5 | Badge xuống dòng | **FIXED** | `StatusBadge` (`whitespace-nowrap`) | |
| L6 | Tab sai màu nhấn | **PARTIAL** | Danh sách phiếu dùng `bg-cs-accent` | Tab ở Advisor › Lịch hẹn vẫn dùng màu cũ |
| L7 | Nút ảnh đại diện tương phản thấp | **PENDING** | — | |
| L8 | Số liệu dashboard lệch hàng | **PENDING** | — | |
| L9 | Login thiếu `aria-busy` | **FIXED** | `aria-busy` cho 2 nút gửi (đăng nhập, OTP) | Chống gửi lặp đã kiểm: 1 request / 4 lần bấm |

## BLOCKED – REQUIRES APPROVAL
1. **M5:** backend eager-load `model.brand` trong `GET /me/vehicles`. Đây là thay đổi API.
2. **M9:** API tổng hợp số liệu cho trang Tổng quan, để giảm khoảng 9 request song song. Đây là API mới.
3. **H3 phần thật:** API báo cáo doanh thu theo kỳ.

## Chưa làm trong lượt này (không chặn, chỉ do khối lượng)
H4 phần còn lại, M2 phía Customer, M3, M6, M7, M8, L6–L9, 22 lỗi ESLint `set-state-in-effect` ở trang cũ, tách file lớn, tách code theo route, gỡ CSS cầu nối.
