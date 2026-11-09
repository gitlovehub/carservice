# BLOCKERS

## ~~B-01 · Câu hỏi nghiệp vụ Q1–Q7~~ — ĐÃ GỠ 08/11/2026

Chốt theo đề xuất (D-005 … D-012 trong `DECISION_LOG.md`). Không làm ký tay.

## B-02 · Nghiệm thu P0 (chặn P1)

PO cần: (1) xem `PHASE_P0_REPORT.md`; (2) xác nhận T-001 trong `DECISION_LOG.md`; (3) nghiệm thu sau khi có kết quả P0-03.

## B-03 · Checkpoint Git (chặn P1A)

Có ~91 thay đổi chưa commit (Phase 5 + P0). Đề xuất 2 commit riêng trên `fix/apt` (không push): "Phase 5 UI/UX refinement" và "P0: customer-only quotation approval". Cần PO cho phép commit. Nếu PO không muốn commit, có thể làm tiếp P1 khi chưa commit (rủi ro: thay đổi nghiệp vụ lẫn với UI trong cùng diff).

## B-04 · API cho UI/UX tồn đọng

UX-B1..B3 (`/me/vehicles` kèm hãng, API Tổng quan, API doanh thu) là thay đổi API contract, cần PO duyệt. Không chặn P1.

## B-05 · Nghiệp vụ "Chờ phụ tùng" — PO quyết định khi làm tiếp (ghi 10/11/2026)

> **Lịch (D-017):** không chặn hiện tại. Làm xong client → tới cố vấn → PO chốt logic ở đây (task ADV-01).

**Vấn đề PO hỏi:** phiếu ở trạng thái "Chờ phụ tùng" thì làm sao biết đang thiếu cái gì để nhập?

**Hiện trạng code:**
- Khách duyệt báo giá có dòng phụ tùng mà kho không đủ → hệ thống **tự tạo `part_requests`** (phụ tùng, số lượng thiếu) — `RepairOrderService::syncPartShortages`.
- Cố vấn thấy khung "Phụ tùng chờ đặt hàng" (`pages/advisor/PartRequestsPanel.tsx`): ghi đặt hàng + ngày dự kiến về + nhà cung cấp; "Đã về" = nhập kho + báo khách (`PartRequestService::receive`); hủy kèm lý do.
- Nút "Chờ phụ tùng" (`RepairOrderService::markWaitingForParts`) chỉ đổi trạng thái + ghi chú tự do. "Tiếp tục sửa" khi còn yêu cầu mở thì phải ghi lý do ≥ 5 ký tự.

**Lỗ hổng:**
1. Chuyển "Chờ phụ tùng" không bắt buộc nói thiếu gì. Dữ liệu dev: RO-2026-DM0192, RO-2026-DM0195 đang chờ phụ tùng nhưng **0 yêu cầu**; toàn hệ thống 0 `part_requests`.
2. Admin không thấy yêu cầu phụ tùng ở đâu (trang Phiếu sửa chữa, Phụ tùng & kho đều không có).
3. Rủi ro **cộng kho 2 lần**: admin "Nhập kho" thường → yêu cầu vẫn mở → cố vấn bấm "Đã về" → cộng thêm lần nữa.
4. Phụ tùng phát hiện thiếu khi đang sửa (không nằm trong báo giá) không có chỗ ghi ngoài ghi chú.

**Đề xuất:**
1. "Chờ phụ tùng" bắt buộc có ≥ 1 yêu cầu mở; chưa có thì cố vấn chọn phụ tùng + số lượng ngay lúc chuyển → tạo yêu cầu.
2. Khung chi tiết phiếu (Admin) thêm mục "Phụ tùng đang chờ": tên, SL, trạng thái (cần đặt / đã đặt / quá hạn), ngày dự kiến về.
3. Phụ tùng & kho thêm tab **"Cần đặt hàng"**: gom yêu cầu mở theo phụ tùng (vd "Lọc gió điều hoà — cần 3, cho 2 phiếu"); "Đã về" nhập kho qua yêu cầu (không cộng trùng).
4. Phụ tùng cuối của phiếu về → thông báo cố vấn "đủ phụ tùng, có thể tiếp tục"; không tự chuyển trạng thái.

**PO cần chốt:** ai đặt mua / nhận phụ tùng ngoài thực tế?
- **Admin / người quản lý kho** → làm đủ 1–4 (cố vấn chỉ báo thiếu, admin đặt + nhận hàng).
- **Cố vấn** → giữ đặt/nhận ở cố vấn như hiện tại; Admin chỉ xem (mục 2 + tab tổng hợp ở mục 3 dạng chỉ xem).

## Ngoài code (PO tự làm, không chặn phát triển)

Xác minh tên miền `carservicevn.xyz` trên Resend; đặt `MAIL_FROM_ADDRESS` thuộc tên miền đó trên Railway.
