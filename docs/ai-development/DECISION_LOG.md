# DECISION LOG

Chỉ ghi quyết định đã được PO phê duyệt vào mục "Đã phê duyệt". Đề xuất chưa duyệt nằm ở `BLOCKERS.md`.

## Đã phê duyệt

| ID | Ngày | Quyết định | Lý do / nguồn | Người duyệt |
|---|---|---|---|---|
| D-001 | trước 08/11/2026 | Duyệt Phase 3 (thư viện component) | PO trả lời "duyệt" | PO |
| D-002 | trước 08/11/2026 | Font toàn web: Kanit, độ đậm mặc định như Google Fonts | Yêu cầu PO | PO |
| D-003 | 08/11/2026 | Triển khai chỉ P0; không commit/push khi chưa được yêu cầu | Prompt "TRIỂN KHAI TỪNG PHASE CÓ KIỂM SOÁT" | PO |
| D-004 | 08/11/2026 | Làm việc theo cơ chế NEXT; một NEXT = một task; PO duyệt nghiệp vụ, dữ liệu, bảo mật, commit | Prompt "AUTONOMOUS LEAD DEVELOPER" | PO |
| D-005 | 08/11/2026 | **Q1** Kênh OTP: **email**, qua `Mail` facade (local: SMTP/log; production Railway: `MAIL_MAILER=resend`, tên miền `carservicevn.xyz`). SMS: không làm | PO: "cứ làm cái gì dễ" sau khi được trình bày phương án | PO |
| D-006 | 08/11/2026 | **Q2** Giữ role TECHNICIAN ở backend, không làm giao diện kỹ thuật viên; cố vấn nhập kết quả | như D-005 | PO |
| D-007 | 08/11/2026 | **Q3** Ảnh lưu `storage/app/private`, tải qua API có kiểm quyền; ≤ 10 MB/ảnh; JPEG/PNG/WebP; ≤ 30 ảnh/biên bản | như D-005 | PO |
| D-008 | 08/11/2026 | **Q4** Chỉ chủ xe duyệt báo giá (tài khoản hoặc OTP email); người giao xe chỉ ký biên bản tình trạng | như D-005 | PO |
| D-009 | 08/11/2026 | **Q5** Phí kiểm tra khi khách từ chối: ngoài phạm vi | như D-005 | PO |
| D-010 | 08/11/2026 | **Q6** Công suất: chỉ cảnh báo theo tổng phút/ngày, không chặn cứng | như D-005 | PO |
| D-011 | 08/11/2026 | **Q7** Dịch vụ nhanh bắt buộc 4 ảnh tổng quan | như D-005 | PO |
| D-013 | 08/11/2026 | **Nghiệm thu P0**, gồm T-001 (hủy "gộp mọi báo giá") | PO chọn "Duyệt P0" | PO |
| D-014 | 08/11/2026 | Cho commit local (không push) Phase 5 và P0 thành 2 commit riêng | PO chọn "Cho commit". Chỉ áp dụng cho checkpoint này; commit sau vẫn phải hỏi | PO |
| D-015 | 08/11/2026 | **AUTONOMOUS DONE MODE**: tự triển khai roadmap P1→P7 + UI/UX; **tự commit** từng chức năng khi test đạt (Conventional Commits). Không push/merge/deploy; không thao tác DB production; không email/OTP thật; không đổi tính tiền, phương thức xác nhận, chính sách ủy quyền khi còn mơ hồ | Prompt "AUTONOMOUS DONE MODE" | PO |
| D-017 | 10/11/2026 | **B-05 "Chờ phụ tùng"** để sau: làm xong phần **khách hàng (client)**, rồi tới **cố vấn**, mới chốt logic ai đặt/nhận phụ tùng | PO trả lời sau khi xem B-05 | PO |
| D-018 | 10/11/2026 | **Bỏ đổi thứ tự dịch vụ** (gỡ `PUT /api/admin/services/reorder`, sort `order`). Mặc định dịch vụ **mới tạo lên đầu** (admin + trang đặt lịch khách). Bộ lọc "Phổ biến" / "Mới nhất" phía khách làm sau (khi làm client) | PO | PO |
| D-019 | 10/11/2026 | Đổi tên dịch vụ trùng trên **DB dev** (dữ liệu factory cũ): id 7 → "Thay má phanh 4 bánh", 3 → "Thay đĩa phanh 4 bánh", 8 → "Thay dầu động cơ tổng hợp", 6 → "Thay lọc gió động cơ"; giữ bản id nhỏ nhất. Không gộp (mỗi bản có 17–26 dòng báo giá, 24–32 lịch hẹn) | PO đồng ý "được" | PO |
| D-020 | 16/11/2026 | **B-05 chốt phương án (a) Admin / kho**: cố vấn chỉ **báo thiếu** phụ tùng (bắt buộc ≥ 1 yêu cầu khi chuyển "Chờ phụ tùng"); **Admin đặt hàng + nhận hàng** (tab "Cần đặt hàng" ở Phụ tùng & kho, "Đã về" nhập kho qua yêu cầu → không cộng kho 2 lần); Admin thấy "Phụ tùng đang chờ" ở chi tiết phiếu; phụ tùng cuối về → báo cố vấn, không tự đổi trạng thái. Làm đủ đề xuất 1–4 của B-05 (task ADV-01) | PO chọn (a) | PO |
| D-025 | 17/11/2026 | **Thu tại quầy 4 phương thức**: cố vấn ghi nhận tiền mặt / chuyển khoản / thẻ ngân hàng / ví điện tử (`Payment::COUNTER_METHODS`); trừ tiền mặt **bắt buộc mã giao dịch**, không ghi trùng mã (cùng phương thức, đã thành công); lưu người thu (`payments.recorded_by`). VNPay vẫn do khách tự trả. Admin hiện nhóm Chuyển khoản / Thẻ / Ví điện tử | PO chọn "Thêm, bắt buộc mã giao dịch" | PO |
| D-024 | 17/11/2026 | **Kiểm tra sau sửa chữa bắt buộc trước bàn giao**: cố vấn tick đủ 6 hạng mục (động cơ, phanh, lái, đèn điện, ngoại thất & vệ sinh, đối chiếu hạng mục đã duyệt) khi phiếu COMPLETED; lưu người kiểm + thời điểm + ghi chú (`repair_orders.quality_check*`); `handOver` chặn nếu chưa kiểm. Xác nhận nhận xe vẫn do chủ xe (D-008/D-012). Sidebar cố vấn theo mockup (Đặt lịch hộ ra khỏi menu, mở từ Lịch hẹn / Khách hàng) | PO chọn "Bắt buộc" | PO |
| D-023 | 17/11/2026 | Mockup trang Phụ tùng của cố vấn có Nhập kho / Xuất kho / Điều chỉnh tồn → PO chọn **giữ D-020**: trang cố vấn chỉ xem (tồn kho, yêu cầu đặt hàng, lịch sử nhập/xuất, phụ tùng theo xe) + báo thiếu cho phiếu; không lộ giá vốn | PO chọn "Giữ D-020" | PO |
| D-021 | 16/11/2026 | Bước cuối cố vấn: duyệt thứ tự ADV-06 → ADV-01 → ADV-02/03 → ADV-04 → ADV-07..10 → ADV-QA; **AI tự thiết kế** UI cố vấn (không mockup), màu vàng đồng; kế thừa bảng/bộ lọc/sắp xếp/tìm kiếm của Admin (`DataTable`, `ClearFilters`, bấm dòng mở chi tiết) một cách linh động; **bảng chỉ hiện cột cần thiết**, bỏ cột ID/mã khi không cần | PO | PO |
| D-022 | 16/11/2026 | Cho phép **tạo dữ liệu thử trên DB dev** (lịch hẹn, phiếu, biên bản, ảnh…) để chạy trọn luồng; OTP dùng mail log (không gửi email thật) | PO "cho phép" | PO |
| D-016 | 08/11/2026 | Chạy `php artisan migrate` trên **DB dev local** (`127.0.0.1/carservice_db`, `APP_ENV=local`) cho 3 migration chỉ tạo bảng P1A | Trong phạm vi D-015 ("thêm migration không phá hủy dữ liệu"); không phải production; rollback được | AI theo D-015 |
| T-002 | 08/11/2026 | Báo giá phát sinh **không cho giảm giá** (422) | Chưa có quy tắc giảm giá cho phát sinh; tránh tự đặt quy tắc tính tiền mới. Nếu PO muốn cho giảm giá phát sinh → cần quyết định cách cộng vào hóa đơn | Kỹ thuật, chờ PO xác nhận (không chặn) |
| T-003 | 08/11/2026 | Báo giá dịch vụ nhanh chỉ gồm **dịch vụ** theo giá niêm yết (giá đã gồm vật tư theo danh mục); phụ tùng phát sinh → luồng thường/phát sinh | Tránh bỏ qua quy tắc 'phụ tùng phải có trong đề xuất chẩn đoán'. Nếu PO muốn dịch vụ nhanh kèm phụ tùng niêm yết → cần quyết định | Kỹ thuật, chờ PO xác nhận (không chặn) |
| T-005 | 16/11/2026 | Kiểm "giờ hẹn phải là khung giờ đặt lịch Admin cấu hình" chỉ áp cho **cố vấn đặt lịch hộ / đổi lịch** (ADV-04). API khách `POST /appointments` + khách tự đổi lịch vẫn chỉ kiểm giờ làm việc (giao diện khách vốn chỉ cho chọn khung giờ). Nếu PO muốn siết cả API khách → thêm `requireConfiguredSlot` ở `AppointmentController` + sửa giờ trong test cũ (nhiều test đặt 10:00/12:00/13:00) | Giữ phạm vi ADV-04, không đổi hành vi khách | Kỹ thuật, chờ PO xác nhận (không chặn) |
| T-004 | 08/11/2026 | Công suất: lịch hẹn không có thời lượng dịch vụ tính **60 phút**; ngày chưa cấu hình năng lực → không cảnh báo; ngày nghỉ → năng lực 0 | Cần một giá trị mặc định để ước lượng tải; chỉ ảnh hưởng cảnh báo (Q6), không chặn | Kỹ thuật, chờ PO xác nhận (không chặn) |
| D-012 | 08/11/2026 | **Không** làm ký tay trên màn hình (SignaturePad) trong P1; khách không dùng email → tạo/kích hoạt tài khoản tại quầy hoặc dùng OTP email | Phương án đơn giản theo chỉ đạo PO | PO |

Lưu ý triển khai D-005: OTP đi chung đường gửi với OTP quên mật khẩu; test dùng `Mail::fake()`. Việc xác minh tên miền trên Resend và cấu hình Railway do PO làm, ngoài code.

## Quyết định kỹ thuật chờ PO xác nhận

| ID | Ngày | Nội dung | Lý do | Trạng thái |
|---|---|---|---|---|
| T-001 | 08/11/2026 | Hủy mục roadmap P0 "hóa đơn gộp mọi báo giá"; giữ `latestQuotation`; việc gộp chuyển sang P3 (chỉ `INITIAL` + `SUPPLEMENT`) | Phiên bản báo giá là bản thay thế; gộp sẽ tính tiền hai lần. Có test khóa | **Đã duyệt** (D-013) |
