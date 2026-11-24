# FINAL UI/UX AUDIT – CARSERVICE

- **Phạm vi:** frontend React (`frontend/`), nhánh `fix/apt` @ `d864927`. Nhánh này đã gồm refactor Phase 2–4 (commit `c8f524c`).
- **Ngày kiểm tra:** 07/11/2026.
- **Cách đọc:** mục A–B là kết luận nhanh. Mục C liệt kê lỗi kèm file và hướng sửa. Mục F trả lời trực tiếp câu hỏi "đã đủ tốt để bảo vệ chưa".

---

## 0. Phương pháp và giới hạn

| Bước | Cách làm | Quy mô |
|---|---|---|
| Đọc mã nguồn | Đọc layout, component, CSS. Thống kê tĩnh 116 file trong `src/`: màu hardcode, họ class nút, dialog tự viết, file lớn, code chết | Toàn bộ `src/` |
| Chạy ứng dụng | Vite dev `localhost:5173` + Laravel `127.0.0.1:8000` | Chạy được |
| Trình duyệt thật | Microsoft Edge (headless), điều khiển qua Chrome DevTools Protocol. **Đăng nhập bằng tài khoản demo thật** của Customer, Advisor, Admin | 37 trang |
| Nhiều kích thước | 375 / 400 / 768 / 1024 / 1280 / 1440 px ở chế độ sáng; 375 / 1280 px ở chế độ tối | **296 lượt tải trang** |
| Đo trên mỗi lượt | Tràn ngang và phần tử gây tràn, chữ bị cắt, tiếng Anh trong text / placeholder / aria-label / title, thống kê nút (họ class, chiều cao, cursor, tên truy cập), cỡ tiêu đề, font, tương phản chữ/nền (chuẩn WCAG AA), mảng nền sáng trong dark mode | Tự động |
| Thao tác thực tế | 25 kịch bản: đăng nhập (sai mật khẩu, bấm liên tục), menu tài khoản, thu gọn sidebar, ngăn kéo mobile, đổi theme, modal trang, hộp hủy lịch, chọn xe đã lưu, ngăn kéo chọn dịch vụ, phân trang | Mục 3 |
| Console / runtime | Ghi `console.error`, exception, API trả về ≥ 400 trên mọi lượt tải | Mục 4 |
| Build | `tsc -b`, `vite build`, `eslint .`, 13 smoke test | Mục 7 |

**Không thực hiện** (để không ghi vào dữ liệu thật):
- Không bấm lưu, xóa hay xác nhận thật: tạo dịch vụ, hủy lịch, xác nhận lịch, lập phiếu, thu tiền. Các luồng này chỉ được kiểm tới bước **mở hộp xác nhận rồi bấm "Quay lại" / Esc**.
- Kỹ thuật viên không có giao diện riêng, nên không đánh giá.
- Không kiểm tra trên điện thoại thật. Kích thước điện thoại được giả lập trong trình duyệt.

**Lưu ý môi trường:**
- Backend dev chạy bằng `php -S`, xử lý **tuần tự từng request**, mỗi request khoảng 0,4 giây.
- Trang "Tổng quan" gửi khoảng 10 request cùng lúc, nên trang mở ngay sau đó có thể trắng tới khoảng 12 giây.
- Phần lớn độ trễ này do môi trường dev. Trên production dùng php-fpm thì chậm không đáng kể.

---

## A. Tổng quan

### Điểm tổng thể: **6.0 / 10**

CarService đã có **bộ khung của một hệ thống quản lý chuyên nghiệp**:
- Advisor và Admin dùng chung một bố cục: sidebar nhóm theo nghiệp vụ, thu gọn được, breadcrumb, menu tài khoản, ngăn kéo trên điện thoại.
- Có design token cho sáng/tối và màu nhấn theo vai trò.
- Có thư viện component dùng chung.
- Trang Tổng quan dùng số liệu thật.
- Toàn bộ 296 lượt tải trang **không có lỗi console, không có lỗi API**, và **không trang nào trong ứng dụng bị tràn ngang**.

Tuy nhiên, **phần lớn các trang chưa được chuyển sang hệ thống mới**:
- Chỉ 14/41 trang dùng thư viện component.
- `<Button>` chung mới được dùng 16 lần, trong khi còn 279 thẻ `<button>` tự viết.
- `DataTable` chưa trang nào dùng. Có 7 modal tự viết riêng.
- Còn 2.184 mã màu hex viết cứng.

Hệ quả người dùng thấy rõ:
- Nút cùng chức năng nhưng mỗi trang một kích thước, từ 24 đến 62 px.
- Một trạng thái có tới 4 cách tô màu.
- Tiêu đề trang dao động từ 28 đến 64 px.
- Còn khoảng 22 dòng chữ trang trí tiếng Anh.
- Các trang Admin xếp nhiều tầng thẻ trước khi tới dữ liệu.

