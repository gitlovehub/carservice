# BUSINESS REQUIREMENTS AUDIT – CarService WD_004

- **Mục đích:** đối chiếu từng góp ý của giảng viên với hệ thống **thực tế**: mã nguồn, migration, model, controller, service, policy, route, test.
- **Nhánh:** `fix/apt` @ `d864927` + 81 file Phase 5 chưa commit. Tài liệu này **không** sửa file nào.
- **Ngày:** 08/11/2026.

## 0. Phương pháp và ký hiệu

| Ký hiệu | Nghĩa |
|---|---|
| ✅ **ĐÃ CÓ** | Có trong mã nguồn, có điều kiện nghiệp vụ, và được test backend bao phủ (143/143 test đạt) hoặc đã kiểm trên trình duyệt |
| 🟡 **MỘT PHẦN** | Có nền tảng nhưng thiếu điều kiện, dữ liệu hoặc giao diện để đáp ứng yêu cầu |
| ❌ **CHƯA CÓ** | Không có bảng, API hay giao diện tương ứng |
| ❔ **CHƯA KIỂM CHỨNG** | Có mã nhưng chưa chạy thực tế được, hoặc kết quả mâu thuẫn giữa các lớp |

Nguồn đã đọc:
- **Backend:** 51 migration; 33 model; 23 controller; `app/Services/RepairOrderService.php`; 7 policy; `routes/api.php`; `backend/tests` (143 test, 605 assertion, SQLite `:memory:`).
- **Frontend:** `pages/customer/Booking.tsx`, `pages/advisor/ReceptionWorkflow.tsx`, `RepairOrderPanels.tsx`, `services/workflowService.ts`, `services/customerApi.ts`.

---

## PHẦN 1. Ý ĐỒ CỦA GIẢNG VIÊN

Giảng viên muốn CarService chuyển từ **"website đặt lịch + quản lý phiếu"** thành **hệ thống vận hành gara có chứng cứ**:

1. **Tách bạch** đặt lịch (giữ khung giờ), tiếp nhận (giao xe), chẩn đoán (kết luận kỹ thuật), báo giá (đề nghị), phê duyệt (quyết định của khách), sửa chữa (chỉ làm phần đã duyệt), trả xe (giao lại tài sản).
2. **Mọi thời điểm chuyển giao trách nhiệm phải có bằng chứng**:
   - Chuyển xe: khách → gara khi check-in, gara → người nhận khi check-out.
   - Chuyển quyết định: khách phê duyệt báo giá và hạng mục phát sinh.
   - Bằng chứng gồm ảnh, biên bản, người thực hiện, thời gian, và xác nhận của khách mà **nhân viên không thể làm thay**.
3. **Linh hoạt theo thực tế**: dịch vụ nhanh không cần quy trình nặng; xe thực tế có thể khác xe đã đặt; phụ tùng có thể phải chờ; công suất gara tính theo thời lượng công việc, không chỉ theo số xe.

| Mức | Yêu cầu |
|---|---|
| **Bắt buộc** (giảng viên nhấn mạnh nhiều lần) | B: biên bản tiếp nhận có ảnh + khách xác nhận · C: chỉ sửa phần khách duyệt · D: phát sinh phải duyệt bổ sung + lịch sử · G: đổi xe khi tiếp nhận · H: check-in/check-out hai chiều, xác định người giao/nhận, ủy quyền |
| **Nên bổ sung** | A: rút gọn form đặt lịch · E: quy trình + thời gian chuẩn theo dịch vụ · F: luồng dịch vụ nhanh và khách vãng lai · I: yêu cầu đặt phụ tùng + ngày dự kiến |
| **Phát triển tương lai** | J: công suất theo thời lượng / vị trí cầu nâng / kỹ thuật viên; chữ ký số có giá trị pháp lý; SMS OTP |

---

## PHẦN 2. BẢNG ĐỐI CHIẾU HIỆN TRẠNG

### A. Form đặt lịch

