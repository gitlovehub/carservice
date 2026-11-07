# MASTER TASK LIST

Trạng thái: `PENDING` · `IN_PROGRESS` · `IMPLEMENTED` (code xong, chưa đủ bằng chứng) · `VERIFIED` (đủ bằng chứng nghiệm thu) · `BLOCKED`.
Quy tắc: một NEXT = một task. Không chuyển Phase khi Phase trước chưa nghiệm thu.
Chi tiết kỹ thuật từng Phase: `BUSINESS_IMPLEMENTATION_ROADMAP.md`. P2–P7 sẽ được chia nhỏ khi đến lượt.

## P0 – Sửa lỗi an toàn

| ID | Mô tả | Phụ thuộc | Trạng thái | Bằng chứng |
|---|---|---|---|---|
| P0-01 | Gỡ đường nhân viên "ghi nhận khách đồng ý" (route, controller, UI, API client) | — | VERIFIED | Backend test `test_staff_cannot_respond_…`; smoke `customer-approval-only.mjs`; trình duyệt P0-03 |
| P0-02 | Hủy việc "gộp mọi báo giá" (sẽ tính tiền 2 lần); thêm test khóa hành vi báo giá lại | — | VERIFIED (tự động) | `test_requote_replaces_…` (750.000), `test_new_quotation_cannot_be_created_while_repair_is_in_progress` |
| P0-03 | Kiểm tra trình duyệt trang Chi tiết phiếu Advisor: bảng báo giá chỉ hiển thị, có hướng dẫn, không còn nút tại quầy | P0-01 | VERIFIED | 08/11/2026: 4 phiếu có sẵn (SENT/REJECTED/APPROVED/chưa báo giá) × sáng/tối; 0 lỗi console; 0 request ghi. `PHASE_P0_REPORT.md` §5 |
| P0-04 | PO nghiệm thu P0 (gồm việc chấp nhận hủy mục "gộp báo giá") | P0-03 | BLOCKED (chờ PO) | — |

## Cổng trước P1

| ID | Mô tả | Phụ thuộc | Trạng thái | Bằng chứng |
|---|---|---|---|---|
| G-01 | Chốt Q1–Q7 | — | VERIFIED | `DECISION_LOG.md` D-005 … D-012 (08/11/2026) |
| G-02 | Checkpoint Git: commit Phase 5 và P0 thành 2 commit riêng | P0-04 | BLOCKED (cần PO cho phép commit) | — |

## P1 – Hạ tầng bằng chứng và xác nhận

| ID | Mô tả | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P1A-01 | Migration (chỉ thêm bảng): `media_attachments`, `customer_confirmations`, `confirmation_otps` | P0-04, G-02 | PENDING |
| P1A-02 | Model, quan hệ, factory, enum phương thức xác nhận; test model | P1A-01 | PENDING |
| P1B-01 | `MediaService`: lưu private, SHA-256, kiểm loại/kích thước/số lượng | P1A-02, Q3 | PENDING |
| P1B-02 | API `POST /media`, `GET /media/{id}` + policy (nhân viên / chủ phiếu); test 422/403 | P1B-01 | PENDING |
| P1C-01 | `ConfirmationService`: snapshot + hash nội dung, xác nhận bằng tài khoản khách | P1A-02, Q4 | PENDING |
| P1C-02 | OTP email: `ConfirmationOtpMail`, hết hạn 10 phút, tối đa 5 lần sai, không dùng lại, throttle | P1C-01, Q1 | PENDING |
| P1C-03 | API confirmation (gửi OTP, verify OTP tại quầy, khách xác nhận `/me/…`); test nhân viên không thể tự xác nhận | P1C-02 | PENDING |
| P1D-01 | Frontend `PhotoUploader`, `ConfirmationPanel` (`components/ui`) | P1B-02, P1C-03 | PENDING |
| ~~P1D-02~~ | ~~`SignaturePad`~~ — **Hủy** theo D-012 | — | Không làm |
| P1D-03 | Smoke test + kiểm trình duyệt + hồi quy toàn bộ P1; cập nhật baseline | P1D-01 | PENDING |