Nói gọn: **màn hình khung (layout) đạt chuẩn; nội dung từng trang thì chưa đồng bộ.**

---

## B. Bảng đánh giá

| Hạng mục | Điểm /10 | Trạng thái | Vấn đề chính |
|---|---:|---|---|
| Design System | 6.0 | Nền tảng tốt, áp dụng thấp | Token và thư viện component đầy đủ, nhưng chỉ khoảng 1/3 số trang dùng; 2.184 mã hex viết cứng; nhiều trang vẫn dùng họ class nút cũ `cs-unified-*`; icon có 3 hệ song song |
| Typography | 5.0 | Chưa đồng bộ | Một font Kanit (đạt), nhưng `h1` có 15 kiểu class, cỡ 28–64 px, độ đậm 700/800/900; 3 trang Advisor không có `h1`; Admin có tới 90 phần tử chữ nhỏ hơn 12 px trên một trang |
| Color Consistency | 5.0 | Chưa đồng bộ | Một trạng thái có 4 cách tô màu; header công khai viết cứng `#cf2935`, `#757575`; tab đang chọn dùng màu xanh than thay vì màu nhấn của vai trò |
| Dashboard Admin | 5.5 | Khung tốt, trang con rối | Trang Tổng quan đạt; trang con có 4 tầng (nhãn nhỏ + avatar "AD" + 3–4 thẻ số liệu + `AdminHubNav` trùng sidebar) trước khi tới dữ liệu; Báo cáo là dữ liệu mẫu; mỗi trang 2 nút chính |
| Dashboard Advisor | 7.0 | Tốt nhất hệ thống | Trang Tổng quan và Lịch hẹn rõ ràng; 3 trang nghiệp vụ (Tiếp nhận, Danh sách phiếu, Chi tiết phiếu) **không có lề**; còn chữ kỹ thuật và tiếng Anh |
| Customer UI | 6.5 | Gọn, dễ dùng | Đặt lịch tốt; thẻ xe hiện "PHƯƠNG TIỆN" thay tên hãng (API thiếu dữ liệu); đầu trang mỗi nơi một kiểu; còn "MY GARAGE / …" |
| Button & Interaction | 5.5 | Hành vi đạt, hình thức lệch | 100% nút có con trỏ tay và có tên truy cập; chống bấm lặp ở đăng nhập; nhưng chiều cao nút 24–62 px, đa số nút tự viết |
| Modal & Dropdown | 5.5 | Component chung tốt, trang chưa dùng | Dropdown, menu tài khoản, ngăn kéo đạt; **7 modal tự viết, phần lớn không đóng bằng Esc**; modal hủy lịch thiếu `role="dialog"` |
| Responsive | 7.0 | Khá | 0 tràn ngang trong ứng dụng; header công khai tràn ở 375/400 px; trên điện thoại thẻ số liệu xếp 1 cột rất dài; vùng bấm nhỏ; nút chat nổi che nút thao tác |
| Light/Dark Mode | 6.5 | Workspace tốt, public chưa | Advisor ở chế độ tối 0 lỗi tương phản; header công khai ở chế độ tối chỉ 3,75:1; chữ chú thích Admin ở chế độ sáng 3,08:1; bảng thanh toán còn mảng nền sáng trong dark mode |
| Việt hóa | 6.5 | Gần xong | Menu, nút, thông báo lỗi đã là tiếng Việt; còn khoảng 22 dòng chữ trang trí tiếng Anh và chữ kỹ thuật dành cho lập trình viên ("Laravel", "backend", "Frontend module Admin", "Task 01") |
| Maintainability | 4.5 | Nợ kỹ thuật lớn | File tới 1.526 dòng; khoảng 1.070 dòng header cũ luôn trả `null`; 3 cơ chế thông báo; 23 lỗi ESLint; 327 `!important`; không có ARCHITECTURE.md |

---

## C. Danh sách lỗi

**Không có lỗi Critical.** Không có trang trắng, crash, lỗi API hay luồng nghiệp vụ nào bị chặn trong 296 lượt tải và 25 kịch bản thao tác.

### High – ảnh hưởng lớn đến trải nghiệm