| STT | Yêu cầu | Hiện trạng (bằng chứng) | Thiếu sót | Đề xuất |
|---|---|---|---|---|
| A1 | Chỉ hỏi thông tin cần thiết | ✅ `StoreAppointmentRequest`: bắt buộc chỉ có xe (chọn xe đã lưu, hoặc khai báo hãng + dòng + biển số), ngày, giờ. `symptom_description`, `note`, `service_ids`, `package_ids` đều tùy chọn. Frontend `Booking.tsx` có 4 bước: Xe → Dịch vụ → Ngày giờ → Xác nhận | Không đáng kể | Giữ nguyên. Không thêm trường kỹ thuật vào form |
| A2 | Không bắt khách khai kỹ thuật | ✅ "Chưa rõ xe bị gì?" là ô mô tả tự do, không bắt buộc | — | — |
| A3 | Phân biệt thông tin đặt lịch / tiếp nhận / chẩn đoán | 🟡 Đặt lịch lưu ở `appointments`; tiếp nhận lưu ở `repair_orders.mileage_received` và `initial_condition` (**chỉ 1 ô text**); chẩn đoán lưu ở `inspections`, `inspection_items`, `inspection_recommendations` | Tiếp nhận chưa có cấu trúc (xem B) | Đưa dữ liệu tiếp nhận vào biên bản check-in riêng (thiết kế ở BUSINESS_PROCESS_DESIGN §4) |

### B. Kiểm tra và xác nhận tình trạng xe ban đầu

| STT | Yêu cầu | Hiện trạng | Thiếu sót | Đề xuất |
|---|---|---|---|---|
| B1 | Ghi nhận ngoại thất, trầy xước, móp méo, hư hỏng có sẵn, nội thất | 🟡 Chỉ có `repair_orders.initial_condition` (text). Form trong `ReceptionWorkflow.tsx:118-121` gửi `initial_condition` và `mileage_received` | Không có checklist theo vị trí, không phân loại | Thêm bảng `vehicle_handovers` + `handover_checklist_items` (vị trí, loại hư hỏng, mức độ) |
| B2 | Tài sản, phụ kiện, chìa khóa đi kèm | ❌ Không có trường nào | Có thể mất đồ mà không có căn cứ | Hạng mục checklist loại `ACCESSORY`/`KEY` (số lượng, tình trạng) |
| B3 | **Ảnh thực tế làm bằng chứng** | ❌ Backend không có `Storage::`, `UploadedFile` hay validate `image` ở bất kỳ đâu; không có bảng tệp | **Không có khả năng lưu bằng chứng** | Bảng `media_attachments` (đa hình) + API upload; lưu SHA-256 và thời điểm chụp |
| B4 | Khách xem lại và **xác nhận** tình trạng | ❌ `AdvisorAppointmentController::checkIn` chỉ đổi `status` thành `CHECKED_IN`; không lưu ai thực hiện, lúc nào, khách có đồng ý hay không | Không có chứng từ để giải quyết tranh chấp | Bảng `customer_confirmations` + xác nhận bằng tài khoản web hoặc OTP email (hạ tầng OTP đã có: `EmailVerificationOtp`, `PasswordResetOtp`, Mail) |

### C. Chẩn đoán → báo giá → phê duyệt

