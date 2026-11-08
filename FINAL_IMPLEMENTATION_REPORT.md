# FINAL IMPLEMENTATION REPORT – CarService WD_004

- **Nhánh:** `fix/apt` (chưa push). **Ngày:** 08/11/2026.
- **Phạm vi:** roadmap nghiệp vụ P0–P7 (`BUSINESS_IMPLEMENTATION_ROADMAP.md`).
- **Kết quả:** backend **211/211** test (1229 assertion) · frontend smoke **21/21** · `tsc -b` + `vite build` đạt · ESLint không tăng so với trước (vẫn còn 22 lỗi `set-state-in-effect` có từ trước — nợ Phase 5).

## 1. Chức năng và commit

| Phase | Chức năng | Commit |
|---|---|---|
| Phase 5 | UI/UX refinement | `2bec3e0` |
| P0 | Chỉ khách được duyệt báo giá; gỡ đường "nhân viên duyệt thay"; khóa logic báo giá lại không tính trùng tiền | `ea1b85e` |
| P1 | Ảnh bằng chứng lưu private + phân quyền; xác nhận của khách (tài khoản / OTP email chủ xe tại quầy) gắn hash nội dung | `a67819e` `b533524` `26389df` `7452c1a` |
| P2 | Biên bản nhận xe (CHECK_IN) có ảnh, khách xác nhận trước khi kiểm tra; đổi xe so với lịch hẹn (cùng chủ + lý do + audit); khách vãng lai | `b9e40cb` `6fe0f37` `9f51b4c` |
| P3 | Lịch sử duyệt từng dòng; báo giá phát sinh khi đang sửa (cộng thêm, không thay thế báo giá gốc); khách xem chẩn đoán | `2d64bd2` `0967552` `8fb42fa` `4ab8de1` |
| P4 | Biên bản trả xe (CHECK_OUT) đối chiếu với lúc nhận; ủy quyền nhận xe do chủ xe khai báo; bàn giao / đóng phiếu bắt buộc CHECK_OUT | `1b37879` `2468b81` |
| P5 | Bước chuẩn + phút chuẩn dịch vụ; giờ dự kiến xong; luồng dịch vụ nhanh (bỏ chẩn đoán, bắt buộc 4 ảnh tổng quan, khách vẫn duyệt giá) | `47eef0d` `09a3a0c` `da44e68` |
| P6 | Phụ tùng chờ: tự tạo khi thiếu hàng, ETA, nhập kho khi về, báo khách | `31f7214` `bf5f429` |
| P7 | Công suất gara theo phút/ngày (chỉ cảnh báo), gợi ý ngày còn chỗ, bảng tải 7 ngày | `d734ffa` `2f58501` |
| QA | Sửa test chập chờn (trùng tên hãng xe) | `b237658` |

## 2. Migration (chỉ thêm, không xóa / đổi tên)

`2026_11_08_100000` media_attachments · `100100` confirmation_otps · `100200` customer_confirmations · `110000` vehicle_handovers + handover_checklist_items · `110100` repair_orders (+booked_vehicle_id, vehicle_change_reason, source, requires_check_in) · `120000` quotations (+type, parent_quotation_id, reason) + quotation_item_responses · `130000` pickup_authorizations · `140000` service_steps; services (+service_level, requires_vehicle_stay); work_items (+standard_minutes, service_step_id); repair_orders (+flow_type, estimated_ready_at) · `150000` part_requests · `160000` working_hours (+daily_capacity_minutes, bay_count).

Phiếu cũ: `requires_check_in = false` → **không** bị bắt buộc biên bản ngược. DB dev local đã migrate đủ.

## 3. API thay đổi

- **Gỡ:** `POST /quotations/{id}/respond` (nhân viên) — P0.
- **Mới (cố vấn):** `POST /media`; `POST /quotations/{id}/otp`, `/verify-otp`; `GET|POST /repair-orders/{id}/handovers`, `PATCH /handovers/{id}`, `POST /handovers/{id}/submit|void|otp|verify-otp`; `POST /repair-orders/{id}/quick-quotation`; `POST /repair-orders/{id}/quotations` thêm `type=SUPPLEMENT` + `reason`; `POST /repair-orders` thêm `vehicle_change_reason`.
- **Mới (cố vấn + admin):** `GET /part-requests`, `POST /part-requests/{id}/order|receive|cancel`; `GET /advisor/capacity`, `/advisor/capacity/range`.
- **Mới (admin):** `GET|PUT /admin/services/{id}/steps`; `service_level` trên dịch vụ; `daily_capacity_minutes`, `bay_count` trên giờ làm việc.
- **Mới (khách):** `GET /me/repair-orders/{id}/handovers`, `POST /me/handovers/{id}/confirm`; `GET|POST /me/repair-orders/{id}/pickup-authorizations`, `DELETE /me/pickup-authorizations/{id}`.
- **Mọi người đã đăng nhập (kiểm quyền theo phiếu):** `GET /media`, `GET /media/{id}`.
- `GET /repair-orders/{id}` và `GET /me/repair-orders/{id}` trả thêm handovers, chẩn đoán (khách: chỉ cột công khai), phụ tùng chờ, giờ dự kiến.