| # | Trang / component | File | Mô tả | Ảnh hưởng | Hướng khắc phục |
|---|---|---|---|---|---|
| H1 | Header công khai, khách chưa đăng nhập: Trang chủ, Đăng nhập, Đăng ký, Quên mật khẩu, Dịch vụ | `components/AtelierPublic.tsx:47-53` | Ở 375 và 400 px trang **tràn ngang 34 px / 9 px**. Nút menu "☰" nằm ở vị trí 369–409 px nên bị cắt mất một nửa. Logo không co lại (`whitespace-nowrap` + dòng "ATELIER / AUTO CARE"), khoảng cách `gap-5`, cộng 3 nút | Trên điện thoại, khách mới vào thấy trang bị lệch và nút menu khó bấm | Ẩn dòng phụ của logo dưới `sm`, giảm `gap`, chuyển nút sáng/tối vào menu trên mobile |
| H2 | Advisor: Tiếp nhận xe, Danh sách phiếu, Chi tiết phiếu | `pages/advisor/ReceptionWorkflow.tsx:130`, `AdvisorRepairOrders.tsx:28`, `AdvisorRepairOrderDetail.tsx:67` | Khung trang chỉ có `mx-auto max-w-6xl pb-12`, **không có padding ngang và padding trên**. Ở 1280 px nội dung dính sát mép sidebar và mép trên | Đây là 3 màn hình nghiệp vụ quan trọng nhất của Advisor nhưng trông như chưa hoàn thiện | Dùng `page-container` như trang Tổng quan |
| H3 | Admin › Báo cáo | `pages/admin/Reports.tsx:18-130` | Số liệu doanh thu là **hằng số viết sẵn**, không gọi API (có dòng ghi chú "dữ liệu mẫu" ở cuối trang) | Hội đồng bấm vào sẽ thấy doanh thu không có thật, trái nguyên tắc "không dữ liệu giả" | Gắn nhãn "Sắp có" và thay bằng EmptyState, hoặc làm API báo cáo |
| H4 | Nút trên toàn hệ thống | 41 trang | `<Button>` chung dùng 16 lần, còn 279 `<button>` tự viết. Chiều cao đo được: 24, 32, 36, 38, 40, 42, 44, 46, 50, 52, 62 px. Ví dụ: cùng một dòng bảng ở Advisor › Khách hàng, "Sửa" và "Xe" khác kích thước; Admin › Dịch vụ có 2 nút đỏ chính ("+ Thêm dịch vụ" và "Tìm kiếm") | Thiếu chuyên nghiệp, đúng điểm người dùng đã yêu cầu chuẩn hóa | Chuyển dần sang `<Button>` / `buttonClass()` (Phase 5); mỗi khối chỉ một nút primary |
| H5 | Màu trạng thái | `config/status.ts`, `customer/Appointments.tsx:18`, `advisor/Appointments.tsx`, `advisor/WorkflowUI.tsx:15` | Cùng một trạng thái có 4 cách tô: `status.ts` (Chờ xác nhận màu cam, Đã xác nhận màu xanh dương), Customer (xám / be), Advisor › Lịch hẹn (bộ màu riêng), `WorkflowUI.Status` (mọi trạng thái cùng một màu) | Người dùng không học được "màu nào nghĩa là gì" | Thay toàn bộ bằng `<StatusBadge domain=… />` |
| H6 | Tương phản chữ | Trang con Admin, Advisor › Khách hàng / Xe khách hàng, header công khai | Chế độ sáng: chữ chú thích 11 px `#8A949E` trên nền trắng chỉ đạt **3,08:1**. Số đoạn chữ không đạt: Admin › Lịch hẹn 64/252, Dịch vụ 53/215, Gói 49/176. Chế độ tối: link menu công khai `#757575` trên `#191b1e` chỉ đạt **3,75:1** (chuẩn AA cần 4,5:1) | Khó đọc, nhất là trên máy chiếu khi bảo vệ | Dùng token `text-cs-muted` (đạt AA ở cả hai theme); bỏ màu `#757575` / `#8A949E` viết cứng |
| H7 | Modal của trang | `admin/Services.tsx`, `Inventory.tsx`, `MaintenancePackages.tsx`, `advisor/Customers.tsx`, `customer/Quotation.tsx`, `customer/Appointments.tsx` | Đã thử thật: mở modal "Thêm" rồi bấm **Esc thì không đóng** (Admin › Dịch vụ, Advisor › Khách hàng). Cả `src/pages` chỉ có 2 file xử lý Esc. Modal hủy lịch của Customer **không có `role="dialog"` / `aria-modal`** và không dùng `ConfirmDialog` chung | Hành vi mở/đóng không nhất quán; kém truy cập cho người dùng bàn phím và trình đọc màn hình | Chuyển sang `<Modal>` / `<Drawer>` dùng chung (đã có sẵn Esc, khóa cuộn, giữ focus, trả focus) |
| H8 | Nút chat nổi (ChatWidget) | `components/ChatWidget.tsx` | Nút tròn 56 px ở góc dưới phải **che nút "Xe" trong bảng Khách hàng, nút "Chi tiết" trong bảng Lịch hẹn** và vùng phân trang | Che nút thao tác ở các trang làm việc | Ẩn trong khu vực Advisor/Admin, hoặc chừa khoảng trống dưới nội dung |

### Medium – thiếu đồng bộ