| STT | Yêu cầu | Hiện trạng | Thiếu sót | Đề xuất |
|---|---|---|---|---|
| C1 | Tách triệu chứng ban đầu và kết luận chẩn đoán | ✅ `appointments.symptom_description` ≠ `inspections.diagnosis` + `inspection_items` + `inspection_recommendations` (`RepairOrderService::recordInspection`, `completeInspection`). Test: `InspectionControllerTest`, `RepairFlowTest` | — | — |
| C2 | Báo giá chi tiết: hạng mục, phụ tùng, số lượng, đơn giá, nhân công, tổng | 🟡 `quotation_items` có `item_type` SERVICE/PART, `quantity`, `unit_price`, `amount`; `quotations.subtotal/discount/total`. Nhân công nằm ngầm trong giá dịch vụ (`services.base_price`) | Không tách riêng "chi phí nhân công"; không ghi thời gian dự kiến | Thêm `item_type = LABOR` (hoặc `labor_amount` trên dòng SERVICE) và `estimated_minutes` |
| C3 | Khách duyệt **từng hạng mục** | ✅ `POST /me/quotations/{id}/respond` → `recordCustomerResponse` cập nhật `quotation_items.is_approved` và trạng thái `APPROVED` / `PARTIALLY_APPROVED` / `REJECTED`. `QuotationPolicy::respond` chỉ cho **CUSTOMER chủ phiếu**. Test: `CustomerRepairOrderControllerTest`, `AuthorizationPolicyTest` | Chỉ lưu kết quả cuối (`is_approved`, `customer_response_at`); không lưu lịch sử từng lần trả lời, phương thức, IP | Bảng `quotation_item_responses` lưu từng quyết định |
| C4 | **Chỉ sửa phần đã duyệt** | ✅ `startRepair` chỉ tạo `work_items` từ dòng SERVICE `is_approved = true`; `recordUsedPart` chặn phụ tùng không nằm trong dòng PART đã duyệt; hóa đơn chỉ lấy dòng đã duyệt | Xem C5 | — |
| C5 | **Không để nhân viên xác nhận thay khách** | ✅ **Đã xử lý ở P0** (gỡ route, method và nút phía Advisor; có test). Hiện trạng trước P0: ❔ **Mâu thuẫn giữa các lớp:** frontend Advisor có nút **"Ghi nhận phản hồi tại quầy"** (`RepairOrderPanels.tsx:134`, gọi `POST /quotations/{id}/respond`); route nằm trong nhóm ADVISOR (`routes/api.php`) nhưng `QuotationPolicy::respond` chỉ cho CUSTOMER | Theo mã: nút này **luôn bị 403** (chức năng hỏng). Nếu ai đó "sửa" bằng cách nới policy thì cố vấn sẽ tự duyệt thay khách, **vi phạm nguyên tắc** | Thay bằng "khách xác nhận tại quầy bằng OTP / tài khoản", lưu `customer_confirmations`. Gỡ route advisor `respond` |
| C6 | Khách xem kết quả chẩn đoán trước khi duyệt | ❌ `CustomerRepairOrderController::show` nạp `statusHistory`, `quotations.items`, `workItems`, `invoice` nhưng **không nạp `inspections`** | Khách duyệt báo giá mà không thấy căn cứ kỹ thuật | Trả về `inspections.items`, `recommendations` (lọc ghi chú nội bộ) + ảnh chẩn đoán |

### D. Gói dịch vụ và hạng mục phát sinh

| STT | Yêu cầu | Hiện trạng | Thiếu sót | Đề xuất |
|---|---|---|---|---|
| D1 | Danh mục gói, hạng mục trong gói, giá niêm yết | ✅ `maintenance_packages` + `maintenance_package_services` + `maintenance_package_parts`; `services.base_price`, `parts.sell_price`; Admin CRUD (`AdminMaintenancePackageController`, `AdminServiceController`) | — | — |
| D2 | Dịch vụ lẻ ngoài gói | ✅ `appointment_services` song song `appointment_packages` | — | — |
| D3 | Không mặc định làm toàn bộ gói | ✅ Gói chỉ là ý định lúc đặt lịch; việc thực hiện đi qua báo giá và khách duyệt từng dòng (C3) | Báo giá không tự đề xuất dòng từ gói đã chọn | Gợi ý dòng báo giá từ gói khách đã chọn (vẫn chờ duyệt) |
| D4 | **Hạng mục phát sinh khi đang sửa** | ❌ `createQuotation` chỉ cho phép khi phiếu đang INSPECTING / QUOTING / WAITING_APPROVAL, **không cho IN_PROGRESS**. Ngoài ra `generateInvoice` và `recordUsedPart` chỉ đọc `latestQuotation`. Nếu tạo một phiên bản mới, các dòng đã duyệt ở bản cũ **sẽ mất khỏi hóa đơn** | Không có đường đi hợp lệ cho phát sinh. (Đính chính P0: phiên bản = báo giá lại thay thế, nên hiện tại hóa đơn đúng; chỉ cần gộp khi đã có loại SUPPLEMENT) | Báo giá bổ sung (`quotations.type = SUPPLEMENT`, `parent_quotation_id`, `reason`); hóa đơn và kiểm tra phụ tùng gộp dòng đã duyệt của **mọi** báo giá hiệu lực |
| D5 | Lịch sử thay đổi báo giá và phê duyệt | 🟡 `quotations.version` tăng dần; `repair_order_status_history` ghi chuyển trạng thái phiếu | Không lưu ai duyệt, lúc nào, bằng cách nào, cho từng dòng | `quotation_item_responses` + `audit_logs` (bảng đã có, hiện chỉ VNPay dùng) |