## P2 – Check-in, đổi xe, khách vãng lai (chia nhỏ khi đến lượt)

| ID | Mô tả | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P2-DB | `vehicle_handovers`, `handover_checklist_items`; cột mới `repair_orders` | P1 | PENDING |
| P2-BE | Đổi xe (cùng chủ + lý do + audit), WALK_IN, `HandoverService`, chặn INSPECTING khi CHECK_IN chưa CONFIRMED | P2-DB | PENDING |
| P2-FE | Advisor: chọn xe/vãng lai/biên bản CHECK_IN; Customer: xác nhận tình trạng | P2-BE | PENDING |
| P2-QA | Test + trình duyệt + hồi quy | P2-FE | PENDING |

## P3 – Báo giá phát sinh và lịch sử duyệt

| ID | Mô tả | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P3-DB | `quotation_item_responses`; `quotations.type/parent_quotation_id/reason` | P1 | PENDING |
| P3-BE | Gộp `INITIAL` mới nhất + mọi `SUPPLEMENT` (không gộp bản báo giá lại — xem P0-02); SUPPLEMENT khi IN_PROGRESS | P3-DB | PENDING |
| P3-FE | Khách xem chẩn đoán, nhãn phát sinh; Advisor lập phát sinh, lịch sử duyệt | P3-BE | PENDING |
| P3-QA | Test + trình duyệt + hồi quy | P3-FE | PENDING |

## P4 – Check-out và ủy quyền nhận xe

| ID | Mô tả | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P4-DB | `pickup_authorizations`; CHECK_OUT dùng `vehicle_handovers` | P1, P2 | PENDING |
| P4-BE | `handOver`/`closeRepairOrder` bắt buộc CHECK_OUT + xác thực người nhận | P4-DB | PENDING |
| P4-FE | Màn check-out so sánh; khách ủy quyền / xác nhận nhận xe | P4-BE | PENDING |
| P4-QA | Test + trình duyệt + hồi quy | P4-FE | PENDING |

## P5–P7

| ID | Mô tả | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P5 | Bước dịch vụ, phút chuẩn, luồng QUICK (Q7) | P2, P3 | PENDING |
| P6 | Phụ tùng chờ, ETA | P3 | PENDING |
| P7 | Công suất gara (Q6) | P5 | PENDING |

## UI/UX tồn đọng sau Phase 5 (nguồn: `FINAL_UI_UX_AUDIT_AFTER_PHASE5.md` §5)

| ID | Mô tả | Trạng thái |
|---|---|---|
| UX-01 | H4: nút trong bảng/form trang cũ → `Button` | PENDING |
| UX-02 | M3: gộp `auth/Toast` về `notify()` | PENDING |
| UX-03 | M6: lưới thẻ số liệu mobile, vùng bấm ≥ 40 px | PENDING |
| UX-04 | M2: `PageHeader` cho trang khách | PENDING |
| UX-05 | M7: gỡ Font Awesome/emoji, dùng `Icon` | PENDING |
| UX-06 | 22 lỗi ESLint `set-state-in-effect` | PENDING |
| UX-07 | Gỡ header cũ, tách file lớn/code theo route | PENDING |
| UX-08 | L6, L7, L8 | PENDING |
| UX-09 | Đo lại tương phản dark mode trên trình duyệt | PENDING |
| UX-B1..B3 | API `model.brand` cho `/me/vehicles`; API Tổng quan; API doanh thu | BLOCKED (thay đổi API, cần PO) |

## Kết thúc

| ID | Mô tả | Phụ thuộc | Trạng thái |
|---|---|---|---|
| FINAL-01 | Hồi quy toàn bộ + audit cuối | Các Phase được duyệt | PENDING |