| # | Trang / component | File | Mô tả | Hướng khắc phục |
|---|---|---|---|---|
| M1 | Việt hóa | Xem mục 5 | Khoảng 22 dòng chữ trang trí tiếng Anh; chữ kỹ thuật lọt ra giao diện: "Kết quả cập nhật trực tiếp trên Laravel", "Thông tin được tải từ backend", "Frontend module Admin", "Đây là trang khung của Task 01", "check-in" | Thay theo danh sách ở mục 5 |
| M2 | Tiêu đề | Nhiều trang | `h1` cỡ 28 / 30 / 34 / 36 / 42 / 44 / 46 / 59 / 64 px, độ đậm 700 / 800 / 900. **Advisor › Lịch hẹn, Khách hàng, Xe khách hàng không có `h1`** (tiêu đề là `h2`) | Dùng `<PageHeader>` cho mọi trang |
| M3 | Thông báo | `components/auth/Toast.tsx` (7 trang), `customer/Booking.tsx:248` | **3 cơ chế thông báo** song song: `useAppFeedback().notify`, `auth/Toast`, `toastMessage` riêng của trang Đặt lịch | Chỉ giữ `notify()` |
| M4 | Đầu trang Admin | `pages/admin/*.tsx`, `components/AdminHubNav.tsx` | Nhãn nhỏ "KHÔNG GIAN LÀM VIỆC / QUẢN TRỊ VIÊN", avatar "AD", nhãn "GARA / …" và nhãn tiếng Anh xếp chồng; `AdminHubNav` (4 thẻ lớn) trùng với sidebar; trang Tài khoản có tiêu đề **"Quản trị viên"** trong khi menu ghi "Tài khoản" | Một `PageHeader` duy nhất; gỡ `AdminHubNav`; tiêu đề trùng tên menu |
| M5 | Customer › Xe của tôi, Đặt lịch | `pages/customer/Cars.tsx:282`; **API** `/me/vehicles` | API trả `model` nhưng không kèm `brand`, nên thẻ xe hiện "PHƯƠNG TIỆN" thay "Toyota", danh sách xe ở Đặt lịch chỉ hiện "Camry". Ngoài ra số km hiện "— km" | Backend eager-load `model.brand` (thay đổi API, cần duyệt riêng) |
| M6 | Mobile | Admin › Tài khoản / Khách hàng / Lịch hẹn, Tổng quan, Customer › Xe | Thẻ số liệu xếp 1 cột: Admin › Tài khoản phải cuộn khoảng 600 px mới tới thao tác. Vùng bấm nhỏ: "Sửa" / "Xóa" 23×32 px (Xe của tôi), "Hiện" mật khẩu 32×24 px, "Xóa bộ lọc" 75×24 px | Lưới 2×2 trên mobile; vùng bấm tối thiểu 40–44 px |
| M7 | Icon | Toàn hệ thống | 3 hệ icon: Font Awesome (CDN, 15 chỗ), emoji/Unicode (☾ ☀ ☰ ✕ 📷 💬…, khoảng 41 chỗ), `Icon` SVG (26 chỗ) | Chỉ dùng `Icon`; gỡ Font Awesome CDN |
| M8 | Ngày giờ | `advisor/ReceptionWorkflow.tsx` | Hiển thị `2026-10-09 · 08:00:00` (ISO). Ô chọn ngày hiện `mm/dd/yyyy` (phụ thuộc ngôn ngữ trình duyệt) | Dùng `formatDateTime` (`vi-VN`) cho mọi chỗ |
| M9 | Hiệu năng | `WorkspaceDashboard.tsx`, `AuthContext.tsx`, `index.html` | Trang Tổng quan gửi khoảng 10 request; `/api/me` được gọi 6 lần mỗi lần tải trang (một phần do StrictMode ở dev); Kanit nạp đủ 9 độ đậm + chữ nghiêng (đo được 9–15 file font mỗi lần tải; thực tế chỉ dùng 400–800); JS 895 kB trong một file | API tổng hợp số liệu (backend); chỉ tải 400/500/600/700; tách code theo route |
| M10 | Code chết / CSS cũ | `components/Header.tsx`, `CustomerHeader.tsx`, `CustomerTopbar.tsx`, `RoleAccountMenu.tsx`, `Footer.tsx`; `pages/customer/Dashboard.tsx` | Khoảng 1.070 dòng header cũ **luôn trả `null`** (bị test `base-smoke` buộc giữ lại). Trang `/customer/dashboard` (952 dòng) **không có đường dẫn nào tới**. `atelier-booking.css` và `atelier-public.css` không được import. `shell.css` còn 144 `!important` | Gỡ sau khi cập nhật test (Phase 5) |
| M11 | Dark mode – Thanh toán | `pages/customer/Payment.tsx` | `thead` / `tfoot` dùng `bg-[#FAF8F5]` nên thành mảng sáng trong dark mode | Dùng `bg-cs-surface-2` |

### Low – thẩm mỹ nhỏ

