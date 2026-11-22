# SESSION HANDOFF

> Chế độ: **AUTONOMOUS DONE MODE** (D-015) — tự triển khai + tự commit từng chức năng; không push.
> Cập nhật: 10/11/2026 — góp ý PO đợt 3 trang Admin (xong). Tiếp theo: client → cố vấn (B-05 để lúc làm cố vấn).

## ADV-19 — Tiếp nhận, ghi chú, phát sinh, qua đêm (22/11/2026, `v3-advisor`, chưa commit) — VERIFIED

- Chi tiết ở MASTER_TASK_LIST ADV-19, quyết định D-026..028. Hai lỗ hổng của ADV-QA đợt 1 bên dưới đã xử lý.
- PO chỉnh thêm 22/11: xóa hẳn `repair_orders.note` (DB dev đã migrate tới `2026_11_22_045143`, có file sao lưu, xem D-028; **deploy sẽ xóa cột này trên production, cần sao lưu trước**), VIN nhận 6–17 ký tự hợp lệ, tag Gói / Dịch vụ sau tên, góc vuông, tone trạng thái, khối ghi chú chỉ đậm tiêu đề.
- Nút primary **Chi tiết phiếu** (`OpenOrderButton` trong `advisorListKit.tsx`): khung xem nhanh Phiếu, Báo giá, Tiến độ, Kiểm tra & bàn giao, Thanh toán, Biên bản; Phụ tùng (yêu cầu + lịch sử xuất nhập); Khách hàng (lịch sử + đánh giá); Lịch hẹn đã có phiếu. Backend 409/409.
- Phiếu cũ: `initial_condition` có thể đang chứa lời khách (form cũ ghi lẫn) nên hiện dưới "Tình trạng xe khi nhận"; không tự chuyển dữ liệu vì không phân biệt được.
- **Tiếp theo**: bấm thao tác trên giao diện cho các nhánh còn lại của ADV-QA.

## ADV-QA — đợt 1 (22/11/2026, `v3-advisor`, chưa commit) — IN_PROGRESS

- Môi trường: SQLite QA riêng + storage riêng + `MAIL_MAILER=log`, queue sync; không ghi vào `carservice_db`, không gửi email thật. Muốn PHP nhận `LARAVEL_STORAGE_PATH` phải chạy với `-d variables_order=EGPCS`.
- Đạt qua API: luồng chính, vãng lai, dịch vụ nhanh, từ chối toàn bộ, từ chối một phần, phát sinh (chỉ dịch vụ), chờ phụ tùng, đổi xe, ủy quyền nhận xe. Trình duyệt chỉ đọc 30 trang × 2 khổ màn hình không có lỗi; chưa bấm thao tác từng nút trên giao diện.
- **Lỗ hổng cần PO quyết**: đang sửa mà phát hiện phụ tùng mới thì không lập được báo giá phát sinh cho phụ tùng đó: `addInspectionRecommendation` chặn thêm đề xuất sau khi bắt đầu sửa, còn `addQuotationItems` bắt buộc phụ tùng phải có trong đề xuất. `SupplementalQuotationTest` không phát hiện vì tạo đề xuất thẳng trong DB.
- **Cần PO định nghĩa**: "xe qua đêm" chưa có nghiệp vụ; `services.requires_vehicle_stay` chỉ được lưu, không có logic hay giao diện dùng.
- Lượt chạy đầu ghi 4 dòng lỗi nghiệp vụ vào `backend/storage/logs/laravel.log` thật (09:25–09:27); 4 ảnh thử đã chuyển khỏi storage thật.

## ADV-17 — Xe của khách hàng theo mockup PO (17/11/2026, `v3-advisor`, chưa commit) — VERIFIED

- Chi tiết ở MASTER_TASK_LIST ADV-17. "Xe bảo dưỡng định kỳ" = xe từng đặt gói bảo dưỡng tại gara (dữ liệu thật); hệ thống chưa có "đến hạn bảo dưỡng".
- Toàn bộ trang cố vấn trong sidebar đã theo mockup, trừ Lịch hẹn / Tiếp nhận (mockup 16/11, bố cục riêng). **Tiếp theo: ADV-QA**.

## ADV-16 — Khách hàng làm lại theo mockup PO (17/11/2026, `v3-advisor`, chưa commit) — VERIFIED

- `Customers.tsx` thành danh sách + khung chi tiết như các trang mockup khác; API `/customers` thêm tổng chi tiêu, hạng khách, nhóm lọc. Chi tiết ở MASTER_TASK_LIST ADV-16.
- **Cần PO xác nhận**: "Thân thiết" = từ 3 lượt sửa đã bàn giao (`Customer::LOYAL_MIN_VISITS`) — mình tự đặt, chỉ để hiển thị / lọc; đổi số này một chỗ ở backend.
- Trang Xe khách hàng vẫn bản ADV-09 (banner + bảng) — chưa có mockup.

## ADV-15 — Thanh toán theo mockup PO (17/11/2026, `v3-advisor`, chưa commit) — VERIFIED

- PO chọn (D-025): thu tại quầy 4 phương thức, trừ tiền mặt bắt buộc mã giao dịch. Migration `payments.recorded_by` (DB dev đã migrate). Chi tiết ở MASTER_TASK_LIST ADV-15.
- Dữ liệu thử trên DB dev: RO-2026-DM0197 đã thu đủ (chuyển khoản 100.000 ₫ mã TEST-ADV15-CK-… + tiền mặt 2.978.000 ₫), chưa kiểm tra / chưa bàn giao; RO-2026-KF8VW0 **đã bàn giao** (17/11).
- Thông báo thanh toán / bàn giao chỉ tạo thông báo web (không email) — chạy thử an toàn với `.env` local.
- Đã làm đủ 9 mockup cố vấn (Tổng quan, Lịch hẹn, Tiếp nhận, Phiếu, Báo giá, Tiến độ, Phụ tùng, Kiểm tra & bàn giao, Thanh toán). **Tiếp theo: ADV-QA**.

## ADV-14 — Kiểm tra & bàn giao + sidebar theo mockup PO (17/11/2026, `v3-advisor`, chưa commit) — VERIFIED

- PO chọn: kiểm tra sau sửa **bắt buộc** trước bàn giao (D-024) → migration mới (DB dev đã migrate), API `quality-check`, `handOver` chặn. Chi tiết ở MASTER_TASK_LIST ADV-14.
- Dữ liệu thử: RO-2026-KF8VW0 đã có kết quả kiểm tra (ghi chú "[DỮ LIỆU THỬ ADV-14]"), đang "Đủ điều kiện bàn giao" — chưa bàn giao.
- Phiếu COMPLETED cũ trên DB dev giờ phải kiểm tra trước khi bàn giao (đúng quy tắc mới). Phiếu đã bàn giao trước đây hiện "bàn giao trước khi có bước kiểm tra".
- Menu "Thanh toán" tạm trỏ danh sách phiếu chờ thu tiền — chờ mockup trang Thanh toán. **Tiếp theo: mockup Thanh toán hoặc ADV-QA**.

## ADV-13 — Phụ tùng (cố vấn, chỉ xem) theo mockup PO (17/11/2026, `v3-advisor`, chưa commit) — VERIFIED

- PO xác nhận 17/11: **giữ D-020** — trang cố vấn không có Nhập kho / Xuất kho / Điều chỉnh tồn; thay bằng "Báo thiếu phụ tùng" cho phiếu. Chi tiết ở MASTER_TASK_LIST ADV-13.
- API mới `GET /advisor/parts`, `GET /advisor/stock-moves` (chỉ đọc, ẩn giá vốn). `services/advisorPartsApi.ts`.
- Còn trong sidebar mockup: Kiểm tra & bàn giao, Thanh toán. **Tiếp theo: mockup tiếp của PO hoặc ADV-QA**.