### E. Quy trình và thời gian cho từng dịch vụ

| STT | Yêu cầu | Hiện trạng | Thiếu sót | Đề xuất |
|---|---|---|---|---|
| E1 | Mỗi dịch vụ có quy trình, các bước | ❌ Chỉ có `services.estimated_minutes`; không có bảng bước | | `service_steps` (thứ tự, tên, phút chuẩn, cần checklist) |
| E2 | Thời gian dự kiến từng bước và toàn dịch vụ | 🟡 `estimated_minutes` theo dịch vụ; `BookingCatalogController` cộng phút của gói | Không theo bước | Tổng thời gian = Σ phút các bước |
| E3 | Phân cấp dịch vụ (A/B…) | ❌ | | `services.service_level` (`QUICK` / `STANDARD` / `MAJOR`) + `requires_vehicle_stay` |
| E4 | Phân biệt thời gian chuẩn / thực tế / chờ / dự kiến xong | 🟡 `work_items.started_at` / `completed_at` (thực tế); `repair_order_status_history.created_at` (suy ra được thời gian chờ) | Không có `estimated_ready_at` cho khách; không có thời gian chuẩn trên `work_items` | `work_items.standard_minutes`; `repair_orders.estimated_ready_at` |
| E5 | Admin cấu hình | 🟡 Admin sửa `estimated_minutes` | Chưa có quản lý bước | Màn hình "Quy trình dịch vụ" trong trang Dịch vụ của Admin |

### F. Dịch vụ nhanh và dịch vụ phải để xe lại

| STT | Yêu cầu | Hiện trạng | Thiếu sót | Đề xuất |
|---|---|---|---|---|
| F1 | Khách vãng lai không đặt lịch | 🟡 Backend: `repair_orders.appointment_id` nullable; `RepairOrderService::receive` cho tạo phiếu không cần lịch hẹn; `POST /advisor/appointments` cho cố vấn tạo lịch hộ. Frontend: `ReceptionWorkflow` **chỉ** tiếp nhận từ lịch hẹn; trang "Đặt lịch hộ" là trang khung | Giao diện không có luồng vãng lai | Nút "Tiếp nhận khách vãng lai" ở trang Tiếp nhận (tìm hoặc tạo khách + xe, tạo phiếu không cần lịch hẹn) |
| F2 | Luồng rút gọn cho dịch vụ nhanh | ❌ Mọi phiếu đều đi RECEIVED → INSPECTING → QUOTING → WAITING_APPROVAL → IN_PROGRESS (`RepairOrder::TRANSITIONS`) | Thay dầu cũng phải lập phiếu kiểm tra và báo giá đầy đủ | `repair_orders.flow_type = QUICK`: báo giá tự sinh từ dịch vụ niêm yết, khách xác nhận một lần tại quầy, bỏ bước chẩn đoán. **Vẫn giữ** check-in rút gọn và xác nhận giá |