| # | Mô tả | File / vị trí | Hướng khắc phục |
|---|---|---|---|
| L1 | Mục sidebar "Danh mục phụ tùng" bị cắt thành "Danh mục phụ tù…" (do nhãn "Sắp có") | `layouts/navigation.ts` | Rút gọn thành "Phụ tùng" hoặc bỏ nhãn khi hẹp |
| L2 | Trang 404 chỉ là một dòng chữ trơn, không có bố cục hay tiêu đề | `App.tsx:117` | Dùng `EmptyState` trong `PublicLayout` |
| L3 | Tên thương hiệu không thống nhất: "carservice" (header công khai) và "CarService" (sidebar) | `AtelierPublic.tsx:11` | Thống nhất "CarService" |
| L4 | Trộn "Garage" (tiếng Anh) với "gara"; "Hotline" | `customer/Cars.tsx:164,275`, `Booking.tsx`, `ServicePicker.tsx:219`, `Footer.tsx` | Dùng "gara", "Đường dây nóng" |
| L5 | Badge "Đã tiếp nhận" xuống 2 dòng trong bảng | `advisor/Appointments.tsx` | `whitespace-nowrap` (có sẵn trong `Badge`) |
| L6 | Tab lọc đang chọn dùng xanh than `#1F2933` thay màu nhấn vàng đồng của Advisor | `advisor/Appointments.tsx` | Dùng `bg-cs-accent` |
| L7 | "📷 Thay đổi ảnh đại diện" tương phản 2,0:1, dùng emoji | `customer/Account.tsx` | Dùng `Button variant="ghost" icon=…` |
| L8 | Con số trong thẻ số liệu không thẳng hàng khi nhãn xuống 2 dòng | `WorkspaceDashboard.tsx` | `min-h` cho vùng nhãn |
| L9 | Nút đăng nhập đổi chữ "Đang đăng nhập…" nhưng không có `aria-busy` | `auth/Login.tsx` | Dùng `<Button loading>` |

---

## D. Những gì đã đạt (không cần sửa thêm)

Mỗi mục dưới đây đã được **kiểm chứng bằng trình duyệt**, không chỉ đọc code.

1. **Bố cục chung Advisor/Admin**: sidebar nhóm nghiệp vụ, đúng một mục đang sáng (kể cả danh sách đã lọc `?status=`), breadcrumb, menu tài khoản, nút sáng/tối. Thử thật: **13/13 kịch bản bố cục đạt**.
2. **Thu gọn sidebar**: còn 76 px chỉ icon, **giữ trạng thái khi chuyển trang**, mở rộng lại được.
3. **Ngăn kéo trên điện thoại (375 px)**: khi đóng thì ẩn khỏi bàn phím; khi mở có `aria-expanded`, focus vào nút Đóng, khóa cuộn nền; Esc đóng và trả focus về nút mở; chọn mục menu thì chuyển trang và tự đóng.
4. **Menu tài khoản (Dropdown)**: click mở và focus vào mục đầu; Esc đóng và trả focus; click ra ngoài thì đóng.
5. **Theme sáng/tối**: đổi tức thì, giữ sau khi tải lại, không nháy màu. Khu vực Advisor ở chế độ tối có **0 lỗi tương phản**.
6. **Không tràn ngang** ở mọi trang Customer, Advisor, Admin, tại cả 6 bề rộng.
7. **0 lỗi console, 0 exception, 0 API lỗi** trên 296 lượt tải.
8. **Một font duy nhất (Kanit)** trên mọi trang (riêng mã phiếu / biển số dùng monospace, có chủ đích).
9. **Nút**: 100% nút có con trỏ tay và có tên truy cập (0 vi phạm trên 37 trang).
10. **Đăng nhập**: bấm 4 lần liên tiếp chỉ gửi **1 request**; nút khóa và đổi chữ "Đang đăng nhập…"; báo lỗi bằng tiếng Việt.
11. **Trang Tổng quan Advisor/Admin**: số liệu thật từ API, badge trạng thái theo `status.ts`, thứ tự ưu tiên rõ ràng. Đây là màn hình có thể dùng làm mẫu cho các trang khác.
12. **Đặt lịch (Customer)**: chọn xe đã lưu thì đồng bộ ngay Hãng, Dòng xe, Biển số; ngăn kéo chọn dịch vụ mở/đóng đúng và đóng được bằng Esc.
13. **Phân trang Advisor › Lịch hẹn**: gọi `page=2`, nút "Sau" tự khóa ở trang cuối.
14. **Hủy lịch (Customer)**: luôn hỏi lại (có ô lý do), chỉ gửi request khi bấm "Xác nhận hủy lịch".
15. **Build**: `tsc -b` và `vite build` đều đạt.

---

## E. Những gì cần cải thiện (theo thứ tự ưu tiên)