## ADV-12 — Tiến độ sửa chữa theo mockup PO (17/11/2026, `v3-advisor`, chưa commit) — VERIFIED

- Trang mới `/advisor/repair-progress` (chi tiết ở MASTER_TASK_LIST ADV-12). Bắt đầu / Xong công việc, Báo thiếu phụ tùng, Hoàn thành sửa chữa làm được ngay ở khung xem nhanh (cùng API + điều kiện với trang chi tiết).
- **Múi giờ**: `App\Support\GarageDay` (Asia/Ho_Chi_Minh) cho lọc theo ngày. Các chỗ cũ khác vẫn dùng ngày UTC (vd. `AdvisorDashboardController` "hôm nay", seeder) — chưa rà, nên kiểm trong ADV-QA vì lệch 0h–7h sáng.
- Còn trong sidebar mockup: Phụ tùng chờ xử lý, Kiểm tra & bàn giao, Thanh toán. **Tiếp theo: mockup tiếp của PO hoặc ADV-QA**.

## ADV-11 — Báo giá & phê duyệt theo mockup PO (17/11/2026, `v3-advisor`, chưa commit) — VERIFIED

- Trang mới `/advisor/quotations` + API `GET /quotations` (chi tiết ở MASTER_TASK_LIST ADV-11). Khung xem nhanh tải phiếu (`workflowApi.order`) rồi lấy báo giá theo id — không thêm API chi tiết báo giá.
- Không làm "Đánh dấu đã phê duyệt" (D-008/D-012) và tab "Tệp đính kèm" (chưa có dữ liệu).
- `advisorListKit.tsx` / `advisorListFormat.ts` dùng chung với Phiếu sửa chữa (StageTrack phiếu nay dựng bằng `Track`).
- **Tiếp theo: ADV-QA** (hoặc mockup PO tiếp theo: Tiến độ sửa chữa / Phụ tùng chờ xử lý / Kiểm tra & bàn giao / Thanh toán — sidebar mockup đã có các mục này).

## ADV-07b — Phiếu sửa chữa theo mockup PO (17/11/2026, `v3-advisor`, chưa commit) — VERIFIED

- `AdvisorRepairOrders.tsx` viết lại thành danh sách thẻ + khung xem nhanh (chi tiết ở MASTER_TASK_LIST ADV-07b). CSS `.adv-ro-*`, `.adv-track*` trong `advisorDashboard.css`.
- `repairOrderFlow.ts` mới (STEPS, `nextAction`, `currentStepIndex`, `hasHandover`, `CLOSE_REASONS`, `orderStepPath`) — chi tiết phiếu import từ đây, nhận `?step=reception|inspection|quotation|repair|delivery`.
- Backend `GET /repair-orders` thêm `from`/`to` (ngày nhận xe); `RepairOrderListTest` 4/4. `listRepairOrders` thêm `from`, `to`, `perPage`.
- Nút thao tác của mockup ("Gửi phê duyệt cho khách") dẫn tới bước Báo giá ở trang chi tiết, không gửi ngay trong khung xem nhanh.
- **Tiếp theo: ADV-QA**.

## ADV-09 — Khách hàng / Xe khách hàng (16/11/2026, `v3-advisor`, chưa commit) — VERIFIED

- `Customers.tsx`, `Customer-cars.tsx` viết lại; banner chung mới `AdvisorPageHero.tsx` (tab liên kết, `aria-current`). Chi tiết ở MASTER_TASK_LIST ADV-09.
- Backend: `CustomerController` index/show, `VehicleController` index (+ `open_repair_order_id`) và **destroy chặn xe đang ở xưởng / có lịch chưa xong** (trước đây nhân viên xoá được). Test `AdvisorCustomerListTest`.
- `CreateBooking` nhận khách chọn sẵn qua router state (nút "Đặt lịch hộ" ở ngăn chi tiết khách).
- `getAdvisorCustomers` / `getAdvisorVehicles` cũ không còn trang nào dùng (giữ, dọn sau).
- **Tiếp theo: ADV-QA** (trọn luồng + 9 nhánh ngoại lệ; không bấm gửi OTP / đổi lịch vì `.env` local gửi email thật).

## ADV-08 (phần 2) — Tiếp nhận xe theo mockup PO (16/11/2026, `v3-advisor`, chưa commit) — ADV-08 VERIFIED

- `ReceptionWorkflow.tsx` viết lại (chi tiết ở MASTER_TASK_LIST ADV-08). Giữ đủ hành vi cũ mà smoke test khoá (xác minh lịch + cảnh báo công suất, xác nhận xe đến, xác nhận tạo phiếu — mỗi lịch một phiếu, đổi xe có lý do + audit, xe chưa có trong hệ thống, lịch sử + đổi lịch, tải 7 ngày, khách vãng lai `?mode=walk-in`). Biên bản nhận xe (`CheckInPanel`) nhúng trực tiếp sau khi tạo phiếu.
- **Không làm theo mockup**: ô tick "Khách hàng đã kiểm tra, xác nhận…" do cố vấn bấm + "Ký xác nhận điện tử" — trái quy tắc "không để nhân viên xác nhận thay khách" (đề bài giảng viên) và D-008/D-012. Xác nhận do chủ xe: tài khoản hoặc OTP email tại quầy (lưu ý `.env` local dùng Resend → OTP gửi email thật).
- Backend: `Appointment::repairOrder()` (HasOne), `AdvisorAppointmentController` index/show nạp `repairOrder:id,appointment_id,repair_order_code,status` (bỏ được việc dò từng trang phiếu để tìm phiếu của lịch).
- Dữ liệu thử DB dev: lịch #255 → phiếu **RO-2026-RKYG3Q** (RECEIVED, chưa lập biên bản).
- **Tiếp theo: ADV-09** (Khách hàng / Xe khách hàng).

## ADV-08 (phần 1) — Lịch hẹn cố vấn theo mockup PO (16/11/2026, `v3-advisor`, chưa commit)

- `Appointments.tsx` viết lại theo mockup (xem MASTER_TASK_LIST ADV-08). Dùng `catalogAdminApi` (cùng API `/advisor/appointments` với Admin). Style dùng chung: `advisorDashboard.css` thêm lớp `.adv-theme` (biến màu như Tổng quan), `.adv-page-hero`, `.adv-hero-tab`, `.adv-stat`, `.adv-notice`, `.adv-avatar`; nút trong bảng không xuống dòng (`.cs-btn` có `white-space: normal` ngoài layer Tailwind nên tiện ích `whitespace-nowrap` không thắng); ô tìm kiếm chiếm cả dòng trên điện thoại (áp cả danh sách phiếu ADV-07).
- Khác mockup có chủ ý: không cột Mã lịch (PO từng bỏ ở Admin — vẫn tìm theo mã, có trong chi tiết); không ô chọn hàng loạt (chưa có thao tác hàng loạt); trạng thái theo đúng hệ thống (không có "Đang tiếp nhận / Hoàn thành" riêng).
- **Tiếp theo: ADV-08 phần 2 — trang Tiếp nhận** theo cùng phong cách.

## ADV-10 — Tổng quan cố vấn theo mockup PO (16/11/2026, `v3-advisor`, chưa commit) — VERIFIED

