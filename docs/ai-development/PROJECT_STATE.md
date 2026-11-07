# PROJECT STATE – CarService WD_004

> Cập nhật: 08/11/2026 (khởi tạo hệ thống tự quản lý).
> Đọc file này + `SESSION_HANDOFF.md` + `MASTER_TASK_LIST.md` ở đầu mỗi lệnh NEXT.

## Git

| | |
|---|---|
| Nhánh | `fix/apt` |
| Commit HEAD | `d864927` (Merge branch 'fix/apt') |
| Nhánh chính | `main` |
| Thay đổi chưa commit | ~91 mục: Phase 5 UI/UX (81 file) + P0 (6 file code/test) + tài liệu nghiệp vụ + `docs/ai-development/` |
| Commit/push | **Chưa được phép.** Chỉ commit khi PO cho phép (task G-02) |

File P0 chưa commit: `backend/routes/api.php`, `backend/app/Http/Controllers/Api/QuotationController.php`, `backend/tests/Feature/RepairFlowTest.php`, `frontend/src/pages/advisor/RepairOrderPanels.tsx`, `frontend/src/services/workflowService.ts`, `frontend/package.json`, `frontend/tests/customer-approval-only.mjs` (mới).

## Vị trí hiện tại

| | |
|---|---|
| Phase hiện tại | **P0 – Sửa lỗi an toàn** |
| Bước hiện tại | P0-04: chờ PO nghiệm thu P0 (P0-01..03 đã VERIFIED) |
| Phase đã hoàn thành | Phase 3 (component), Phase 4 (layout), Phase 5 (UI/UX refinement, điểm 7.3), phân tích nghiệp vụ |
| P0 | Đã triển khai, kiểm thử tự động và kiểm trình duyệt (08/11/2026). **Chưa** được PO nghiệm thu |
| Phase tiếp theo | P1A (Q1–Q7 đã chốt; còn chờ nghiệm thu P0 và checkpoint Git) |

## Kiểm thử gần nhất (chạy lại 08/11/2026 khi khởi tạo)

- Backend `php artisan test`: **146/146**, 634 assertion.
- Frontend smoke `tests/*.mjs`: **14/14**.
- `tsc -b`: đạt.
- `vite build`: đạt ở lần chạy P0 (không chạy lại khi khởi tạo).
- ESLint toàn dự án: 22 lỗi `set-state-in-effect` tồn từ trước (nợ kỹ thuật Phase 5).

## Công việc đang dở

Không có thay đổi code dở dang.

## Điều kiện chuyển bước

- Rời P0 → P1A khi: P0-03 xong (hoặc PO chấp nhận bỏ qua), PO nghiệm thu P0 (P0-04), có checkpoint Git hoặc PO đồng ý làm tiếp không commit (G-02). G-01 (Q1–Q7) đã xong.