| Ưu tiên | Việc | Lỗi liên quan | Ước lượng | Rủi ro |
|---|---|---|---|---|
| 1 | Sửa tràn header công khai ở 375/400 px | H1 | Nhỏ | Thấp |
| 2 | Thêm lề cho 3 trang nghiệp vụ Advisor | H2 | Nhỏ | Thấp |
| 3 | Ẩn hoặc dời nút chat nổi trong khu vực Advisor/Admin | H8 | Nhỏ | Thấp |
| 4 | Quyết định trang Báo cáo (gắn "Sắp có" hoặc làm API) | H3 | Nhỏ | Thấp |
| 5 | Việt hóa khoảng 22 nhãn và bỏ chữ kỹ thuật | M1, L4 | Nhỏ | Thấp (phải cập nhật smoke test có khóa chuỗi) |
| 6 | Màu chú thích dùng token (`text-cs-muted`) để đạt AA | H6, M11 | Nhỏ–vừa | Thấp |
| 7 | `StatusBadge` cho mọi trạng thái | H5, L5 | Vừa | Thấp |
| 8 | `PageHeader` cho mọi trang; gỡ `AdminHubNav`; một nút primary mỗi khối | M2, M4 | Vừa | Thấp |
| 9 | Chuyển 7 modal sang `<Modal>` chung | H7 | Vừa | Trung bình (đụng form) |
| 10 | Chuyển nút sang `<Button>`, bảng sang `DataTable` | H4 | Lớn | Trung bình |
| 11 | Gộp thông báo về `notify()`, icon về `Icon` | M3, M7 | Vừa | Thấp |
| 12 | Dọn code chết, CSS cầu nối, 23 lỗi ESLint; viết ARCHITECTURE.md | M10, mục 7 | Vừa | Thấp |
| 13 | Backend: kèm `brand` trong `/me/vehicles`; API tổng hợp số liệu Tổng quan | M5, M9 | Nhỏ | Cần duyệt (đổi API) |

Các mục 1–6 là "sửa nhanh, thấy ngay", ước khoảng 1 ngày công. Các mục 7–12 chính là Phase 5 đã lên kế hoạch.

---

## F. Kết luận

**1. UI/UX đã đủ tốt để demo và bảo vệ đồ án chưa?**
**Đủ để demo luồng chính**, nếu trình chiếu trên màn hình rộng: đặt lịch → xác nhận → tiếp nhận → chẩn đoán → phiếu sửa chữa → thanh toán. Hệ thống ổn định (0 lỗi runtime, 0 lỗi API), bố cục khu vực làm việc đạt chuẩn dashboard hiện đại, sáng/tối hoạt động tốt.
**Chưa đủ để gọi là "đồng bộ và chuyên nghiệp" trên toàn bộ trang**, nhất là khu vực Admin và các trang nghiệp vụ Advisor.

**2. Có còn điểm nào khiến giao diện thiếu chuyên nghiệp không?**
Có. Những điểm hội đồng dễ nhận ra nhất:
- Ba trang nghiệp vụ Advisor dính sát mép (H2).
- Trang Báo cáo dùng dữ liệu mẫu (H3).
- Nút trong cùng một bảng to nhỏ khác nhau (H4).
- Chữ tiếng Anh và chữ kỹ thuật như "Laravel", "backend", "Task 01" (M1).
- Trang Admin chồng nhiều tầng thẻ, có `AdminHubNav` trùng sidebar (M4).
- Header bị lệch khi mở trên điện thoại (H1).

**3. Có cần thêm một đợt UI refinement không?**
**Có, nhưng không cần redesign.** Nền tảng đã đúng: layout, token, component library. Việc còn lại là **áp dụng** nền tảng đó vào từng trang, tức là Phase 5 đã lên kế hoạch.

**4. Nếu có, nên sửa gì trước?**
Theo thứ tự ở mục E:
- **Đợt 1 (khoảng 1 ngày, rủi ro thấp, tác động lớn nhất khi demo):** H1, H2, H8, H3, M1, H6.
- **Đợt 2:** chuẩn hóa `StatusBadge` → `PageHeader` → `Modal` → `Button` / `DataTable`, làm theo từng trang; mỗi trang kiểm tra lại bằng bộ kịch bản trình duyệt đã dùng trong báo cáo này.

---

## Phụ lục

### 1. Design System – số liệu

| Chỉ số | Giá trị |
|---|---|
| Token màu sáng/tối + màu nhấn theo vai trò | Có (`styles/tokens.css`); vai trò chỉ đổi accent và sidebar |
| Trang dùng thư viện `components/ui` | 14 / 41 |
| `<PageHeader>` / `<StatusBadge>` / `<DataTable>` | 2 / 1 / 0 trang |
| `<Button>` chung so với `<button>` tự viết | 16 / 279 |
| Mã hex viết cứng (`src/`) | 2.184 (nhiều nhất: `shell.css` 122, `customer/Account.tsx` 115, `MaintenancePackages.tsx` 106) |
| Class màu Tailwind cố định (`slate-*`, `red-*`…) | 763 |
| Hệ icon | 3 (Font Awesome, emoji/Unicode, `Icon` SVG) |
| Bo góc / bóng | Token có (`rounded-control/card/panel`, `shadow-card/raised/overlay`), nhưng trang cũ dùng `rounded-[19px]`, `rounded-2xl`… tùy ý |