- PO gửi mockup (nền tối vàng đồng, banner ảnh xưởng, 4 thẻ chỉ số có xu hướng, lịch hẹn hôm nay/sắp tới, donut trạng thái phiếu, Cần xử lý, Phiếu gần đây) + 2 ảnh nền + 1 biểu tượng. Làm ADV-10 trước ADV-08.
- Backend `GET /api/advisor/dashboard` (ADVISOR + ADMIN) — mọi số là số thật; xu hướng 7 ngày: lịch mới đặt / số lịch theo ngày hẹn / số phiếu bắt đầu sửa (lịch sử trạng thái) / số xe bàn giao. Không có số "so với kỳ trước" bịa — chỉ "Lịch hẹn hôm nay" so với hôm qua (đếm thật).
- FE: `AdvisorDashboard.tsx` thay `WorkspaceDashboard` cho route `/advisor` (file `WorkspaceDashboard.tsx` giờ không còn trang nào dùng — vẫn giữ vì 3 smoke test đọc nó; dọn ở bước sau). Sidebar khu cố vấn: mục chọn gradient vàng, logo dùng `public/advisor/advisor-logo.png` khi có.
- **Cần PO**: biểu tượng (bìa hồ sơ + xe + cố vấn) chỉ đính kèm trong chat, không có file — lưu thành `frontend/public/advisor/advisor-logo.png` thì sidebar tự hiện.
- Phát hiện + sửa lỗi cũ: `DemoOperationsSeeder` tạo giờ nhận xe có thể vượt "bây giờ" khi chạy ngay sau một khung giờ → `DemoOperationsSeederTest` hỏng theo giờ chạy; nay `cap()` giờ nhận xe.
- **Tiếp theo: ADV-08** (Lịch hẹn + Tiếp nhận; gồm chỉnh ô tìm kiếm hẹp trên 390px ở danh sách phiếu).

## NEXT ADV-07 — Danh sách phiếu cố vấn (16/11/2026, `v3-advisor`, chưa commit) — VERIFIED

Kiểm thử còn nợ từ ADV-04 đã chạy lại và đạt: backend 337/337 (sửa 2 assertion `RepairOrderListTest` chỉ khác thứ tự khoá → `assertEqualsCanonicalizing`), Pint, tsc, ESLint, smoke 30/30 (không phải 31), build. Trình duyệt `/advisor/service-orders` đạt (xem MASTER_TASK_LIST). Ghi chú nhỏ: trên 390px ô tìm kiếm hơi hẹp (cùng hàng ô "Phụ trách") — để ADV-08 làm chung khi chỉnh Toolbar. **Tiếp theo: ADV-08** (Lịch hẹn + Tiếp nhận).

ADV-07 đã viết: backend `index` nhận `status=A,B`, `search` (mã phiếu / biển số / tên / SĐT), `mine=1`, `sort=created|ready`, `per_page`, trả thêm `counts` (theo trạng thái, cùng phạm vi tìm kiếm; eager `vehicle.model.brand`). FE `AdvisorRepairOrders.tsx`: DataTable (Xe = logo + biển số + dòng xe + mã phiếu; Khách; Trạng thái; Nhận xe; Dự kiến xong — đỏ nếu quá giờ; Cố vấn — ẩn khi lọc "của tôi"), chip nhóm Đang mở (mặc định) / Nhận xe / Chẩn đoán / Báo giá / Đang sửa / Chờ phụ tùng / Chờ bàn giao / Đã xong / Tất cả, bấm dòng mở chi tiết.

## NEXT ADV-04 — Đặt lịch hộ + kiểm khung giờ (16/11/2026, `v3-advisor`, chưa commit)