### G. Đổi xe khi khách đến gara

| STT | Yêu cầu | Hiện trạng | Thiếu sót | Đề xuất |
|---|---|---|---|---|
| G1 | Không bắt mang đúng xe đã đặt | ❌ `RepairOrderService::assertAppointmentReadyForReceiving` **chặn** khi `vehicle_id` khác lịch hẹn ("Khách hàng hoặc xe không khớp với lịch hẹn") | Khách phải hủy lịch và đặt lại | Cho phép xe khác **của cùng khách**, bắt buộc nhập `vehicle_change_reason` |
| G2 | Chọn xe khác có sẵn hoặc thêm xe mới | 🟡 API `vehicles` (Advisor/Admin) và `customers/{id}/vehicles` đã có | Giao diện Tiếp nhận chưa cho đổi xe | Bộ chọn xe trong bước tiếp nhận |
| G3 | Phiếu sửa chữa dùng đúng xe thực tế | ✅ Mọi chứng từ sau (báo giá, hóa đơn) đều đi theo `repair_orders.vehicle_id` | Chỉ cần mở chặn ở G1 | — |
| G4 | Lưu lịch sử thay đổi | ❌ | | Ghi `audit_logs` (action `repair_order.vehicle_changed`, old/new) + lưu `booked_vehicle_id` trên phiếu |

### H. Check-in / check-out hai chiều

| STT | Yêu cầu | Hiện trạng | Thiếu sót | Đề xuất |
|---|---|---|---|---|
| H1 | Chứng từ giao xe vào gara: người giao, người nhận, thời gian, xe, tình trạng, ảnh, tài sản | ❌ Chỉ có `repair_orders.advisor_id` (người nhận), `received_at`, `initial_condition` (text) | Không biết ai giao xe; không có ảnh, tài sản, chữ ký | `vehicle_handovers` (type `CHECK_IN`) + người giao (tên, SĐT, có phải chủ xe) + checklist + ảnh + `customer_confirmations` |
| H2 | Check-out: đối chiếu tình trạng, hạng mục, phụ tùng, chi phí | 🟡 `logReviewAndTest` ghi lịch sử REVIEW_TEST; `completeRepairOrder` kiểm tra mọi `work_items` xong; `handOver` yêu cầu hóa đơn `PAID` | Không có biên bản trả xe, không đối chiếu ảnh trước/sau, không đối chiếu phụ tùng đã thay | `vehicle_handovers` (type `CHECK_OUT`) tham chiếu biên bản CHECK_IN; hiển thị song song |
| H3 | **Xác định người nhận xe; ủy quyền; OTP; không lấy xe chỉ bằng mã phiếu** | ❌ `RepairOrderController::handOver` không nhận tham số nào; chỉ kiểm tra `invoice.status = PAID` | **Bất kỳ ai** được cố vấn bấm "bàn giao" đều nhận được xe; không lưu danh tính | Bắt buộc: thông tin người nhận + xác thực (chủ xe xác nhận trong tài khoản, **hoặc** OTP gửi email chủ xe, **hoặc** người được ủy quyền đã khai báo trước + OTP gửi chủ xe) |
| H4 | Đối chiếu bốn chứng từ | ❌ | | Trang "Hồ sơ giao nhận" trên phiếu: CHECK_IN ↔ CHECK_OUT, kèm các xác nhận |

### I. Phụ tùng và thời gian chờ

