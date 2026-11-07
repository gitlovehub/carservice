# FINAL UI/UX AUDIT – SAU PHASE 5

- **Nhánh:** `fix/apt` @ `d864927` + thay đổi Phase 5, chưa commit.
- **Ngày:** 08/11/2026.
- **Tài liệu kèm theo:** `PHASE5_PROGRESS.md` (trạng thái từng lỗi), `PHASE5_CHANGELOG.md` (file đã sửa), `ARCHITECTURE.md` (kiến trúc và quy tắc).

## 1. Kết quả tổng quát

| | Trước Phase 5 | Sau Phase 5 |
|---|---:|---:|
| **Điểm UI/UX** | **6.0 / 10** | **7.3 / 10** |
| Lỗi High (H1–H8) | 8 | Đã xử lý trọn **6**, xử lý một phần **2** (H4 nút, H6 tương phản tối còn 3%) |
| Lỗi Medium (M1–M11) | 11 | Đã xử lý **5**, một phần **3**, chưa làm **2**, BLOCKED **1** |
| Lỗi Low (L1–L9) | 9 | Đã xử lý **7**, một phần **1**, chưa làm **1** |

**Không chấm 9/10.** Lý do: phần lớn nút và bảng bên trong các trang cũ vẫn tự viết (H4), thông báo vẫn có 3 cơ chế (M3), icon còn 3 hệ (M7), còn 22 lỗi ESLint. Các mục này đều thấy được và đo được, nên chưa thể gọi là "đồng bộ toàn hệ thống".

## 2. Bảng điểm 12 hạng mục

| Hạng mục | Trước | Sau | Bằng chứng / lý do |
|---|---:|---:|---|
| Design System | 6.0 | 7.0 | Thêm `StatusBadge`, `PageHeader`, `Modal` vào nhiều trang; token `--cs-accent-text`. Nút trong trang cũ vẫn tự viết |
| Typography | 5.0 | 6.5 | **37/37 trang có `h1`** (trước: 3 trang thiếu); 13 trang Advisor/Admin dùng `PageHeader`; trang Customer vẫn mỗi nơi một cỡ |
| Color Consistency | 5.0 | 7.5 | Trạng thái dùng một nguồn (`status.ts`); 313 class xám + 134 class nền viết cứng → token |
| Dashboard Admin | 5.5 | 7.5 | Bỏ 4 tầng trang trí và `AdminHubNav` trùng lặp; Báo cáo không còn số liệu giả; tiêu đề trùng tên menu |
| Dashboard Advisor | 7.0 | 8.0 | Trang nghiệp vụ có lề; `h1` ở mọi trang; badge thống nhất; ngày giờ `dd/mm/yyyy` |
| Customer UI | 6.5 | 7.0 | Header mobile hết tràn; badge thống nhất; Việt hóa. Đầu trang và nút còn kiểu cũ; thẻ xe thiếu hãng (BLOCKED) |
| Button & Interaction | 5.5 | 6.0 | Nút đầu trang và header chuẩn hóa; 100% nút có cursor và tên; chống gửi lặp ở đăng nhập. Nút trong bảng/form cũ chưa chuyển |
| Modal & Dropdown | 5.5 | 8.0 | **15 modal** chuyển sang `<Modal>` chung: Esc, khóa cuộn, giữ/trả focus, `role="dialog"`. Đã kiểm trên trình duyệt |
| Responsive | 7.0 | 8.5 | **0 tràn ngang** trên 37 trang (trước: 15 lượt tràn ở trang công khai); thẻ số liệu mobile vẫn xếp 1 cột |
| Light/Dark Mode | 6.5 | 8.0 | Tương phản không đạt: sáng **10,7% → 0,3%**, tối **10,3% → 3,0%** (phần còn lại đã sửa sau lần đo, chưa đo lại) |
| Việt hóa | 6.5 | 9.0 | Quét DOM 37 trang: **không còn tiếng Anh** ngoài thương hiệu ATELIER; bỏ chữ kỹ thuật (Laravel, backend, Task 01, check-in) |
| Maintainability | 4.5 | 6.0 | Có `ARCHITECTURE.md`; 13/13 test xanh (trước 10/13); xóa 3 file chết. Còn file lớn, header cũ, 22 lỗi ESLint |

Điểm tổng là trung bình 12 hạng mục, làm tròn: **7.3**.

## 3. Kiểm tra trên trình duyệt (sau Phase 5)

- **Cách làm:** Microsoft Edge điều khiển qua DevTools Protocol, đăng nhập bằng tài khoản demo thật (Customer, Advisor, Admin).
- **Phạm vi:** 37 trang × 3 cấu hình (375 px sáng, 1280 px sáng, 1280 px tối) = **111 lượt tải**.
- Lần đo đầy đủ 6 bề rộng là trước Phase 5 (296 lượt). Lần này rút gọn do backend dev xử lý tuần tự.