- **Backend**: `App\Services\CounterRecordService` (rules + messages + `resolve()` tạo khách / xe mới trong transaction) — dùng chung cho `POST /repair-orders` (ADV-02/03) và `POST /advisor/appointments` (`StoreInternalAppointmentRequest` gộp rules). `AppointmentSlotService::assertBookable(..., requireConfiguredSlot)` — cố vấn đặt lịch + đổi lịch (`AppointmentActivityService::reschedule`) bắt buộc giờ thuộc `GarageSetting::bookingSlots()`; `availability($date)` trả từng khung (past / closed / full / available, số đã đặt, ngày nghỉ, giờ mở cửa). Route mới `GET /advisor/booking-availability?date=` (ADVISOR + ADMIN). `AdvisorAppointmentController::store` bỏ đoạn kiểm trùng lặp, gọi service. Test mới `AdvisorBookingTest` 4/4; sửa giờ trong `AdvisorAppointmentOverrideTest` (10:00 → 10:30) và `AppointmentStaffTrackingTest` (14:00 → 14:15) cho đúng khung giờ mặc định — test "khung giờ đầy" trước đây chỉ đạt vì lý do khác sau thay đổi này, nay kiểm đúng.
- **Phía khách KHÔNG đổi**: `POST /appointments` (khách) vẫn chỉ kiểm giờ làm việc (UI khách vốn chỉ cho chọn khung giờ). Ghi T-005 trong `DECISION_LOG.md` để PO quyết có siết thêm không.
- **Frontend**: `CreateBooking.tsx` (route `create-booking`, bỏ placeholder + nhãn "Sắp có"); `CustomerVehiclePicker.tsx` tách từ `WalkInReception` (tìm SĐT / tên / biển số, khách mới, xe có sẵn / mới, `blockBusyVehicles`), `counterForms.ts` thêm `CounterPick`, `pickError`, `pickPayload`; `workflowService.bookingApi` (availability, packages theo dòng xe, create). Smoke mới `test:advisor-booking`; `workspace-layout.mjs` đổi assertion "Sắp có" → đã có trang.
- Trình duyệt: đặt lịch qua giao diện (#255, TÈO · 12A-123.45 · 17/11 08:00, ghi chú "[DỮ LIỆU THỬ ADV-04]") → Tiếp nhận → Xác nhận → Khách đến (lịch đang CHECKED_IN, **chưa tạo phiếu**) → chọn "Xe khác, chưa có trong hệ thống" hiện form đúng. 0 lỗi console/API, 0 tràn ngang. Không bấm "Đổi lịch" (gửi email thật).
- **Tiếp theo**: ADV-07 (danh sách phiếu → DataTable + tìm kiếm).

## NEXT ADV-02 + ADV-03 — Khách vãng lai + xe chưa có trong hệ thống (16/11/2026, `v3-advisor`, chưa commit)

- **Backend** `RepairOrderController::store`: ngoài `customer_id` / `vehicle_id` nhận `customer{full_name, phone, email?}` (cấm khi có `appointment_id`) và `vehicle{model_id, trim_id?, license_plate, year?}`; tạo khách / xe (qua `VehicleCatalogSelection::apply`, biển số viết hoa, số km = km tiếp nhận) rồi `RepairOrderService::receive` trong một `DB::transaction` → lỗi (thiếu lý do đổi xe, xe khác chủ, xe đang có phiếu) thì không để lại khách / xe dở dang. Thông báo validate tiếng Việt (trùng SĐT / biển số → hướng dẫn tìm hồ sơ có sẵn). `VehicleController::byCustomer` thêm `open_repair_order_code`. Test mới `WalkInReceptionTest` 7/7.
- **Frontend**: `ReceptionWorkflow` thêm tab "Theo lịch hẹn | Khách vãng lai" (`?mode=walk-in`). `WalkInReception.tsx` (3 khối: Khách hàng — tìm SĐT/tên/biển số hoặc Khách mới; Xe khách mang tới; Tiếp nhận — km, lời khách kể, ghi chú nội bộ → hộp xác nhận → mở chi tiết phiếu). `CounterFields.tsx` (`NewVehicleFields`, `NewCustomerFields`, `VehicleChoiceList`) + `counterForms.ts` (kiểm tra biển số / SĐT / năm). Tiếp nhận theo lịch dùng `VehicleChoiceList` (luôn hiện, kể cả khách 1 xe) + "Xe khác, chưa có trong hệ thống". `workflowService`: `receiveWalkIn`, `searchCounter`, `counterCustomerVehicles`, `ReceivePayload.vehicle`. Smoke mới `test:walk-in`.
- Kiểm thử: backend 329/329, smoke 29/29, tsc, build; ESLint file mới sạch (`ReceptionWorkflow.tsx` còn 1 lỗi cũ `set-state-in-effect` → ADV-08). Trình duyệt: form khách mới, tìm không thấy, tìm theo biển số, danh sách xe thu gọn, tạo phiếu thật #191 (TÈO · 99A-999.99, ghi chú "[DỮ LIỆU THỬ ADV-02]") — 0 lỗi console/API. **Chưa kiểm trình duyệt**: tiếp nhận theo lịch + xe mới (DB dev không có lịch CHECKED_IN chưa có phiếu) — bao phủ bởi `WalkInReceptionTest::test_appointment_customer_brings_unregistered_vehicle_with_reason`.
- **Tiếp theo**: ADV-04 (Đặt lịch hộ + backend kiểm khung giờ khi cố vấn đặt/đổi lịch).

## NEXT ADV-01 — Chờ phụ tùng theo D-020 (16/11/2026, `v3-advisor`, chưa commit)

- **Backend**: `PartRequestService::report()` (cố vấn báo thiếu: phiếu IN_PROGRESS/WAITING_FOR_PARTS, mỗi phụ tùng 1 yêu cầu mở / phiếu, lưu `request_note` + người báo); `receive($alreadyInStock)` — mặc định nhập kho 1 lần (giao dịch IN gắn phiếu + người nhập), `already_in_stock` chỉ đóng yêu cầu (chặn nếu tồn < SL) để không cộng 2 lần khi kho đã nhập bằng phiếu nhập thường. `RepairOrderService::markWaitingForParts` nhận `parts[]`, bắt buộc ≥ 1 yêu cầu mở (transaction). `PartRequestController`: `store` mới, `order`/`receive` **chỉ ADMIN** (403), `cancel` cố vấn chỉ khi REQUESTED; `index` thêm `repair_order_id`, `per_page`, kèm biển số / cố vấn / tồn kho. Admin: `/admin/parts` thêm `requested`; `/admin/repair-orders/{id}` thêm `part_requests`. `Part::partRequests()`, `PartRequest::createdBy()`. Migration `2026_11_16_063420_add_request_note_to_part_requests_table` (DB dev đã migrate).
- **Cố vấn**: `PartRequestsPanel` viết lại (danh sách + trạng thái Chờ kho đặt / Kho đã đặt · ngày về / Quá hạn / Đã về; nút "Báo thiếu phụ tùng"; "Rút lại báo thiếu" khi REQUESTED); `WaitForPartsModal` thay nút chuyển thẳng; `RepairPanel` + "Việc tiếp theo" phân biệt chờ kho đặt / đã đặt / đã về đủ / phiếu cũ chưa ghi phụ tùng (RO-…DM0192, DM0195). `openPartRequests` trong `workflowService`.
- **Admin**: `pages/admin/PartOrders.tsx` = tab **Cần đặt hàng** trong Phụ tùng & kho (gom theo phụ tùng: Cần / Tồn kho / Cho phiếu / Trạng thái + ngày về; lọc + tìm + Xoá bộ lọc; khung phải từng yêu cầu: ngày dự kiến + NCC → "Đã đặt hàng"/"Cập nhật", "Hàng đã về — nhập kho", "Đã có trong kho" (khi tồn đủ), Huỷ có lý do). Tồn kho hiện "Chờ về N"; hộp Nhập kho cảnh báo + nút "Mở Cần đặt hàng". Phiếu sửa chữa: mục "Phụ tùng đang chờ" + link.
- Kiểm thử: `PartRequestTest` 9/9 (viết lại theo quyền mới), backend 322/322, smoke 28/28, tsc, build. ESLint file mới sạch; `Inventory.tsx` còn 2 lỗi cũ (preview ảnh, `preserve-caught-error`) không do ADV-01.
- Dữ liệu thử DB dev: phiếu #190 (VF 9) đã đi QUOTING → IN_PROGRESS → WAITING_FOR_PARTS; yêu cầu "Ắc quy 12V 60Ah" đã nhận (nhập kho +1), yêu cầu "Bộ má phanh trước gốm Ceramic" × 2 đang REQUESTED — đều ghi chú "[DỮ LIỆU THỬ ADV-01]".
- **Tiếp theo**: ADV-02 + ADV-03 (khách vãng lai; thêm xe mới tại quầy).

## NEXT ADV-06 — Chi tiết phiếu cố vấn theo bước (16/11/2026, `v3-advisor`, chưa commit)

- **PO chốt (16/11)**: B-05 = Admin/kho (D-020); thứ tự ADV-06 → ADV-01 → ADV-02/03 → ADV-04 → ADV-07..10 → ADV-QA, AI tự thiết kế, cố vấn giữ **vàng đồng**, bảng chỉ hiện cột cần thiết (D-021); được tạo dữ liệu thử DB dev (D-022).
- `AdvisorRepairOrderDetail.tsx` viết lại: đầu trang (mã phiếu + trạng thái + "Dịch vụ nhanh", dòng khách · biển số · xe; Làm mới, In phiếu, menu ⋯ "Đóng phiếu"); thanh 5 bước bấm được để xem lại bước cũ (mặc định bước đang làm, tự nhảy khi phiếu đổi trạng thái); thanh **Việc tiếp theo** (`nextAction`) theo trạng thái + báo giá/biên bản/hóa đơn; cột phải sticky: logo hãng, biển số, dòng xe, đổi xe so với lịch, khách (gọi được), nguồn (lịch hẹn / khách vãng lai), giờ nhận/dự kiến xong, chi phí (báo giá, phát sinh đã duyệt, hóa đơn, đã thu, còn lại), lịch sử 4 mục gần nhất. In: mọi bước đều in.
- `CloseOrderModal`: chọn lý do (`CLOSE_REASONS`) + ghi chú ≥ 5 ký tự; nếu xe đã nhận theo biên bản mà chưa có biên bản trả xe xác nhận → không cho đóng, nút "Lập biên bản trả xe" mở bước Bàn giao. Nút đóng phiếu cũ trong `QuotationPanel` (khách từ chối) giờ mở hộp thoại này (`onRequestClose`).
- Panel: bỏ nhãn "Bước N ·" + `mt-6` (khoảng cách do trang lo); `PaymentPanel` khóa "Bàn giao xe" tới khi PAID **và** biên bản trả xe đã xác nhận (trước đây chỉ kiểm PAID, backend mới chặn); dòng báo giá/đề xuất không còn đè ô SL; `CustomerRequestSummary` bỏ "Loại yêu cầu".
- Backend: `RepairOrderController::show` nạp thêm `vehicle.model.brand`, `vehicle.trim`, `bookedVehicle` (+ test `test_order_detail_includes_vehicle_brand_and_model_for_header`). FE: `workflowApi.services/parts` cache 30 giây.
- **Lưu ý**: `.env` local `MAIL_MAILER=resend` (gửi email thật) → khi chạy thử KHÔNG bấm gửi OTP; dùng khách tự xác nhận trong tài khoản (`/me/handovers/{id}/confirm`, `/me/quotations/{id}/respond`). Chỉ OTP + đổi lịch hẹn gửi mail.
- Kiểm thử: backend 318/318; smoke 28/28 (cập nhật `button-redesign.mjs` theo điều kiện bàn giao mới); tsc + build; ESLint file sửa sạch (nợ cũ ở Appointments/Customers/Customer-cars/ReceptionWorkflow → ADV-07..09). Trình duyệt (CDP): phiếu RECEIVED/INSPECTING/QUOTING/WAITING_APPROVAL/IN_PROGRESS/WAITING_FOR_PARTS/COMPLETED/HANDED_OVER/CLOSED sáng + tối, 390px, bấm xem lại bước, mở hộp thoại Đóng phiếu — 0 lỗi console/API, 0 tràn ngang.
- Dữ liệu thử DB dev (khách demo TÈO): #188 RECEIVED (Kia K5 30A-122.35), #189 INSPECTING (Innova), #190 QUOTING (VF 9) — ghi chú "[DỮ LIỆU THỬ ADV-06]", dùng tiếp cho ADV-QA.
- **Tiếp theo**: ADV-01 (Chờ phụ tùng theo D-020).

## NEXT CL-01 — Sắp xếp "Phổ biến" theo số lần dùng thật (15/11/2026, `v3-client`, chưa commit)

- Backend `ServiceController::index`: `withCount(workItems as usage_count)` trừ `CANCELLED` → gắn `popularity_rank` (1 = dùng nhiều nhất, đồng hạng khi bằng nhau, `null` = chưa ai dùng); ẩn `usage_count` để API công khai không lộ sản lượng gara.
- Frontend: `serviceDisplay.byPopularity` (hạng → mới tạo trước → id); `/services` sắp xếp "Phổ biến" (mặc định) và thẻ nổi bật trang chủ dùng hạng này. Gỡ `is_popular`/`sort_order` khỏi kiểu `Service` (cột không tồn tại → trước đây "Phổ biến" thực chất xếp theo tên). "Mới nhất" giữ nguyên (`created_at`).
- Test: `ServiceControllerTest::test_index_ranks_services_by_real_usage_without_exposing_counts`; backend 307/307; smoke 31/31; tsc đạt. API dev: hạng 1 "Kiểm tra phanh", 2 "Bảo dưỡng định kỳ".
- Còn: `catalogAdminApi.ts` vẫn khai báo `is_popular` cho admin (không dùng ở client) — để nguyên.
## Mới nhất: góp ý PO đợt 3 — tinh gọn bảng Admin (10/11/2026, nhánh v3) — PO chốt "tạm thời done trang admin"

- **Bảng chung (`DataTable`)**: bỏ dòng "Sắp xếp: … (giảm dần)" (xoá `SortStatus`); bấm dòng = mở chi tiết (Tab + Enter/Space), bỏ cột Thao tác trùng ở Phiếu sửa chữa, Hoá đơn, Khách hàng, Phụ tùng & kho (tab Tồn kho: bấm dòng = Nhập kho); thêm `evenColumns` (chia đều cột) + `actionsWidth`. `useTableSort` thêm `reset` / `isDefault`.
- **Bỏ sắp xếp** ở Tài khoản, Nhân sự, Khách hàng (luôn mới tạo nhất) và cột SĐT.
- **Nút "Xoá bộ lọc"** (`ClearFilters` trong AdminKit, chỉ hiện khi khác mặc định, đưa cả sort về mặc định): Lịch hẹn, Khách hàng, Tài khoản, Nhân sự, Hoá đơn (2 tab), Phiếu sửa chữa, Phụ tùng & kho (3 tab), Dịch vụ, Đánh giá, Nhật ký. PO bỏ ở Gói bảo dưỡng, Hãng & dòng xe.
- **Lịch hẹn**: bỏ cột Mã lịch; bỏ giờ "từ – đến" (giờ kết thúc chỉ là ước tính hệ thống) và "Loại yêu cầu" (hệ thống tự suy ra) ở bảng / lịch tuần / chi tiết / CSV / bộ lọc / form tạo lịch (form gửi `REPAIR` nếu chọn dịch vụ, ngược lại `DIAGNOSIS`); thêm cột "Tạm tính". Nút "Tuần này" đặt giữa ô tìm kiếm và chọn tuần, đỏ khi đang ở tuần hiện tại.
- **Hoá đơn**: tách cột Ngày lập (ngày + giờ 2 dòng), Thời gian giao dịch 2 dòng, cột chia đều.
- **Khách hàng**: bỏ cột Khu vực, địa chỉ (pane + form; địa chỉ cũ giữ nguyên khi sửa); khoá/mở khoá chuyển vào pane; form Thêm xe thay Biển số bằng ODO (km, không bắt buộc).
- **Dịch vụ**: bỏ cột danh mục trái → nút "Xem danh mục dịch vụ" mở `CategoryDrawer` (trượt phải: xem/lọc/sửa/thêm/xoá danh mục; thay `CategoryManagerModal`); 3 thẻ thống kê (API `service-categories.meta` thêm `active`, `visible`); bỏ cột #, bỏ kéo thả/đổi thứ tự (thứ tự hiện có giữ nguyên — PO chưa yêu cầu làm lại), bỏ sort tên; Giá / Thời gian 2 cột; Trạng thái = nhãn + công tắc; nút sửa gộp vào menu ⋯. **Bỏ "Phổ biến"** toàn hệ thống (cột, menu, form, thống kê, sort; nhóm "Phổ biến" trên trang đặt lịch khách) — cột `services.is_popular` giữ trong DB, không dùng.
- **Sửa lỗi**: sửa dịch vụ chỉ bật/tắt bị "The name has already been taken" do DB dev có tên trùng (Bảo dưỡng phanh 4 bánh ×3, Thay dầu động cơ ×2, Thay lọc gió điều hòa ×2). Form chỉ gửi `name` khi đổi; thông báo validate tiếng Việt. Dữ liệu trùng đã đổi tên (D-019).
- **Hãng & dòng xe**: 4 thẻ thống kê (API mới `GET /api/admin/vehicle-catalog/summary`); cột số + trạng thái căn giữa, thao tác sát phải, cột chia đều.
- **Thông tin gara**: tạm đóng — trang hiện "đang nâng cấp, bảo trì" (`UNDER_MAINTENANCE = true` trong `GarageSettings.tsx`; form có chế độ Sửa → Lưu/Huỷ giữ nguyên bên dưới).
- **Sau chốt (D-017..019)**: gỡ đổi thứ tự dịch vụ (route reorder, sort `order`), dịch vụ mới tạo lên đầu cả ở trang đặt lịch khách; đổi tên 4 dịch vụ trùng trên DB dev. B-05 làm sau client → cố vấn (ADV-01); bộ lọc Phổ biến/Mới nhất cho khách là CL-01.
- **Hướng tiếp theo (PO)**: hoàn thiện **client** → rồi **cố vấn**.
- **Kiểm thử**: build + ESLint file sửa đạt; backend test liên quan (BookingCatalog, AdminService, AdminCatalogRedesign) đạt. **Chưa kiểm trình duyệt** các thay đổi đợt này.

## Trước đó: góp ý PO đợt 2 — toast, báo cáo vận hành, đánh giá ga-ra, khung giờ đặt lịch (09/11/2026, nhánh v3)

Commit: `75de3cb` toast + hover nút icon · `2783927` nút duyệt xanh lá · `aec2557` Nhân sự bỏ cấp bậc + nút sửa trùng · `824c370` không xoá hãng/dòng xe · `3b8e4d3` Báo cáo (thu tiền + Vận hành) · `9763db6` Đánh giá ga-ra · `22fca58` khung giờ đặt lịch.

- **Toast duy nhất** (`FeedbackProvider`): trượt từ góc phải trên, tự tắt 3 giây, nút ✕, thanh tiến trình, không viền màu. `<Toast>` cũ chỉ còn là lớp chuyển tiếp sang `notify()`. Đã bỏ thông báo inline ở Dịch vụ, Gói, Thông tin gara, Bước chuẩn, Lịch hẹn admin/khách, Tiếp nhận, Giờ làm việc, Đặt lịch; nội dung toast nêu đúng thao tác (mã lịch, giờ, số khung giờ…).
- **Nút icon**: hover có viền + màu — sửa vàng, xem xanh dương, xoá đỏ, còn lại màu accent (`IconButton` gắn `data-icon`). Dropdown hover tô kín cả dòng. Tabs gạch chân hết thanh cuộn dọc thừa. ConfirmDialog có `variant: "success"`; mọi nút Duyệt/Xác nhận duyệt màu xanh lá.
- **Hãng/dòng xe không xoá được** (gỡ route DELETE; chỉ ẩn INACTIVE); phiên bản chưa dùng vẫn xoá được. Bỏ cột Nguồn.
- **Báo cáo**: thay `payment_methods` bằng `collection` (số hoá đơn, giá trị TB, đã thu/phát hành, còn phải thu) và `technicians` bằng `operations` (xe nhận/bàn giao/trong xưởng, thời gian xử lý TB, tỷ lệ đến đúng hẹn, khách quay lại, báo giá được duyệt, mức hài lòng). Tab mới "Vận hành".
- **Đánh giá = khách chấm ga-ra sau mỗi lần làm xe**: API bỏ tên KTV + điểm cố vấn/KTV, thêm thông tin lần làm (xe, biển số, phiếu, ngày, dịch vụ), lọc `status=unreplied|replied|hidden`, lọc từng mức sao, summary thêm TB 30 ngày / % hài lòng / % đã phản hồi. Form khách chỉ còn điểm chung + nhận xét. Cột `advisor_rating`, `technician_rating` vẫn giữ trong DB (nullable, không dùng).
- **Khung giờ đặt lịch sáng/chiều**: migration `2026_11_09_100000` thêm `garage_settings.booking_slots` (DB dev đã migrate). `GET /api/booking-slots` (công khai), `PUT /api/admin/booking-slots`. Trang Giờ làm việc có panel + nút "Chỉnh sửa khung giờ" (thay bản xem trước tự sinh). Đặt lịch của khách đọc khung giờ này và khoá giờ ngoài giờ làm việc của từng thứ (ngày nghỉ khoá hết).
- **Kiểm thử**: backend 272/272; smoke 27/27; tsc + build đạt; ESLint file sửa không thêm lỗi (còn nợ cũ `set-state-in-effect`). Trình duyệt 32/32 (16 trang Admin × sáng/tối) + chụp tab Vận hành, modal khung giờ, Nhân sự; hover sửa/xem/xoá đo bằng computed style.
- **Lưu ý dữ liệu dev**: giờ làm việc dev 08:00–16:00 nên khung mặc định 16:45 bị đánh dấu "ngoài giờ" trên panel — admin cần bỏ khung này (khách vốn đã không đặt được giờ đó). Khung giờ chưa được kiểm ở backend khi tạo lịch (cố vấn vẫn có thể đặt giờ tự do).

## Trước đó: Admin dùng dữ liệu thật (09/11/2026, nhánh v3)

Commit: `e5b5831` seeder vận hành · `e298ec0` API tổng quan + báo cáo · `ef717b9` factory tiếng Việt + chuẩn hoá dữ liệu mẫu · `7d3c70a` API phiếu/hoá đơn/thanh toán/đánh giá/nhật ký · `688a1c4` API khách hàng/nhân sự/tài khoản · `8f5c4c4` API kho · `1226ba6` API ngày nghỉ · FE: `cbbff5d` `1a773d1` `d4d0ed8` `147778e` (gỡ `src/mocks/admin`) · test `3854f3f`.

- **Dữ liệu**: `DemoOperationsSeeder` (chạy riêng: `php artisan db:seed --class=DemoOperationsSeeder`) — ~60 ngày lịch hẹn → phiếu (lịch sử trạng thái hợp lệ) → báo giá → công việc + xuất kho → hoá đơn → thanh toán → đánh giá + nhật ký; mã có `-DM`; chạy lại không trùng. `NormalizeSampleDataSeeder` (chạy riêng) đổi dữ liệu faker en_US cũ (email `@example.*`, dòng xe Latin, biển số `?`) sang tiếng Việt, cập nhật tại chỗ. Factory Customer/Vehicle/Employee/Account dùng `Database\Factories\Support\VietnameseData`. DB dev đã chạy cả hai: 221 lịch, 176 phiếu, 164 hoá đơn, 85 đánh giá, 399 nhật ký.
- **Migration mới**: `reviews.is_hidden`, `inventory_transactions.created_by_account_id` (DB dev đã migrate).
- **API Admin (role ADMIN)**: `dashboard`, `reports?period=`, `repair-orders(/{id})`, `invoices(/{id})`, `payments`, `reviews` (+ reply, ẩn), `audit-logs`, `customers(/{id}, /lock)`, `staff` (tạo/sửa), `accounts` (tạo, khoá/mở, gửi OTP đặt lại mật khẩu — `App\Services\PasswordResetService`, AuthController dùng chung), `parts` (+ nhập/xuất), `stock-moves`, `holidays` (theo khoảng ngày). Danh sách lọc + phân trang ở server, kèm `summary`.
- **FE**: `services/adminApi.ts`, `kit/useAdminQuery.ts` (tải theo khoá, không setState đồng bộ trong effect), `kit/useDebounced.ts`. 10 trang + HolidaysPanel nối API, có loading/lỗi/rỗng; thẻ số liệu giả được thay bằng số thật; nút demo không có backend được đổi thành chức năng thật (Xuất CSV hoá đơn, In báo cáo) hoặc bỏ ("Đổi vai trò"). Test `test:admin-real-data`.
- **Kiểm thử**: backend 267/267; smoke 27/27; tsc + build đạt. Trình duyệt 32/32 (16 trang × sáng/tối, không nhãn demo, không lỗi console/API).
- **Còn lại**: doanh thu Báo cáo theo hoá đơn phát hành, Tổng quan theo tiền đã thu (hai khái niệm khác nhau, đã ghi chú trên nhãn). Trang Lịch hẹn/Dịch vụ/Gói/Giờ làm/Gara vốn dùng API thật từ trước. Đổi vai trò tài khoản chưa có API riêng (làm qua trang Nhân sự).

## Trước đó: giao diện Admin mới — bản demo theo mockup (09/11/2026, gộp vào v3 dạng 1 commit, không kéo lịch sử fix/apt cũ)

- **Sidebar mới** (`layouts/navigation.ts`): ĐIỀU HÀNH Tổng quan · Lịch hẹn · Phiếu sửa chữa · Hoá đơn & thanh toán · Báo cáo /
  CON NGƯỜI Khách hàng · Nhân sự · Tài khoản · Đánh giá / DANH MỤC Dịch vụ · Gói bảo dưỡng · Phụ tùng & kho · Hãng & dòng xe /
  HỆ THỐNG Giờ làm việc & ngày nghỉ · Thông tin gara · Nhật ký hệ thống. `/admin/parts` → `/admin/inventory`;
  `/admin/advisor-activity` → tab "Hoạt động cố vấn" trong `/admin/audit-logs`.
- **Bộ khung** `pages/admin/kit/` (AdminKit, Charts SVG, format, usePaged). `DataTable` thêm `rowClassName`, `data-ui="table"`.
- **Dữ liệu demo** `src/mocks/admin/{people,operations,catalog}.ts` — kiểu bám bảng DB; trang demo có nhãn "Dữ liệu demo".
- **Trang demo (chưa API)**: Tổng quan, Báo cáo, Khách hàng, Nhân sự, Tài khoản, Phiếu sửa chữa, Hoá đơn, Đánh giá,
  Phụ tùng & kho, Nhật ký thao tác, Ngày nghỉ lễ (`HolidaysPanel`).
- **Giữ API thật**: Lịch hẹn, Dịch vụ, Gói bảo dưỡng, Giờ làm việc, Thông tin gara, Hoạt động cố vấn, **Hãng & dòng xe** (`/admin/vehicle-brands` → trang `VehicleCatalog` của v3, API `/api/admin/vehicle-{brands,models,trims}`; bản demo `VehicleBrands.tsx` không dùng; `/admin/vehicle-catalog` chuyển hướng về đây).
- **Tiếp theo**: viết API admin cho các trang demo, thay import `mocks/admin` bằng service.

## Trước đó: Danh mục xe 3 cấp từ CSV (09/11/2026, nhánh v3)

Commit: `00a4279` schema · `60a0cc1` seeder CSV · `2f2c1f3` API công khai + admin · `ff8c932` lưu model/trim vào hồ sơ xe + đặt lịch · `3134ed2` trang Admin + bộ chọn · `714d3ad` sửa 2 lỗi UI phát hiện khi kiểm trình duyệt · `5c8c52e` tích hợp Xe của tôi + Đặt lịch.

- **Không tạo bảng trùng**: dùng lại `vehicle_brands`, `vehicle_models` (đã có, được `vehicles.model_id`, gói bảo dưỡng, phụ tùng dùng); thêm `vehicle_trims` + `vehicles.trim_id` (nullable, `variant` cũ giữ nguyên) + cột `source` (CSV/ADMIN/NULL = có sẵn) + unique (brand_id, name) cho dòng xe (chỉ thêm khi dữ liệu chưa trùng). DB dev đã migrate + seed: 44 hãng, 265 dòng, 471 phiên bản; 31 xe cũ nguyên vẹn.
- **Seeder** `VietnamVehicleCsvSeeder` đọc `backend/database/data/vietnam_vehicles.csv` (471 dòng, 0 trùng, 0 lỗi): chỉ THÊM, không sửa/xóa → giữ dữ liệu/trạng thái admin; so khớp không phân biệt hoa/thường; dùng lại hãng/dòng có sẵn. Đã gọi trong `DatabaseSeeder`.
- **API**: công khai `GET /api/vehicle-catalog/brands`, `/brands/{id}/models`, `/models/{id}/trims`, `/search?q=` (chỉ ACTIVE, throttle 120/phút). Admin `/api/admin/vehicle-{brands,models,trims}` (role ADMIN): danh sách có đếm, lọc, phân trang; tạo/sửa/ẩn; **xóa bị chặn (422)** khi còn cấp con hoặc đang dùng ở hồ sơ xe (kể cả xe xóa mềm → lịch hẹn), gói bảo dưỡng, phụ tùng tương thích. Không cho đổi cấp cha.
- **Hồ sơ xe + đặt lịch**: nhận `model_id` + `trim_id` (`App\Support\VehicleCatalogSelection`): phiên bản phải thuộc dòng xe; khách chỉ chọn mới bản ghi ACTIVE, giữ được lựa chọn cũ đã bị ẩn; nhân viên được chọn dòng đã ẩn (xe đời cũ). Đường gửi tên cũ (`brand`/`model`, `model_name`) vẫn chạy.
- **Frontend**: `components/vehicle/SearchableSelect` (combobox tìm không dấu, bàn phím, loading/empty/lỗi + thử lại) + `VehicleSelector` (đổi hãng reset dòng+phiên bản, đổi dòng reset phiên bản). Dùng ở "Xe của tôi" (thêm + sửa) và bước 1 "Đặt lịch" (bỏ `BRAND_MODELS` viết cứng, bỏ danh sách 8 dòng Toyota). Trang Admin nay ở `/admin/vehicle-brands` (menu Danh mục → Hãng & dòng xe). Dùng Icon có sẵn, không dùng Font Awesome (dự án đang gỡ dần — UX M7).
- **Kiểm thử**: backend 246/246; smoke 26/26 (mới `test:vehicle-catalog`; sửa 1 assertion cũ trong `ui-contrast-regression` vốn khóa danh sách Toyota); tsc + build đạt; ESLint file sửa sạch (Cars.tsx còn 1 lỗi cũ `set-state-in-effect`). Trình duyệt (Chrome headless, chỉ đọc, 0 request ghi): 65/65 — Xe của tôi + Đặt lịch sáng/tối, Đặt lịch 390px tối, Admin sáng/tối/390px. Frontend dự án chạy ở **cổng 5174** (5173 là project khác).
- **Còn lại / chờ PO**: (1) Dòng xe cũ và CSV khác tên nên tồn tại song song, ví dụ "Mazda 2"/"Mazda2", "5 Series"/"Series 5", "Seltos"/"New Seltos" — không tự gộp (cấm suy đoán); admin có thể ẩn bản không dùng. (2) Trang cố vấn "Xe khách hàng" vẫn nhập `model_id` dạng số — chưa gắn bộ chọn. (3) Bộ lọc hãng/dòng trong Admin tải tối đa 100 mục mỗi cấp. (4) Tìm kiếm LIKE trên MySQL không phân biệt dấu (gõ "cho" ra cả "chỗ") — có ích, chấp nhận.

## Trước đó: Admin bỏ navy + lime, dùng đỏ thương hiệu theo theme (09/11/2026)

PO đổi quyết định: khu Admin **không còn luôn tối**. `tokens.css` khối `[data-area="admin"]` chỉ đổi accent (= `--cs-brand`, chữ trắng, nút primary đỏ đặc, không gradient) và sidebar (`--cs-sidebar-bg: var(--cs-surface)`, mục đang chọn `--cs-sidebar-active-bg #cf2935` / chữ trắng, bo 10px); nền/chữ/viền/trạng thái/bo góc dùng token chung theo `html[data-theme]`. `workspace.css`: bỏ mục chọn lime, ô tìm kiếm lime, badge lime, thẻ navy/tím; thẻ lối tắt + hàng Tiện ích thành thẻ trung tính, icon đỏ trên nền soft. `shell.css`: gỡ phần nhân bản ánh xạ dark cho Admin (giờ chỉ áp khi theme tối). `buttons.css`: bỏ nút icon tròn riêng Admin. Nút Admin không dùng success (Mở khóa, Duyệt → secondary + check); xanh lá chỉ còn ở badge trạng thái thành công. Đã cập nhật `docs/ui-button-redesign.md` (§1, §2, §3 Admin, §4), `tests/button-redesign.mjs`, `tests/workspace-theme-smoke.mjs` (kiểm tra sidebar Admin nền surface, mục chọn đỏ, không còn mã navy/lime). `grep -i "c8f53c|080c1a|0b1022|141a2e|lime|navy" frontend/src` → không còn. 24/24 `test:*`, tsc, build đạt; ESLint giữ nguyên nợ cũ (22 + 2). Trình duyệt: `/admin/maintenance-packages` và `/admin` ở theme sáng (sidebar trắng) và tối (sidebar `#191b1e`), mục chọn đỏ đặc chữ trắng, nút primary đỏ, không tràn ngang, không lỗi console, 0 request ghi.

## Trước đó: hệ thống nút theo vai trò (09/11/2026)

Commit: `afdc38c` token + biến thể · `cf7abcd` component dùng chung · `8ad4551` Advisor · `1c752e2` Admin + dashboard · `933a942` Customer · `ae76c54` buttonClass còn lại + Admin luôn tối + test.

- **Token** (`styles/tokens.css`): mỗi vai trò có `--cs-soft-hover`, `--cs-on-soft`, `--cs-btn-radius`, `--cs-card-radius`, `--cs-accent-fill`; Admin **luôn tối** (navy `#0b1022`, lime `#c8f53c`, nút chính gradient lime chữ navy, bo viên thuốc 999px, card 24px, success kiểu tonal xanh).
- **Nút** (`buttons.css`, `buttonClass.ts`, `Button.tsx`): thêm `tonal`; `tone="danger"` cho nút icon Xóa chữ đỏ; disabled dùng token (không còn chỉ mờ); loading opacity .8; giữ alias `.cs-unified-*`. Icon mới: arrow-right/left, x, send, cash, printer, download, lock, key, grid.
- **Dùng chung**: ConfirmDialog nút danger luôn có icon (trash cho xóa, X cho hủy/đóng/từ chối; `confirmIcon` tùy chọn); Pagination outline, trang hiện tại tonal; Admin: sidebar mục chọn lime, ô tìm kiếm viên thuốc viền lime, badge `ACTIVE` lime (`data-status` trên StatusBadge), card 24px.
- **Trang**: ánh xạ theo §3 đặc tả (Customer: đặt lịch, báo giá, VNPay, xe, lịch hẹn, đánh giá, liên hệ; Advisor: phiếu sửa chữa các bước, tiếp nhận, lịch hẹn, khách/xe; Admin: tài khoản, dịch vụ, gói, kho, giờ làm việc, lịch hẹn, khách). Dashboard Admin: lưới 4 thẻ lối tắt 2 cột (navy/tím) + hàng "Tiện ích" 4 nút tròn 60px (route có sẵn).
- **Thay đổi hiển thị có chủ ý** (không đổi API/logic gọi): "Bàn giao xe cho khách" hiện ngay khi phiếu COMPLETED nhưng **khóa** tới khi hóa đơn PAID; nút cuối luồng đặt lịch đổi chữ "Đặt lịch" → "Xác nhận đặt lịch"; "Xác nhận duyệt báo giá" → "Đồng ý báo giá".
- **Chưa làm theo đặc tả**: "Đóng phiếu" chưa chuyển vào Dropdown "Thao tác khác" (hiện là danger-outline + X cạnh thông báo khách từ chối, vẫn qua ConfirmDialog) — cần chuyển state `closeDeclined` lên trang chi tiết. Còn 83 `<button>` tự viết trong `pages/**` (chủ yếu tab, chip, thẻ chọn dịch vụ/khung giờ, trang auth, Dashboard khách); các nút hành động đã dùng `Button`/`IconButton`/`buttonClass()`. Nhiều class màu hex cũ trong trang vẫn còn (được ánh xạ sang token qua `shell.css`); chưa gỡ hết.
- **Test**: thêm `tests/button-redesign.mjs` (`npm run test:buttons`); sửa `workspace-theme-smoke.mjs` (sidebar Admin `#080c1a` thay màu cũ). 24/24 script `test:*` đạt, `tsc -b` + build đạt; ESLint giữ nguyên nợ cũ (22 `set-state-in-effect` + 2 `exhaustive-deps`), không lỗi mới.
- **Trình duyệt** (CDP, chỉ đọc, 0 request ghi): Customer `/customer/cars`, `/quotation`, `/customer/appointments`, `/customer/booking`; Advisor `/advisor`, `/advisor/appointments`, `/advisor/customer-cars`; Admin `/admin`, `/admin/accounts`, `/admin/services` — màu/bo góc đúng đặc tả, không tràn ngang, không lỗi console. Đã phát hiện và sửa: trang Admin cũ còn thẻ trắng do ánh xạ màu sáng chỉ áp ở dark theme → mở rộng cho khu Admin. BROWSER_NOT_VERIFIED: các panel phiếu sửa chữa (Bước 2–5), modal báo giá khách, trang thanh toán (cần dữ liệu phù hợp).

## Nhánh làm việc: `v3` (09/11/2026)

PO chuyển sang làm trên `v3`. Lịch sử `v3` đã viết lại (bỏ 25 commit tác giả Claude ngày 02/11, code giữ nguyên) và force push; `origin/v3` = `f83c641` (xóa `backend/.claude`, `backend/CLAUDE.md`). Hash commit liệt kê bên dưới là hash cũ trên `fix/apt`, trên `v3` đã đổi. Không ghi `Co-Authored-By`/link claude.ai vào commit hay file. Backup cục bộ: nhánh `v3-backup-truoc-xoa-claude` (chưa push).

## Commit (fix/apt, hash cũ)

P1: `a67819e` `b533524` `26389df` `7452c1a` · P2: `b9e40cb` `6fe0f37` `9f51b4c` · QA-01: `b237658` · P3: `2d64bd2` `0967552` `8fb42fa` · P4: `1b37879` `2468b81` · P5: `47eef0d` `09a3a0c` `da44e68` · P6: `31f7214` `bf5f429` · P7: `d734ffa` `2f58501` · docs: `51beadc`.

DB dev local đã migrate tới `2026_11_08_160000` (D-016).

## Kiểm thử gần nhất

Backend **211/211** · smoke **21/21** · tsc + build đạt · ESLint không tăng so với trước (nợ cũ 22 lỗi `set-state-in-effect` vẫn còn — UX-06).
Trình duyệt: hồi quy chỉ đọc đạt ở mỗi phase; nhiều panel mới BROWSER_NOT_VERIFIED (dữ liệu dev không có phiếu phù hợp; tránh tạo dữ liệu giả / gửi email thật). Admin không đăng nhập được bằng script (không có mật khẩu admin demo).

## Quyết định kỹ thuật chờ PO (không chặn)

T-002 không giảm giá phát sinh · T-003 dịch vụ nhanh chỉ gồm dịch vụ niêm yết · T-004 lịch không rõ thời lượng = 60 phút.

## Còn lại

1. **UX-01..09** (`FINAL_UI_UX_AUDIT_AFTER_PHASE5.md` §5): H4 nút trong bảng/form cũ → `Button`; M3 gộp Toast → `notify()`; M6 lưới mobile + vùng bấm; M2 `PageHeader` trang khách; M7 gỡ Font Awesome/emoji; 22 lỗi ESLint `set-state-in-effect`; tách bundle theo route; L6–L8; đo lại tương phản dark. Làm từng mục một, mỗi mục một commit; không đổi nghiệp vụ.
2. **P3-FE-H**: giao diện lịch sử duyệt từng dòng (dữ liệu đã có).
3. **FINAL-01**: chạy toàn bộ test, security review nhanh (route mới: quyền, throttle, rò rỉ dữ liệu khách), kiểm trình duyệt có thể, rồi tạo `FINAL_IMPLEMENTATION_REPORT.md` (danh sách chức năng + commit, migration/API mới, test, lỗi còn lại, quyết định chờ duyệt, bảo mật, trình duyệt, mức sẵn sàng demo).

Gợi ý thứ tự: FINAL-01 trước (để PO có báo cáo tổng sớm), rồi UX theo mức ảnh hưởng demo.
