# PROJECT STATE – CarService WD_004

> Cập nhật: 08/11/2026 — sau NEXT #2 (P0-04 + G-02).
> Đọc file này + `SESSION_HANDOFF.md` + `MASTER_TASK_LIST.md` ở đầu mỗi lệnh NEXT.

## Git

| | |
|---|---|
| Nhánh | **`v3`** (từ 09/11/2026; đã viết lại lịch sử bỏ 25 commit tác giả Claude ngày 02/11 + xóa `backend/.claude`, `backend/CLAUDE.md`; force push `origin/v3` = `f83c641`). Chỉ merge `v3` vào `main`; `fix/apt`/`hotfix`/`demo_vnpay` còn lịch sử cũ. |
| Commit | `ea1b85e` P0: quotation approval is customer-only ← `2bec3e0` Phase 5: UI/UX refinement ← `d864927` |
| Thay đổi chưa commit | Không (sau commit P1A) |
| Commit/push | Mỗi lần commit phải hỏi PO (D-014 chỉ cho checkpoint này). Push: chưa được phép |

## Vị trí hiện tại

| | |
|---|---|
| Phase đã hoàn thành | Phase 3, 4, 5; **P0 (nghiệm thu 08/11/2026)** |
| Quyết định | Q1–Q7 đã chốt (D-005 … D-012) |
| Phase hiện tại | **P1 – Hạ tầng bằng chứng và xác nhận** |
| Chế độ | AUTONOMOUS DONE MODE (D-015): tự commit từng chức năng, không push |
| Bước vừa xong | **P1 xong**: P1A `a67819e`, P1B `b533524`, P1C `26389df`, P1D (commit `feat(confirmation-ui)`) |
| Bước tiếp theo | **P2-A**: schema biên bản giao nhận xe |
| DB dev | Đã migrate 3 bảng P1 (D-016) |

## Kiểm thử gần nhất

- Backend 146/146 (634), smoke 14/14, tsc đạt — chạy 08/11/2026 trên đúng nội dung của commit `ea1b85e`.
- Trình duyệt P0-03: 8/8 đạt.
- Commit trung gian `2bec3e0` (Phase 5 không có P0) **không** được build/test riêng; nội dung bằng HEAD cũ + thay đổi Phase 5 của `RepairOrderPanels.tsx`.

## Công việc đang dở

Không có.

## Điều kiện chuyển bước

- P1A-01 → P1A-02: migration chạy được trên SQLite test (`migrate:fresh` trong test), rollback được, toàn bộ test cũ vẫn đạt, không đổi bảng cũ.
- Rời P1 khi P1D-03 VERIFIED và PO nghiệm thu P1.


## Cập nhật 09/11/2026 (v3)

Danh mục xe 3 cấp (Hãng → Dòng xe → Phiên bản) từ CSV đã triển khai và commit trên `v3` (chưa push), xem SESSION_HANDOFF.md. DB dev migrate tới `2026_11_09_100000` và đã seed CSV. Còn: UX-01..09, FINAL-01, gắn bộ chọn xe cho trang cố vấn.

## Cập nhật 08/11/2026 (sau P7)

P0–P7 đã triển khai và commit (xem SESSION_HANDOFF.md). Còn: UX-01..09, P3-FE-H, FINAL-01. Backend 211/211, smoke 21/21. DB dev migrate tới 2026_11_08_160000.
