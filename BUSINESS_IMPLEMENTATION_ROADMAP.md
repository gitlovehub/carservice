# BUSINESS IMPLEMENTATION ROADMAP – CarService WD_004

Kế hoạch triển khai các thay đổi nghiệp vụ, dựa trên `BUSINESS_REQUIREMENTS_AUDIT.md` (hiện trạng) và `BUSINESS_PROCESS_DESIGN.md` (thiết kế).
**Chưa triển khai gì.** Mọi phase chờ phê duyệt.

---

## 0. Điều kiện trước khi bắt đầu

1. **Commit Phase 5 UI/UX** (81 file chưa commit) thành một commit riêng, để thay đổi nghiệp vụ không lẫn với thay đổi giao diện.
2. **Chốt 7 câu hỏi Q1–Q7** trong BUSINESS_PROCESS_DESIGN §6. Quan trọng nhất là Q1 (kênh OTP), Q2 (kỹ thuật viên), Q3 (lưu ảnh).
3. **Môi trường test**: backend dùng SQLite `:memory:` (143 test đạt), frontend có 13 smoke test. Mỗi phase **thêm test feature** cho luồng mới; không chạy thử ghi dữ liệu trên DB thật.
4. **Quy ước migration**: chỉ thêm bảng hoặc thêm cột nullable / có mặc định. Không đổi tên, không xóa cột, không đổi mã trạng thái hiện có.

## Tổng quan và thứ tự

| Phase | Nội dung | Ưu tiên | Phụ thuộc | Ước lượng |
|---|---|---|---|---|
| **P0** | Sửa lỗi an toàn: hóa đơn gộp mọi báo giá; gỡ "xác nhận thay khách" | **Rất cao** | — | 0,5–1 ngày |
| **P1** | Hạ tầng bằng chứng: ảnh + xác nhận của khách (OTP / tài khoản) | **Rất cao** | P0 | 2–3 ngày |
| **P2** | Check-in có biên bản + đổi xe + khách vãng lai | **Rất cao** | P1 | 3–4 ngày |
| **P3** | Báo giá: khách xem chẩn đoán, lịch sử phê duyệt, **phát sinh** | **Cao** | P1 | 2–3 ngày |
| **P4** | Check-out hai chiều + ủy quyền nhận xe | **Cao** | P1, P2 | 2–3 ngày |
| **P5** | Dịch vụ: mức độ, quy trình, thời gian chuẩn; luồng dịch vụ nhanh | Trung bình | P2, P3 | 3 ngày |
| **P6** | Phụ tùng chờ: yêu cầu đặt hàng, ETA, thông báo | Trung bình | P3 | 2 ngày |
| **P7** | Công suất: tải theo phút, cảnh báo, gợi ý khung giờ | Thấp–trung bình | P5 | 2–3 ngày |

P0–P4 trả lời trực tiếp các yêu cầu giảng viên nhấn mạnh nhất (B, C, D, G, H). Nếu thời gian hạn chế, **dừng sau P4** vẫn đạt phần cốt lõi.

---

## P0 – Sửa lỗi an toàn (không cần bảng mới)

**Mục tiêu:** loại bỏ 2 rủi ro đang có trong code trước khi mở rộng.

| | Nội dung |
|---|---|
| Backend | ~~Gộp dòng đã duyệt của mọi báo giá~~ → **Hủy sau khi đối chiếu code**: phiên bản là bản *thay thế*, gộp sẽ tính tiền hai lần. Thay bằng test khóa hành vi; việc gộp chuyển sang **P3** (chỉ gộp `INITIAL` + `SUPPLEMENT`) |
| API | Gỡ route Advisor `POST /quotations/{id}/respond` (policy đã chặn, nên route này không có tác dụng) |
| Frontend | `RepairOrderPanels.tsx`: gỡ nút "Ghi nhận phản hồi tại quầy"; thay bằng thông báo "Chờ khách duyệt trong tài khoản" (P1 sẽ thêm OTP) |
| Database | Không |
| Ảnh hưởng | `RepairFlowTest`; `CustomerRepairOrderControllerTest`; smoke test `advisor-technician-workflow` (có thể kiểm tra chuỗi trong `RepairOrderPanels`) |

**Kiểm thử**
- Có 2 báo giá (v1 duyệt một phần, v2 duyệt thêm): hóa đơn gồm dòng duyệt của **cả hai**.
- Advisor gọi `respond`: 404 (route gỡ) hoặc 403.
- Toàn bộ 143 test cũ vẫn đạt.

