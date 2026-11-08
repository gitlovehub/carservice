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
| P0-04 | PO nghiệm thu P0 (gồm việc chấp nhận hủy mục "gộp báo giá") | P0-03 | VERIFIED | D-013 (08/11/2026) |

## Cổng trước P1

| ID | Mô tả | Phụ thuộc | Trạng thái | Bằng chứng |
|---|---|---|---|---|
| G-01 | Chốt Q1–Q7 | — | VERIFIED | `DECISION_LOG.md` D-005 … D-012 (08/11/2026) |
| G-02 | Checkpoint Git: commit Phase 5 và P0 thành 2 commit riêng | P0-04 | VERIFIED | `2bec3e0` Phase 5 (81 file), `ea1b85e` P0 (17 file); không push; working tree sạch |

## P1 – Hạ tầng bằng chứng và xác nhận

| ID | Mô tả | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P1A-01 | Migration (chỉ thêm bảng): `media_attachments`, `customer_confirmations`, `confirmation_otps` | P0-04, G-02 | VERIFIED (SQLite test) · commit `a67819e` — `EvidenceSchemaTest` 4/4, suite 150/150, Pint đạt. Chưa migrate DB dev |
| P1A-02 | Model, quan hệ, hằng số phương thức/mục đích; xác nhận chỉ thêm; test model | P1A-01 | VERIFIED — `EvidenceModelsTest` 3/3, suite 153/153 |
| P1B-01 | `MediaService`: lưu private, SHA-256, kiểm loại/kích thước/số lượng; khóa thêm ảnh khi chứng từ đã được khách xác nhận | P1A-02, Q3 | VERIFIED — `MediaApiTest` 7/7 · commit `b533524` |
| P1B-02 | API `POST /media` (ADVISOR), `GET /media?attachable_type&attachable_id`, `GET /media/{id}` (theo `RepairOrderPolicy::view`); test 422/403/401 | P1B-01 | VERIFIED — suite 160/160 |
| P1C-01 | `ConfirmationService`: hash nội dung (báo giá + lựa chọn từng dòng); `/me/quotations/{id}/respond` ghi thêm `CustomerConfirmation` ACCOUNT (logic duyệt không đổi) | P1A-02, Q4 | VERIFIED |
| P1C-02 | OTP email `ConfirmationOtpMail` (liệt kê Đồng ý/Từ chối + tổng): TTL 10', tối đa 5 lần sai, dùng 1 lần, OTP mới vô hiệu OTP cũ, throttle 5/phút gửi, 10/phút verify | P1C-01, Q1 | VERIFIED |
| P1C-03 | API ADVISOR `POST /quotations/{q}/otp`, `POST /quotations/{q}/verify-otp` (code + responses; đổi lựa chọn sau khi gửi → 422); `CustomerConfirmation` EMAIL_OTP + nhân viên chứng kiến | P1C-02 | VERIFIED — `QuotationConfirmationTest` 9/9, suite 169/169 · commit `26389df` |
| P1D-01 | Frontend `components/evidence/PhotoUploader` (nén ≤ 1600 px, blob kèm token) gắn ở bước Chẩn đoán; `pages/advisor/CounterApprovalPanel` (chọn Đồng ý/Từ chối → gửi OTP → nhập mã) ở báo giá SENT; `services/evidenceService.ts` | P1B-02, P1C-03 | VERIFIED — tsc, build, eslint 0, smoke 15/15 (`evidence-confirmation-ui.mjs`) |
| ~~P1D-02~~ | ~~`SignaturePad`~~ — **Hủy** theo D-012 | — | Không làm |
| P1D-03 | Smoke test + kiểm trình duyệt + hồi quy toàn bộ P1; cập nhật baseline | P1D-01 | VERIFIED một phần — trình duyệt (phiếu #10, sáng/tối): panel hiển thị, Đồng ý/Từ chối cập nhật tổng (220.000 → 0 ₫), PhotoUploader liệt kê ảnh (GET 200), 0 lỗi console, 0 request ghi. **BROWSER_NOT_VERIFIED**: gửi/nhập OTP thật (sẽ gửi email thật) và upload ảnh (sẽ tạo dữ liệu trong DB dev) — bao phủ bởi `QuotationConfirmationTest`, `MediaApiTest` |

## P2 – Check-in, đổi xe, khách vãng lai (chia nhỏ khi đến lượt)

| ID | Mô tả | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P2-DB | `vehicle_handovers`, `handover_checklist_items`; `repair_orders` + `booked_vehicle_id`, `vehicle_change_reason`, `source`, `requires_check_in` (mặc định false → phiếu cũ không bị chặn) | P1 | VERIFIED |
| P2-B | `receive()`: đổi xe so với lịch hẹn nếu cùng chủ + lý do ≥ 5 ký tự + `audit_logs`; `source` APPOINTMENT/WALK_IN; phiếu mới `requires_check_in = true` | P2-DB | VERIFIED — `ReceptionVehicleChangeTest` 4/4, suite 173/173 · commit `b9e40cb` |
| P2-C | `HandoverService` + API CHECK_IN (DRAFT sửa được → SUBMITTED khóa + snapshot SHA-256 gồm hash ảnh → khách xác nhận ACCOUNT `/me/handovers/{id}/confirm` hoặc OTP email tại quầy → CONFIRMED; VOID + lý do khi chưa xác nhận); chặn RECEIVED→INSPECTING (giao KTV, ghi chẩn đoán) khi `requires_check_in` mà chưa có CHECK_IN CONFIRMED; media alias `handover` (khóa ảnh khi đã gửi); `ConfirmationService` tổng quát hóa lõi OTP | P2-B | VERIFIED — `VehicleCheckInTest` 9/9, suite 182/182 · commit `6fe0f37` |
| QA-01 fix | Test chập chờn BookingCatalog | — | VERIFIED · commit `b237658` |
| P2-FE | Advisor: `CheckInPanel` (form + checklist mặc định + ảnh + gửi khách + OTP tại quầy + hủy có lý do), `ReceptionWorkflow` chọn xe khác cùng chủ + lý do; Customer: `RepairStatus` khối biên bản (xem + "Xác nhận đúng tình trạng"); API show trả `handovers` (khách: chỉ SUBMITTED/CONFIRMED) | P2-C | VERIFIED (tự động) · commit `9f51b4c` — tsc, build, eslint file mới 0 (RepairStatus/ReceptionWorkflow giữ nguyên số lỗi cũ 2/1), smoke 16/16, backend 182/182 |
| P2-QA | Trình duyệt + hồi quy | P2-FE | Hồi quy trình duyệt phiếu #10: 0 lỗi console, 0 request ghi. **BROWSER_NOT_VERIFIED**: CheckInPanel + chọn xe khi tiếp nhận (DB dev không có phiếu RECEIVED/lịch CHECKED_IN chưa có phiếu; tạo mới = tạo dữ liệu). DB dev đã migrate 2 migration P2 |

## P3 – Báo giá phát sinh và lịch sử duyệt

| ID | Mô tả | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P3-DB | `quotation_item_responses` (ghi mỗi lần khách quyết định, gắn `customer_confirmation_id`); `quotations.type` (mặc định INITIAL)/`parent_quotation_id`/`reason`; model `QuotationItemResponse`, `Quotation::TYPE_*` | P1 | VERIFIED — suite 183/183 · commit `feat(quotation): record per-line approval history` |
| P3-BE | `latestQuotation` chỉ INITIAL; `billableQuotationIds()` = INITIAL hiệu lực + SUPPLEMENT APPROVED/PARTIALLY (hóa đơn, xuất kho); SUPPLEMENT chỉ khi IN_PROGRESS/WAITING_FOR_PARTS, bắt buộc lý do, **không giảm giá** (chưa có quy tắc), tối đa 1 bản chờ trả lời; duyệt xong → tạo work_items; chặn hoàn tất khi còn phát sinh SENT | P3-DB | VERIFIED — `SupplementalQuotationTest` 5/5 (500k / 650k / 300k), test P0 vẫn đạt, suite 188/188 · commit `0967552` |
| P3-FE | Advisor `SupplementPanel` (lập phát sinh + lý do, gửi, duyệt tại quầy bằng OTP); `latestQuotation` frontend chỉ INITIAL + `billableQuotations`; Customer: nhãn "Phát sinh" + lý do ở /quotation; `CustomerDiagnosisBlock` ở /repair-status; API khách trả chẩn đoán (không có ghi chú nội bộ) | P3-BE | VERIFIED (tự động) — tsc, build, eslint file mới 0 (file cũ không tăng lỗi), smoke 17/17, backend 189/189 · commit `8fb42fa` |
| P3-QA | Trình duyệt + hồi quy | P3-FE | Trình duyệt (chỉ đọc): /repair-status chế độ sáng hiện "Kết quả chẩn đoán" cho 9 phiếu có sẵn, 0 lỗi console, 0 request ghi; Advisor #5 (COMPLETED) không hiện panel phát sinh/check-in (đúng). **Chưa kết luận**: lượt chế độ tối và /quotation (script đọc DOM trước khi tải xong). SupplementPanel thao tác thật: BROWSER_NOT_VERIFIED (cần phiếu IN_PROGRESS + tạo dữ liệu). Lịch sử duyệt từng dòng: có ở API/DB, **chưa có giao diện xem** (P3-FE-H, PENDING) |
| P3-FE-H | Giao diện xem lịch sử duyệt từng dòng (quotation_item_responses) | P3-DB | PENDING |

## P4 – Check-out và ủy quyền nhận xe

| ID | Mô tả | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P4-DB | `pickup_authorizations` (không thêm FK vào bảng cũ — kiểm ở tầng ứng dụng); CHECK_OUT dùng `vehicle_handovers` | P1, P2 | VERIFIED |
| P4-BE | Khách tạo/thu hồi ủy quyền (`/me/repair-orders/{id}/pickup-authorizations`, `DELETE /me/pickup-authorizations/{id}`, tối đa 3, ghi ACCOUNT); CHECK_OUT: người nhận OWNER hoặc AUTHORIZED (ủy quyền còn hiệu lực + 4 số cuối khớp, tên/SĐT lấy theo ủy quyền), đối chiếu CHECK_IN → `is_discrepancy`; chủ xe xác nhận (tài khoản / OTP email chủ xe); ủy quyền → USED; thu hồi sau khi lập → chặn xác nhận; `handOver` + `closeRepairOrder` (xe đã nhận theo biên bản) bắt buộc CHECK_OUT CONFIRMED khi `requires_check_in` | P4-DB | VERIFIED — `VehicleCheckOutTest` 6/6, suite 195/195 · commit `1b37879` |
| P4-FE | `CheckInPanel type="CHECK_OUT"` (checklist điền sẵn từ CHECK_IN, người nhận Chủ xe / Người được ủy quyền chọn từ danh sách chủ xe khai báo + 4 số cuối, hiển thị "Khác lúc nhận xe", mở sớm khi trả xe không sửa); Customer `CustomerPickupBlock` (thêm / thu hồi ủy quyền) | P4-BE | VERIFIED (tự động) — tsc, build, eslint không tăng, smoke 18/18, backend 195/195 |
| P4-QA | Trình duyệt + hồi quy | P4-FE | Hồi quy #10 + /repair-status: 0 lỗi console, 0 request ghi. **BROWSER_NOT_VERIFIED**: panel trả xe + khối ủy quyền (không có phiếu phù hợp / tạo dữ liệu). DB dev đã migrate P4 |

## P5–P7

| ID | Mô tả | Phụ thuộc | Trạng thái |
|---|---|---|---|
| P5-A | `service_steps`; `services.service_level` (mặc định STANDARD) / `requires_vehicle_stay`; `work_items.standard_minutes` / `service_step_id`; `repair_orders.flow_type` / `estimated_ready_at`; Admin `GET/PUT /admin/services/{id}/steps`; công việc sinh theo bước; giờ dự kiến xong = now + Σ phút chuẩn công việc chưa xong (khi bắt đầu sửa / duyệt phát sinh) | P2, P3 | VERIFIED — `ServiceStepsTest` 3/3, suite 198/198 |
| P5-B | Luồng QUICK: báo giá niêm yết từ dịch vụ `service_level = QUICK`, RECEIVED → WAITING_APPROVAL (bỏ chẩn đoán), bắt buộc CHECK_IN xác nhận + 4 ảnh tổng quan (D-011), khách vẫn duyệt giá | P5-A | PENDING |
| P5-C | Frontend: Admin bước + mức dịch vụ; Advisor nút "Báo giá dịch vụ nhanh"; Customer/Advisor giờ dự kiến xong | P5-B | PENDING |
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

## Chất lượng test

| ID | Mô tả | Trạng thái |
|---|---|---|
| QA-01 | `BookingCatalogControllerTest::test_filters_packages_by_vehicle_model_name…` chập chờn (factory tạo trùng hãng "Toyota") | VERIFIED — `b237658`, 6/6 lần chạy đạt |

## Kết thúc

| ID | Mô tả | Phụ thuộc | Trạng thái |
|---|---|---|---|
| FINAL-01 | Hồi quy toàn bộ + audit cuối | Các Phase được duyệt | PENDING |