| STT | Yêu cầu | Hiện trạng | Thiếu sót | Đề xuất |
|---|---|---|---|---|
| I1 | Kiểm tra tồn kho khi cần thay | 🟡 `recordUsedPart` kiểm tra `inventories.quantity` khi xuất kho (lúc đang sửa) | Không kiểm tra lúc chẩn đoán / báo giá, nên khách duyệt rồi mới biết hết hàng | Hiển thị tồn kho khi lập báo giá; cảnh báo thiếu |
| I2 | Yêu cầu đặt phụ tùng, ngày đặt, trạng thái đơn, ETA, ngày về | ❌ Không có bảng | | `part_requests` (`REQUESTED` → `ORDERED` → `RECEIVED` / `CANCELLED`, `ordered_at`, `eta_date`, `received_at`, `supplier_note`) + `inventory_transactions` loại IN khi hàng về |
| I3 | Trạng thái WAITING_FOR_PARTS riêng | ✅ Có trong `RepairOrder::TRANSITIONS` (IN_PROGRESS ↔ WAITING_FOR_PARTS); màu riêng trên giao diện (`status.ts`) | Chỉ vào được từ IN_PROGRESS; lý do chỉ là `note` tự do | Cho phép từ trạng thái "đã duyệt báo giá, chưa bắt đầu"; lý do gắn với `part_requests` |
| I4 | Khách biết đang chờ gì, đã đặt chưa, khi nào về, khi nào nhận xe | 🟡 Khách thấy trạng thái "Chờ phụ tùng" và nhật ký (`RepairStatus.tsx`) | Không thấy phụ tùng nào, ETA | Hiển thị `part_requests` (tên, trạng thái, ETA) + `estimated_ready_at` |
| I5 | Thông báo khách | ❌ Bảng `notifications` **có nhưng không nơi nào ghi** | | Ghi `notifications` khi đổi trạng thái quan trọng; email qua Mail sẵn có |

### J. Công suất gara

| STT | Yêu cầu | Hiện trạng | Thiếu sót | Đề xuất |
|---|---|---|---|---|
| J1 | Giờ làm việc, ngày nghỉ | ✅ `working_hours` (theo thứ, giờ mở/đóng), `holidays`; Admin cấu hình | — | — |
| J2 | Giới hạn tiếp nhận | 🟡 `working_hours.max_slots` = số lịch tối đa **mỗi khung giờ**. Kiểm tra ở `AppointmentController:112`, `:430` và `AdvisorAppointmentController:70` | Đếm theo **số xe**, không theo thời lượng; không có giới hạn theo ngày, số cầu nâng hay số KTV; xe đang lưu gara không được tính | Tính tải theo phút: Σ `estimated_minutes` của lịch trong ngày + phiếu đang mở so với năng lực (số KTV × phút làm việc), cộng số vị trí đỗ |
| J3 | Quá tải thì không tự xác nhận, cảnh báo, đề xuất khung khác | 🟡 Lịch khách luôn ở `PENDING` chờ cố vấn xác nhận (không tự xác nhận) | Không có cảnh báo tải, không đề xuất | Cảnh báo ở màn xác nhận lịch; API gợi ý khung giờ còn năng lực |
| J4 | Lịch kỹ thuật viên | 🟡 Bảng `technician_schedules` có nhưng chưa có API / UI | | Phase sau |

### Nguyên tắc nghiệp vụ (mục 3 của đề bài)

| # | Nguyên tắc | Đánh giá |
|---|---|---|
| 1 | Đặt lịch ≠ tiếp nhận | ✅ `appointments` ≠ `repair_orders`; phiếu chỉ tạo khi lịch đã CHECKED_IN |
| 2 | Xe đặt có thể khác xe thực tế | ❌ Bị chặn (G1) |
| 3 | Tình trạng ban đầu có ảnh + xác nhận | ❌ (B3, B4) |
| 4 | Chẩn đoán ≠ khách đồng ý | ✅ |
| 5 | Mọi hạng mục sửa phải được duyệt | ✅ Ở báo giá đầu. ❔ Nút "tại quầy" mâu thuẫn (C5) |
| 6 | Phát sinh phải xác nhận bổ sung | ❌ (D4) |
| 7–9 | Không phải dịch vụ nào cũng phức tạp / lưu xe; mỗi dịch vụ có quy trình, thời gian | ❌ (E, F) |
| 10 | Quản lý chờ phụ tùng | 🟡 (I) |
| 11 | Kiểm soát công suất | 🟡 (J) |
| 12–13 | Chứng từ hai chiều; người giao / người nhận | ❌ (H) |
| 14 | Truy vết lịch sử sửa chữa | 🟡 `repair_order_status_history` có ghi người thực hiện (`changed_by_account_id`); thiếu với báo giá, đổi xe, giao nhận |
| 15 | Mọi thay đổi quan trọng phải ghi nhận | 🟡 `audit_logs` có sẵn nhưng chỉ VNPay dùng |

