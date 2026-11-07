# BLOCKERS

## ~~B-01 · Câu hỏi nghiệp vụ Q1–Q7~~ — ĐÃ GỠ 08/11/2026

Chốt theo đề xuất (D-005 … D-012 trong `DECISION_LOG.md`). Không làm ký tay.

## B-02 · Nghiệm thu P0 (chặn P1)

PO cần: (1) xem `PHASE_P0_REPORT.md`; (2) xác nhận T-001 trong `DECISION_LOG.md`; (3) nghiệm thu sau khi có kết quả P0-03.

## B-03 · Checkpoint Git (chặn P1A)

Có ~91 thay đổi chưa commit (Phase 5 + P0). Đề xuất 2 commit riêng trên `fix/apt` (không push): "Phase 5 UI/UX refinement" và "P0: customer-only quotation approval". Cần PO cho phép commit. Nếu PO không muốn commit, có thể làm tiếp P1 khi chưa commit (rủi ro: thay đổi nghiệp vụ lẫn với UI trong cùng diff).

## B-04 · API cho UI/UX tồn đọng

UX-B1..B3 (`/me/vehicles` kèm hãng, API Tổng quan, API doanh thu) là thay đổi API contract, cần PO duyệt. Không chặn P1.

## Ngoài code (PO tự làm, không chặn phát triển)

Xác minh tên miền `carservicevn.xyz` trên Resend; đặt `MAIL_FROM_ADDRESS` thuộc tên miền đó trên Railway.
