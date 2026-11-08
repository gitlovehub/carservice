# SESSION HANDOFF

> Chế độ: **AUTONOMOUS DONE MODE** (D-015) — tự triển khai + tự commit từng chức năng; không push.
> Cập nhật: 08/11/2026.

## Commit đã tạo trong chế độ này

| Chức năng | Commit |
|---|---|
| P1A evidence schema + models | `a67819e` |
| P1B media storage + authorization | `b533524` |
| P1C customer confirmation + OTP | `26389df` |
| P1D confirmation + photo UI | commit `feat(confirmation-ui)` (xem `git log --oneline -1 -- frontend/src/pages/advisor/CounterApprovalPanel.tsx`) |

## P1 đã xong (chờ PO nghiệm thu khi xem FINAL report)

- DB dev local đã migrate 3 bảng P1 (D-016).
- Trình duyệt: panel duyệt tại quầy + ảnh chẩn đoán hiển thị đúng; gửi/nhập OTP thật và upload ảnh **BROWSER_NOT_VERIFIED** (tránh email thật / dữ liệu giả).
- Script trình duyệt: scratchpad `audit/p1check.mjs` (chỉ đọc + bấm toggle).

## Đã xong trong P2

- P2-A + P2-B (một commit `feat(reception)`): migration `2026_11_08_110000_create_vehicle_handovers_table.php`, `2026_11_08_110100_add_reception_columns_to_repair_orders_table.php`; model `VehicleHandover`, `HandoverChecklistItem`; `RepairOrder` (+ fillable, `bookedVehicle`, `handovers`, `confirmedCheckIn`, `SOURCE_*`); `RepairOrderService::receive` (đổi xe + audit + source + requires_check_in); test `ReceptionVehicleChangeTest`. **Chưa migrate DB dev cho 2 migration P2** (làm khi kiểm trình duyệt P2-D).

- P2-C (commit `feat(handover)`): `HandoverService`, `HandoverController` (ADVISOR: index/store/update/submit/void/otp/verify-otp), `CustomerHandoverController` (`GET /me/repair-orders/{id}/handovers`, `POST /me/handovers/{id}/confirm`), `HandoverOtpMail` + view, gate `assertCheckInConfirmed` trong `assignTechnician` + `recordInspection`, `MediaService` alias `handover`. `ConfirmationService` refactor: `issueOtp`/`checkOtp`/`consumeOtp`/`record` dùng chung. Test `VehicleCheckInTest` 9/9; suite 182/182.
- QA-01 sửa (`b237658`).

## Tiếp theo: P2-D (frontend)

- Advisor `ReceptionWorkflow.tsx`: khi chọn lịch hẹn, cho chọn xe khác của cùng khách + ô lý do (bắt buộc khi khác xe); gửi `vehicle_change_reason`.
- Advisor trang Chi tiết phiếu: panel "Biên bản nhận xe" khi `requires_check_in` (hoặc luôn hiện): form (km, nhiên liệu, tình trạng chung, đồ giá trị, người giao + quan hệ, checklist mặc định: 4 góc ngoại thất + chìa khóa + giấy tờ), `PhotoUploader type="handover"` khi DRAFT, nút "Gửi khách xác nhận" (submit), sau đó chọn: khách tự xác nhận trong tài khoản (Làm mới) **hoặc** OTP tại quầy (gửi mã / nhập mã), hủy (lý do). Thông báo chặn khi giao KTV mà chưa CONFIRMED.
- Customer: trong trang chi tiết phiếu (`RepairStatus.tsx`), khối "Biên bản nhận xe" (SUBMITTED → nút "Xác nhận đúng tình trạng" + ghi chú; CONFIRMED → hiển thị đã xác nhận), ảnh qua PhotoUploader readOnly.
- Types trong `workflowService.ts` (`requires_check_in`, `handovers`) và `customerApi.ts`.
- RepairOrderController::show phải trả `handovers` (kiểm tra `load`) — hoặc frontend gọi `GET /repair-orders/{id}/handovers`.
- Smoke test mới; tsc/build/eslint; migrate DB dev 2 migration P2 (D-016 áp dụng tương tự); trình duyệt chỉ đọc.

## Kế hoạch P2 (gốc)

| Bước | Nội dung | Commit dự kiến |
|---|---|---|
| P2-A | Migration: `vehicle_handovers` (repair_order_id, type CHECK_IN/CHECK_OUT, status DRAFT/SUBMITTED/CONFIRMED/VOID, odometer_km, fuel_level, delivered_by_name/phone, received_by_employee_id, valuables_note, compared_handover_id, void_reason, submitted_at, confirmed_at), `handover_checklist_items` (theo design §5); `repair_orders` + `booked_vehicle_id`, `vehicle_change_reason`, `source` (default 'APPOINTMENT'). Model + test schema | `feat(handover): add handover schema` |
| P2-B | `RepairOrderService::receive`: cho phép xe khác lịch hẹn nếu cùng chủ + bắt buộc lý do + audit_logs; hỗ trợ WALK_IN (không appointment). Test 422/audit | `feat(reception): allow vehicle change and walk-in` |
| P2-C | `HandoverService` + API CHECK_IN (tạo/sửa ở DRAFT, submit → khách xác nhận qua ACCOUNT `/me/handovers/{id}/confirm` hoặc OTP email tại quầy, CONFIRMED khóa, VOID kèm lý do). Media alias `handover`. Chặn `INSPECTING` khi CHECK_IN chưa CONFIRMED — **chỉ áp dụng cho phiếu tạo sau khi triển khai** (cờ theo ngày tạo / cột `requires_handover`), để không chặn dữ liệu cũ | `feat(handover): implement vehicle check-in records` |
| P2-D | Frontend Advisor (chọn xe + lý do, vãng lai, biên bản CHECK_IN + ảnh + xác nhận) + Customer (xem/xác nhận biên bản) + smoke + trình duyệt | `feat(handover-ui): ...` |

Trước P2-A: đọc `BUSINESS_PROCESS_DESIGN.md` §5 (bảng `vehicle_handovers`, `handover_checklist_items`), `RepairOrderService::receive`, `ReceiveVehicleFlowTest`, `AdvisorAppointmentOverrideTest`, `ReceptionWorkflow.tsx`.

## Cần PO

Không có blocker. Ghi chú: chính sách ủy quyền nhận xe (P4) dùng thiết kế N9 trong `BUSINESS_PROCESS_DESIGN.md`; nếu khi tới P4 có điểm mơ hồ sẽ dừng hỏi.