| Chỉ số | Trước | Sau |
|---|---:|---:|
| Lượt tải bị tràn ngang | 15 | **0** |
| Lỗi console / exception | 0 | **0** |
| API trả lỗi ≥ 400 | 0 | **0** |
| Trang thiếu `h1` | 4 (3 Advisor + 404) | **0** |
| Chuỗi tiếng Anh thừa (quét DOM) | ~22 | **0** |
| Nút thiếu cursor-pointer / thiếu tên | 0 / 0 | 0 / 0 |
| Chữ không đạt AA, 1280 sáng | 370 / 3.468 (10,7%) | **11 / 3.319 (0,3%)** |
| Chữ không đạt AA, 1280 tối | 374 / 3.633 (10,3%) | **104 / 3.482 (3,0%)**, trước bản sửa cuối |

Sau lần đo này, mình sửa thêm nguyên nhân của phần lớn 104 lỗi tối còn lại (nhãn nhỏ màu đỏ trên nền tối → token `--cs-accent-text`). Bản sửa đã build và qua test nhưng **chưa đo lại trên trình duyệt**.

### Kịch bản thao tác (25 kịch bản, sau Phase 5): 22 đạt

| Kịch bản | Trước | Sau |
|---|---|---|
| Esc đóng modal Advisor › Khách hàng | Không đạt | **Đạt** |
| Esc đóng modal Admin › Dịch vụ | Không đạt | **Đạt** |
| Hủy lịch (Customer): có `role="dialog"`, Esc đóng, không gửi request | Không đạt | **Đạt** |
| Đăng nhập bấm 4 lần → 1 request; lỗi tiếng Việt | Đạt | Đạt |
| Sidebar, menu tài khoản, ngăn kéo mobile, theme (13 kịch bản) | Đạt | Đạt |
| Thẻ số liệu Admin là số thật | Đạt | Đạt |
| Phân trang Advisor › Lịch hẹn; chọn xe đã lưu; ngăn kéo dịch vụ | Đạt (ở lần thử riêng) | **Chưa đo lại được**: lần chạy cuối trang chưa tải xong do backend dev bị 2 bản quét chiếm cùng lúc. Mã các phần này không đổi trong Phase 5 |

Không thực hiện thao tác ghi dữ liệu (lưu, xóa, xác nhận thật).

## 4. Build và test

| | Kết quả |
|---|---|
| `tsc -b` | Đạt |
| `vite build` | Đạt (cảnh báo: một file JS khoảng 895 kB) |
| Smoke test | **13 / 13** (trước 10/13) |
| ESLint | 22 lỗi, 2 cảnh báo (trước 23 / 4). Cùng một kiểu `set-state-in-effect` ở các trang cũ; không có lỗi mới |

Ba test fail trước Phase 5 đều là **test lỗi thời**: kiểm tra class hoặc file CSS đã không còn dùng. Mình đã cập nhật chúng theo cấu trúc hiện hành, giữ nguyên toàn bộ kiểm tra nghiệp vụ (API OTP thật, lịch sử sửa chữa thật, quyền truy cập).

## 5. Còn lại

**BLOCKED, cần phê duyệt vì thay đổi API:**
1. `GET /me/vehicles` kèm `model.brand`, để thẻ xe hiện tên hãng.
2. API tổng hợp số liệu cho trang Tổng quan.
3. API báo cáo doanh thu theo kỳ.

**Chưa làm (frontend, theo thứ tự nên làm tiếp):**
1. H4: chuyển nút trong bảng và form của trang cũ sang `Button`. Nhiều nhất ở `MaintenancePackages`, `Account`, `Services`, `Cars`, `Customers`.
2. M3: gộp `auth/Toast` (7 trang) về `notify()`.
3. M6: lưới thẻ số liệu 2×2 trên mobile; vùng bấm ≥ 40 px ("Sửa"/"Xóa" ở Xe của tôi).
4. M2 phía Customer: `PageHeader` cho các trang khách.
5. M7: gỡ Font Awesome và emoji, dùng `Icon`.
6. 22 lỗi ESLint `set-state-in-effect`.
7. Gỡ header cũ (cần sửa `base-smoke.mjs`); tách file lớn; tách code theo route; giảm độ đậm font tải về.
8. L6 (tab Advisor › Lịch hẹn), L7, L8.

## 6. Mức sẵn sàng demo / bảo vệ

**Sẵn sàng demo và bảo vệ.** Mọi lỗi High mà hội đồng dễ thấy đã được xử lý và kiểm chứng:
- Header mobile không còn lệch.
- Trang Advisor có lề.
- Không còn số liệu giả.
- Không còn tiếng Anh hay chữ kỹ thuật.
- Modal đóng được bằng Esc.
- Nút chat không còn che nút thao tác.
- Màu trạng thái thống nhất.
- Hệ thống ổn định: 0 lỗi runtime và 0 lỗi API trên mọi trang.

Điểm yếu nếu bị soi kỹ: nút trong một số bảng/form cũ vẫn khác kiểu nhau, và thẻ xe của khách chưa hiện tên hãng (cần backend).