**Nghiệm thu:** hóa đơn khớp tổng các dòng khách đã duyệt; không còn đường nào để nhân viên duyệt thay khách.

---

## P1 – Hạ tầng bằng chứng và xác nhận

**Mục tiêu:** có nơi lưu ảnh, và có cơ chế để khách (chỉ khách) xác nhận một nội dung đã khóa.

| | Nội dung |
|---|---|
| Database | `media_attachments`, `customer_confirmations`, `confirmation_otps` |
| Backend | `MediaService` (lưu vào `storage/app/private`, tính SHA-256, kiểm loại/kích thước); `ConfirmationService` (tạo snapshot + băm, gửi OTP email theo mẫu `PasswordResetOtp`, xác thực OTP: hết hạn 10 phút, tối đa 5 lần sai, throttle); policy theo chủ phiếu |
| API | `POST /media` (Advisor; multipart; gắn với đối tượng); `GET /media/{id}` (kiểm quyền: nhân viên hoặc chủ phiếu); `POST /confirmations/{type}/{id}/otp` (Advisor yêu cầu gửi OTP); `POST /confirmations/{type}/{id}/verify-otp` (tại quầy); `POST /me/confirmations/{type}/{id}` (khách xác nhận bằng tài khoản) |
| Frontend | Component dùng chung: `PhotoUploader` (camera / tệp, xem trước), `ConfirmationPanel` (hiện trạng thái xác nhận, nút gửi OTP, ô nhập OTP), `SignaturePad` (dự phòng N11). Đặt trong `components/ui` theo ARCHITECTURE.md |
| Mail | `ConfirmationOtpMail` (tiếng Việt, ghi rõ đang xác nhận cái gì) |

**Kiểm thử**
- Upload sai định dạng hoặc quá dung lượng: 422.
- Khách khác xem ảnh: 403.
- OTP sai 5 lần thì khóa; OTP hết hạn; OTP dùng lại bị từ chối.
- Nội dung đổi sau khi gửi OTP thì xác nhận thất bại (hash khác).
- Advisor **không thể** gọi API xác nhận bằng tài khoản.

**Nghiệm thu:** mọi xác nhận lưu đủ phương thức, hash nội dung, thời điểm, IP, người chứng kiến; không có đường nào để nhân viên tạo xác nhận khi không có OTP hợp lệ hoặc không có thao tác của khách.

**Rủi ro:** email chậm hoặc bị lọc thư rác → có phương án ký tay (N11). Dung lượng lưu trữ → giới hạn số ảnh và nén ảnh phía client.

---

## P2 – Check-in có biên bản, đổi xe, khách vãng lai

**Mục tiêu:** đáp ứng B, G, H (chiều giao xe vào), F1.

| | Nội dung |
|---|---|
| Database | `vehicle_handovers`, `handover_checklist_items`; `repair_orders` + `booked_vehicle_id`, `vehicle_change_reason`, `source` |
| Backend | `RepairOrderService::receive`: cho phép `vehicle_id` khác lịch hẹn khi xe thuộc cùng khách + bắt buộc lý do + ghi `audit_logs`; hỗ trợ `source = WALK_IN`. `HandoverService`: tạo / sửa biên bản (chỉ ở DRAFT), gửi xác nhận, khóa khi CONFIRMED, hủy (`VOID`) kèm lý do. Quy định: phiếu chỉ sang INSPECTING khi CHECK_IN đã CONFIRMED |
| API | `POST /repair-orders/{id}/handovers` (CHECK_IN); `PATCH /handovers/{id}`; `POST /handovers/{id}/submit`; `GET /me/repair-orders/{id}/handovers` (khách) |
| Frontend Advisor | `ReceptionWorkflow.tsx`: bộ chọn xe (đổi xe + lý do); nút "Tiếp nhận khách vãng lai"; trang biên bản CHECK_IN (checklist theo vị trí, ảnh, tài sản, chìa khóa, người giao, km, nhiên liệu) + `ConfirmationPanel` |
| Frontend Customer | Trang xác nhận tình trạng xe (từ thông báo / "Tiến độ xe") |
| Ảnh hưởng | `ReceiveVehicleFlowTest`, `RepairFlowTest` (thêm bước biên bản trong fixture); `AdvisorAppointmentOverrideTest` |

**Kiểm thử**
- Đổi sang xe của khách khác: 422.
- Đổi xe không có lý do: 422.
- Đổi xe hợp lệ: `audit_logs` có old/new.
- Sửa biên bản đã CONFIRMED: 403/409.
- Chưa xác nhận CHECK_IN mà chuyển sang chẩn đoán: bị chặn.
- Phiếu vãng lai không có `appointment_id` vẫn đi hết luồng.