## 4. Bảo mật (rà soát)

- Mọi route mới: `auth:sanctum` + vai trò; OTP gửi/nhập, xác nhận, upload có throttle. Test 401/403/404 cho từng nhóm.
- Không có đường nào để nhân viên tạo xác nhận thay khách: chỉ ACCOUNT (khách tự bấm) hoặc EMAIL_OTP (mã gửi email chủ xe, gắn hash nội dung; đổi nội dung → mã vô hiệu; 10 phút, 5 lần sai, dùng 1 lần).
- `customer_confirmations` chỉ thêm (chặn sửa/xóa ở model). OTP lưu hash. Ảnh lưu `storage/app/private`, kiểm MIME thật, tải qua API có kiểm quyền, `nosniff`.
- Khách không thấy bản nháp biên bản, ghi chú nội bộ chẩn đoán, ghi chú nhà cung cấp. Thông tin người nhận xe ủy quyền lấy từ khai báo của chủ xe, không nhập tay.

## 5. Kiểm tra trình duyệt

Đã kiểm (chỉ đọc, sáng/tối): trang Chi tiết phiếu (P0), panel duyệt tại quầy + ảnh chẩn đoán (P1), khối chẩn đoán phía khách (P3), trang Tiếp nhận + bảng tải (P7); 0 lỗi console, 0 request ghi.
**Chưa kiểm trên trình duyệt (BROWSER_NOT_VERIFIED):** thao tác thật với biên bản nhận/trả xe, báo giá phát sinh, dịch vụ nhanh, phụ tùng chờ, ủy quyền, trang Admin (dịch vụ/giờ làm việc). Lý do: cần tạo dữ liệu / gửi email thật. Các luồng này có test backend.

## 6. Quyết định kỹ thuật chờ PO xác nhận (không chặn)

- **T-002** Báo giá phát sinh không cho giảm giá.
- **T-003** Báo giá dịch vụ nhanh chỉ gồm dịch vụ niêm yết (không kèm phụ tùng).
- **T-004** Lịch hẹn không rõ thời lượng tính 60 phút khi ước tải.

## 7. Còn lại (chưa làm)

- UI/UX tồn đọng sau Phase 5 (UX-01..09: nút trong bảng/form cũ, gộp Toast, icon, 22 lỗi ESLint cũ, tách bundle…). Không làm ngay trước demo để tránh hồi quy giao diện.
- Push / merge / deploy: chưa được phép.

## 8. Hướng dẫn demo luồng mới (DB dev local)

Chuẩn bị: Laragon (backend `127.0.0.1:8000`) + `cd frontend; npm run dev`. Hai cửa sổ trình duyệt: **cố vấn** và **khách** (tài khoản khách sở hữu xe). Email OTP gửi theo cấu hình mail local.

1. **Tiếp nhận** (cố vấn): xác nhận lịch → xe đến → lập phiếu (có thể chọn xe khác của cùng khách + lý do). Nếu Admin đã nhập năng lực ngày, hộp xác nhận cảnh báo quá tải.
2. **Biên bản nhận xe** (trang phiếu): điền km, nhiên liệu, checklist; chọn vị trí rồi chụp ảnh (đủ 4 góc nếu dùng dịch vụ nhanh) → "Gửi khách xác nhận".
3. **Khách** (mục "Tiến độ xe"): xem biên bản → "Xác nhận đúng tình trạng" (hoặc cố vấn gửi mã email tại quầy). Chưa xác nhận thì không giao KTV / ghi chẩn đoán được.
4. **Dịch vụ nhanh** (nếu dịch vụ có mức "Nhanh"): chọn dịch vụ → gửi báo giá niêm yết. **Hoặc** luồng thường: chẩn đoán → báo giá.
5. **Khách duyệt báo giá** trong tài khoản (hoặc tại quầy bằng mã email). Cố vấn xem "Lịch sử khách duyệt".
6. **Đang sửa:** công việc theo bước + giờ dự kiến xong; thiếu phụ tùng → "Phụ tùng chờ đặt hàng" (đặt hàng/ETA → Đã về); phát sinh → "Báo giá phát sinh" (khách duyệt từng dòng).
7. **Hoàn thành → hóa đơn → thanh toán.**
8. **Khách** có thể khai báo "Ủy quyền nhận xe". **Biên bản trả xe** (cố vấn): người nhận là chủ xe hoặc người được ủy quyền (đối chiếu 4 số cuối giấy tờ) → chủ xe xác nhận → **Bàn giao xe**.

Lưu ý demo: phiếu tạo trước hôm nay không có các bước biên bản (không bắt bổ sung ngược) — dùng phiếu **mới** để thấy luồng đầy đủ.