### 2. Dashboard Admin & Advisor

| Câu hỏi | Advisor | Admin |
|---|---|---|
| Dùng chung hệ thống layout? | Có (`WorkLayout`) | Có |
| Menu dễ hiểu, phân nhóm hợp lý? | Có: Điều hành / Sửa chữa / Khách hàng | Có: Điều hành / Con người / Danh mục / Hệ thống |
| Active state rõ ràng? | Có, kể cả danh sách đã lọc | Có |
| Nội dung quá dày / quá nhiều card? | Trang Tổng quan cân đối; Lịch hẹn và Khách hàng có 3–4 thẻ số liệu + khối lọc | **Có**: 4 tầng trước dữ liệu |
| Thao tác quan trọng dễ tìm? | Có ("Tiếp nhận xe" là nút chính ở Tổng quan) | Có, nhưng 2 nút chính cạnh tranh nhau |
| Khoảng trắng hợp lý? | Tổng quan / Lịch hẹn: có. **Tiếp nhận / Phiếu: không có lề** | Có |
| Giống hệ thống quản lý gara chuyên nghiệp? | Phần khung: có. Trang nghiệp vụ: chưa hoàn thiện | Phần khung: có. Trang con: còn cảm giác "ghép card" |

### 3. Kịch bản thao tác thực tế (25 kịch bản)

| Khu vực | Kịch bản | Kết quả |
|---|---|---|
| Đăng nhập | Bấm 4 lần liên tiếp | Đạt: chỉ 1 request `POST /api/login` |
| Đăng nhập | Sai mật khẩu | Đạt: "Email hoặc mật khẩu không đúng." |
| Layout | Sidebar + topbar + breadcrumb; một mục sáng; danh sách lọc sáng đúng mục | Đạt |
| Menu tài khoản | Mở bằng click; Esc đóng + trả focus; click ra ngoài | Đạt |
| Sidebar | Thu gọn, lưu khi chuyển trang, mở lại | Đạt |
| Theme | Đổi và giữ sau khi tải lại | Đạt |
| Ngăn kéo 375 px | Ẩn khi đóng; mở (aria, focus, khóa cuộn); Esc; chọn menu | Đạt |
| Modal Advisor › Khách hàng | Nút "Thêm" mở modal | Đạt |
| Modal Advisor › Khách hàng | **Esc đóng modal** | **Không đạt** |
| Modal Admin › Dịch vụ | Nút thêm mở modal | Đạt |
| Modal Admin › Dịch vụ | **Esc đóng modal** | **Không đạt** |
| Admin Tổng quan | Thẻ số liệu là số thật từ API | Đạt (6 / 4 / 2 / 8) |
| Đặt lịch | Chọn 3 xe đã lưu, các ô Hãng / Dòng / Biển số đồng bộ | Đạt |
| Đặt lịch | Ngăn kéo dịch vụ mở, đóng bằng Esc | Đạt |
| Phân trang Advisor › Lịch hẹn | "Sau" gọi `page=2`, khóa ở trang cuối | Đạt |
| Hủy lịch (Customer) | Hỏi lại trước khi gửi, không gửi request khi chưa xác nhận | Đạt |
| Hủy lịch (Customer) | Modal có `role="dialog"`, đóng bằng Esc | **Không đạt** (không có `role`; trang không xử lý Esc, theo mã nguồn) |

Chưa thử (vì sẽ ghi vào dữ liệu thật): lưu / xóa thật, bấm liên tục nút lưu ở các form khác ngoài đăng nhập. Mã nguồn cho thấy phần lớn form có biến `saving` / `submitting` để khóa nút, nhưng chưa kiểm chứng bằng trình duyệt.

### 4. Console và runtime

- 296 lượt tải: **0** `console.error`, **0** exception, **0** API ≥ 400.
- Lưu ý hiệu năng (môi trường dev): `/api/me` gọi 6 lần mỗi lần tải; trang Tổng quan khoảng 10 request; mở trang ngay sau Tổng quan có thể chờ khoảng 12 giây với `php -S`.

### 5. Việt hóa – tiếng Anh còn sót