**Nghiệm thu:** với mỗi phiếu xem được ai giao xe, ai nhận, lúc nào, km, tình trạng theo vị trí, ảnh, tài sản, và xác nhận của khách (phương thức + thời điểm).

---

## P3 – Chẩn đoán minh bạch, lịch sử phê duyệt, phát sinh

**Mục tiêu:** đáp ứng C (đầy đủ), D4, D5.

| | Nội dung |
|---|---|
| Database | `quotation_item_responses`; `quotations` + `type`, `parent_quotation_id`, `reason`; `quotation_items` + `labor_amount`, `estimated_minutes` |
| Backend | **Chuyển từ P0:** `generateInvoice`, `recordUsedPart`, `startRepair` lấy dòng đã duyệt của báo giá `INITIAL` mới nhất **cộng** mọi báo giá `SUPPLEMENT` (không gộp các bản báo giá lại). `createQuotation`: cho phép `SUPPLEMENT` khi phiếu `IN_PROGRESS` / `WAITING_FOR_PARTS` (bắt buộc `reason`; ảnh tùy chọn); `recordCustomerResponse`: ghi `quotation_item_responses` + liên kết `customer_confirmations`; dòng SUPPLEMENT được duyệt thì tạo `work_items`. `CustomerRepairOrderController::show`: thêm `inspections.items`, `recommendations`, ảnh chẩn đoán |
| API | Giữ `POST /me/quotations/{id}/respond`; thêm `POST /quotations/{id}/verify-otp-response` (khách duyệt tại quầy bằng OTP) |
| Frontend | Customer: khối "Kết quả chẩn đoán"; nhãn "Phát sinh" + lý do + ảnh. Advisor: nút "Lập báo giá phát sinh" khi đang sửa; cột tồn kho; lịch sử phê duyệt từng dòng |
| Ảnh hưởng | Quy tắc "phụ tùng phải có trong đề xuất chẩn đoán": với phát sinh, cho phép thêm đề xuất mới kèm ảnh (`addInspectionRecommendation` đã có) |

**Kiểm thử**
- Phát sinh khi IN_PROGRESS → khách từ chối → không có `work_item`, không xuất kho, không vào hóa đơn.
- Phát sinh duyệt → có `work_item` và vào hóa đơn.
- Lịch sử hiển thị đủ các lần duyệt / từ chối.
- Khách thấy chẩn đoán nhưng không thấy ghi chú nội bộ.

**Nghiệm thu:** mọi đồng tiền trên hóa đơn truy được về một dòng báo giá có xác nhận của khách.

---

## P4 – Check-out hai chiều và ủy quyền nhận xe

**Mục tiêu:** đáp ứng H2–H4 và N9, N12.

| | Nội dung |
|---|---|
| Database | `pickup_authorizations`; dùng `vehicle_handovers` (type `CHECK_OUT`, `compared_handover_id`) |
| Backend | `handOver`: bắt buộc CHECK_OUT CONFIRMED + người nhận là chủ xe (xác nhận tài khoản / OTP email chủ xe) **hoặc** người có `pickup_authorizations` ACTIVE (đối chiếu 4 số cuối giấy tờ + OTP gửi chủ xe). `closeRepairOrder` cũng cần CHECK_OUT (trả xe khi không sửa) |
| API | `POST /me/repair-orders/{id}/pickup-authorizations`, `DELETE …/{auth}`; `POST /repair-orders/{id}/handovers` (CHECK_OUT) |
| Frontend | Advisor: màn check-out so sánh ảnh / checklist CHECK_IN và CHECK_OUT song song, chọn người nhận, OTP, đánh dấu khác biệt. Customer: ủy quyền nhận xe; xác nhận nhận xe; tải biên bản |
| Ảnh hưởng | `RepairFlowTest` (bước bàn giao), giao diện `RepairOrderPanels` (bước 5) |

**Kiểm thử**
- Bàn giao không có CHECK_OUT: chặn.
- Người nhận không có ủy quyền: chặn.
- Ủy quyền đã thu hồi hoặc hết hạn: chặn.
- OTP sai: chặn.
- Khác biệt tình trạng được ghi lại và khách có thể thêm ý kiến.
- Đóng phiếu do từ chối báo giá vẫn phải có CHECK_OUT.

**Nghiệm thu:** mỗi lần xe rời gara có biên bản đối chiếu với lần nhận, biết chính xác ai nhận, có xác nhận không thể giả mạo bởi nhân viên.

---