---

## PHẦN 2B. PHÁT HIỆN QUAN TRỌNG (ưu tiên đọc)

1. **Bàn giao xe không xác thực người nhận** (H3). `handOver` chỉ cần hóa đơn đã thanh toán, không lưu ai nhận xe. Đây là rủi ro lớn nhất về tài sản.
2. **Không có hạ tầng lưu ảnh / chứng từ** (B3). Đây là điều kiện tiên quyết cho B, H và một phần C.
3. **Không có xác nhận của khách khi giao xe vào gara** (B4). Check-in chỉ đổi trạng thái.
4. **Hạng mục phát sinh không có luồng hợp lệ** (D4). *Đính chính sau khi đối chiếu ở P0:* hiện **không** có lỗi tiền. Phiên bản báo giá mới là bản **thay thế** (báo giá lại trước khi sửa), và hệ thống không cho lập báo giá khi đang sửa, nên hóa đơn đọc bản mới nhất là đúng; P0 đã thêm test khóa hành vi này. Rủi ro chỉ xuất hiện khi làm tính năng phát sinh: ở P3 phải phân biệt `INITIAL` / `SUPPLEMENT` rồi mới gộp. Gộp mọi phiên bản ngay bây giờ sẽ **tính tiền hai lần**.
5. **Nút "Ghi nhận phản hồi tại quầy" của cố vấn** (C5): theo policy sẽ 403. Cần thay bằng cơ chế khách tự xác nhận (OTP), không nới quyền cho cố vấn.
6. **Đổi xe khi tiếp nhận bị chặn cứng** (G1).
7. **Khách không xem được kết quả chẩn đoán** (C6) trước khi duyệt báo giá.
8. **`notifications` và `audit_logs` có bảng nhưng gần như không dùng.** Có thể tận dụng ngay, không cần bảng mới.
9. **Vai trò TECHNICIAN** có tài khoản và API (`work-items/{id}/status`, `inspections`) nhưng không có giao diện. Đề bài nói kỹ thuật viên "không mặc định là tác nhân đăng nhập", nên **cần bạn quyết định** (xem ROADMAP §0).

## PHẦN 2C. Đã có và hoạt động tốt, giữ nguyên

- Đặt lịch gọn, chống gửi lặp (`idempotency`), throttle, chặn ngày lễ / ngoài giờ / hết chỗ.
- Máy trạng thái phiếu sửa chữa có kiểm soát (`RepairOrder::TRANSITIONS`, `InvalidStatusTransitionException`) + lịch sử trạng thái có người thực hiện.
- Một lịch hẹn ↔ một phiếu; một xe ↔ một phiếu đang mở.
- Chẩn đoán có cấu trúc (hạng mục + đề xuất); phụ tùng chỉ vào báo giá khi đã được đề xuất ở chẩn đoán.
- Khách duyệt từng dòng; chỉ dòng đã duyệt mới thành công việc, phụ tùng xuất kho và hóa đơn.
- Xuất kho có giao dịch kho (`inventory_transactions`).
- Thanh toán: tiền mặt, QR, VNPay (có chữ ký, IPN, audit); chỉ bàn giao khi đã thanh toán đủ.
- Phân quyền bằng middleware vai trò + policy theo chủ sở hữu (khách chỉ thấy dữ liệu của mình).
- Giao diện Phase 5: bố cục, `StatusBadge`, `Modal`, Việt hóa. **Không đổi.**