| Chuỗi | Trang | Đề xuất |
|---|---|---|
| ATELIER / AUTO CARE | Header công khai (mọi trang công khai và Customer) | Giữ "ATELIER" (thương hiệu); "AUTO CARE" → "Chăm sóc ô tô" |
| CARSERVICE / SERVICE COLLECTION | `/services` | "CarService / Danh mục dịch vụ" |
| READY WHEN YOU ARE | `/services` | "Sẵn sàng khi bạn cần" |
| MY GARAGE / ACCOUNT · APPOINTMENTS · VEHICLES · SERVICE HISTORY · TRACKING · QUOTATIONS | Customer | "Gara của tôi / Tài khoản · Lịch hẹn · Xe · Lịch sử · Tiến độ · Báo giá" |
| SEND MESSAGE | `/contact` | "Gửi tin nhắn" |
| SERVICE DESK / RECEPTION · REPAIR ORDERS · REPAIR ORDER | Advisor | "Quầy dịch vụ / Tiếp nhận xe · Phiếu sửa chữa" |
| ACCOUNT MANAGEMENT · SERVICE MANAGEMENT · MAINTENANCE PACKAGES · INVENTORY MANAGEMENT · GARAGE OVERVIEW · SERVICE REPORT | Admin | Bỏ (đã có nhãn tiếng Việt ngay cạnh) |
| Garage của tôi / Garage đang trống / Garage sẽ… | Customer | "Gara của tôi"… |
| Hotline hỗ trợ… | Footer, Thanh toán | "Đường dây nóng…" |
| check-in | Advisor › Tiếp nhận | "nhận xe" |
| "…cập nhật trực tiếp trên Laravel", "…tải từ backend", "Frontend module Admin", "Đây là trang khung của Task 01", "Dùng Axios Client chung…" | Advisor, Admin, các trang khung | Viết lại cho người dùng cuối |
| Ô chọn ngày `mm/dd/yyyy` | Advisor › Lịch hẹn | Phụ thuộc ngôn ngữ trình duyệt; nếu cần cố định thì dùng ô chọn ngày tự làm |

Đã đạt: menu, nút, tiêu đề, thông báo lỗi API, Empty/Loading state, tooltip, aria-label đều là tiếng Việt.

### 6. Theo từng vai trò

- **Customer:** giao diện đơn giản, không có dashboard quản trị dư thừa (trang `/customer/dashboard` cũ không có đường dẫn tới). Đặt lịch 4 bước rõ ràng. Cần sửa: H1 (khi chưa đăng nhập), M5 (thiếu tên hãng xe), đầu trang mỗi nơi một kiểu, nhãn "MY GARAGE".
- **Advisor:** luồng nghiệp vụ đầy đủ và dễ tìm từ sidebar (Tiếp nhận → Phiếu → Báo giá → Tiến độ → Thu tiền). Màn hình Chi tiết phiếu có thanh tiến trình 5 bước, rất rõ. Cần sửa: H2 (lề), chữ kỹ thuật, ngày giờ ISO, tab dùng sai màu nhấn.
- **Admin:** khung và Tổng quan chuyên nghiệp. Trang con nhiều tầng thẻ, `AdminHubNav` thừa, Báo cáo là dữ liệu mẫu, 3 mục "Sắp có" (Nhân sự, Danh mục phụ tùng, và "Đặt lịch hộ" phía Advisor) vẫn là trang khung kèm chữ dành cho lập trình viên.

### 7. Build, test và khả năng bảo trì

| Chỉ số | Kết quả |
|---|---|
| `tsc -b` | Đạt |
| `vite build` | Đạt (cảnh báo: một file JS 895 kB) |
| `eslint .` | 23 lỗi, 4 cảnh báo (chủ yếu `setState` trong `useEffect` ở 20 trang) |
| Smoke test | 10 / 13 đạt; 3 không đạt đã ghi nhận từ trước (`atelier-public-smoke`, `tailwind-migration`, `customer-tracking-booking`) |
| File lớn nhất | `MaintenancePackages.tsx` 1.526 dòng, `customer/Account.tsx` 1.222, `admin/Services.tsx` 1.008, `customer/Booking.tsx` 972, `customer/Dashboard.tsx` 952 |
| Component trùng chức năng | Thông báo (3 cơ chế), modal (7 bản tự viết + `Modal` chung), badge trạng thái (`StatusBadge` + `WorkflowUI.Status` + map riêng ở 3 trang), header (5 bản cũ + `AtelierPublicHeader` + `WorkLayout`) |
| CSS cũ | `shell.css` 261 dòng / 144 `!important` (cầu nối cho trang cũ); `atelier-booking.css`, `atelier-customer-complete.css` khoảng 114 `!important`; 2 file CSS không được import |
| Tài liệu | **Không có ARCHITECTURE.md**; README chỉ hướng dẫn cài đặt. Hướng dẫn thiết kế chỉ nằm trong comment đầu `tokens.css`, `buttons.css`, `components/ui/index.ts` |
| AI / người mới có xác định nhanh nơi sửa không? | Khu vực đã refactor (layout, `components/ui`, `config/status.ts`, `config/labels.ts`): **có**. Trang cũ: **khó**, vì cùng một thứ có nhiều bản và màu nằm rải rác trong từng file |