## P5 – Quy trình và thời gian dịch vụ; luồng dịch vụ nhanh

| | Nội dung |
|---|---|
| Database | `service_steps`; `services` + `service_level`, `requires_vehicle_stay`; `work_items` + `standard_minutes`, `service_step_id`; `repair_orders` + `flow_type`, `estimated_ready_at` |
| Backend | Khi tạo `work_items`, sinh theo bước của dịch vụ; tính `estimated_ready_at` = thời điểm bắt đầu + Σ phút chuẩn (+ thời gian chờ phụ tùng). Luồng QUICK: báo giá tự sinh từ dịch vụ niêm yết, bỏ bước chẩn đoán (máy trạng thái thêm nhánh `RECEIVED → WAITING_APPROVAL` **chỉ** với `flow_type = QUICK`) |
| Frontend | Admin: quản lý bước + phút chuẩn trong trang Dịch vụ. Advisor: tiến độ theo bước. Customer: giờ dự kiến xong |

**Kiểm thử:** nhánh rút gọn chỉ mở với QUICK; QUICK vẫn bắt buộc khách xác nhận giá và có check-in / check-out rút gọn.

**Nghiệm thu:** thay dầu đi hết luồng trong khoảng 5 thao tác; sửa lớn giữ đủ các bước.

---

## P6 – Phụ tùng chờ và ETA

| | Nội dung |
|---|---|
| Database | `part_requests` |
| Backend | Kiểm tồn kho khi lập báo giá; tạo `part_requests` khi dòng PART được duyệt mà thiếu hàng; mở chuyển trạng thái `WAITING_APPROVAL → WAITING_FOR_PARTS`; nhận hàng thì tạo `inventory_transactions` IN; ghi `notifications` |
| Frontend | Advisor: danh sách chờ phụ tùng (lọc theo quá ETA). Customer: phụ tùng đang chờ + ETA. Admin: xem yêu cầu đặt hàng |

**Kiểm thử:** thiếu hàng tự tạo yêu cầu; hàng về thì tồn kho tăng đúng; khách thấy ETA; không thể sang IN_PROGRESS khi còn yêu cầu chưa RECEIVED (trừ khi cố vấn ghi lý do).

---

## P7 – Công suất gara

| | Nội dung |
|---|---|
| Database | `working_hours` + `daily_capacity_minutes`, `bay_count` |
| Backend | Tính tải ngày = Σ `estimated_minutes` của lịch CONFIRMED + phút còn lại của phiếu đang mở; API `GET /advisor/capacity?date=` và gợi ý khung giờ còn năng lực. Giữ `max_slots` hiện có (tương thích) |
| Frontend | Màn xác nhận lịch: cảnh báo khi vượt năng lực; gợi ý ngày khác. Admin: biểu đồ tải theo ngày |

**Kiểm thử:** 12 xe thay dầu vs 3 xe sửa động cơ cho kết quả tải khác nhau; quá tải chỉ cảnh báo, không tự xác nhận.

---

## Rủi ro chung

| Rủi ro | Giảm thiểu |
|---|---|
| Thêm bước làm chậm quầy tiếp nhận | Luồng QUICK; checklist mặc định "OK", chỉ ghi phần khác; chụp ảnh nhiều tấm một lần |
| Khách không dùng email / không có tài khoản | Ký tay trên màn hình + nhân viên chứng kiến (N11); tạo tài khoản khách tại quầy |
| Hồi quy luồng đang chạy | Chỉ thêm cột nullable; giữ mã trạng thái; mỗi phase chạy lại 143 test backend + 13 smoke test frontend + kiểm trình duyệt |
| Dung lượng ảnh | Nén phía client (≤ 1600 px), giới hạn số ảnh / biên bản |
| Dữ liệu cũ không có biên bản | Phiếu tạo trước khi triển khai được miễn (cờ theo ngày tạo), không bắt bổ sung ngược |

## Tiêu chí nghiệm thu tổng thể (sau P4)

- [ ] Không thể bàn giao xe mà không xác định và xác thực người nhận.
- [ ] Mỗi phiếu có biên bản CHECK_IN và CHECK_OUT với ảnh, đối chiếu được.
- [ ] Mọi dòng trên hóa đơn gắn với một xác nhận của khách.
- [ ] Không có API nào cho nhân viên đánh dấu "khách đồng ý".
- [ ] Đổi xe khi tiếp nhận được phép và được ghi vết.
- [ ] Phát sinh có luồng riêng, khách duyệt từng dòng.
- [ ] 143 test cũ đạt + test mới cho từng luồng; giao diện Phase 5 không hồi quy.
