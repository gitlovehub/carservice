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
| D-012 | 08/11/2026 | **Không** làm ký tay trên màn hình (SignaturePad) trong P1; khách không dùng email → tạo/kích hoạt tài khoản tại quầy hoặc dùng OTP email | Phương án đơn giản theo chỉ đạo PO | PO |

Lưu ý triển khai D-005: OTP đi chung đường gửi với OTP quên mật khẩu; test dùng `Mail::fake()`. Việc xác minh tên miền trên Resend và cấu hình Railway do PO làm, ngoài code.

## Quyết định kỹ thuật chờ PO xác nhận

| ID | Ngày | Nội dung | Lý do | Trạng thái |
|---|---|---|---|---|
| T-001 | 08/11/2026 | Hủy mục roadmap P0 "hóa đơn gộp mọi báo giá"; giữ `latestQuotation`; việc gộp chuyển sang P3 (chỉ `INITIAL` + `SUPPLEMENT`) | Phiên bản báo giá là bản thay thế; gộp sẽ tính tiền hai lần. Có test khóa | Chờ PO xác nhận khi nghiệm thu P0 (P0-04) |
