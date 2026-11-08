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
| D-016 | 08/11/2026 | Chạy `php artisan migrate` trên **DB dev local** (`127.0.0.1/carservice_db`, `APP_ENV=local`) cho 3 migration chỉ tạo bảng P1A | Trong phạm vi D-015 ("thêm migration không phá hủy dữ liệu"); không phải production; rollback được | AI theo D-015 |
| T-002 | 08/11/2026 | Báo giá phát sinh **không cho giảm giá** (422) | Chưa có quy tắc giảm giá cho phát sinh; tránh tự đặt quy tắc tính tiền mới. Nếu PO muốn cho giảm giá phát sinh → cần quyết định cách cộng vào hóa đơn | Kỹ thuật, chờ PO xác nhận (không chặn) |
| T-003 | 08/11/2026 | Báo giá dịch vụ nhanh chỉ gồm **dịch vụ** theo giá niêm yết (giá đã gồm vật tư theo danh mục); phụ tùng phát sinh → luồng thường/phát sinh | Tránh bỏ qua quy tắc 'phụ tùng phải có trong đề xuất chẩn đoán'. Nếu PO muốn dịch vụ nhanh kèm phụ tùng niêm yết → cần quyết định | Kỹ thuật, chờ PO xác nhận (không chặn) |
| T-004 | 08/11/2026 | Công suất: lịch hẹn không có thời lượng dịch vụ tính **60 phút**; ngày chưa cấu hình năng lực → không cảnh báo; ngày nghỉ → năng lực 0 | Cần một giá trị mặc định để ước lượng tải; chỉ ảnh hưởng cảnh báo (Q6), không chặn | Kỹ thuật, chờ PO xác nhận (không chặn) |
| D-012 | 08/11/2026 | **Không** làm ký tay trên màn hình (SignaturePad) trong P1; khách không dùng email → tạo/kích hoạt tài khoản tại quầy hoặc dùng OTP email | Phương án đơn giản theo chỉ đạo PO | PO |

Lưu ý triển khai D-005: OTP đi chung đường gửi với OTP quên mật khẩu; test dùng `Mail::fake()`. Việc xác minh tên miền trên Resend và cấu hình Railway do PO làm, ngoài code.

## Quyết định kỹ thuật chờ PO xác nhận

| ID | Ngày | Nội dung | Lý do | Trạng thái |
|---|---|---|---|---|
| T-001 | 08/11/2026 | Hủy mục roadmap P0 "hóa đơn gộp mọi báo giá"; giữ `latestQuotation`; việc gộp chuyển sang P3 (chỉ `INITIAL` + `SUPPLEMENT`) | Phiên bản báo giá là bản thay thế; gộp sẽ tính tiền hai lần. Có test khóa | **Đã duyệt** (D-013) |
