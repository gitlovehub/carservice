# SESSION HANDOFF

> Chế độ: **AUTONOMOUS DONE MODE** (D-015) — tự triển khai + tự commit từng chức năng; không push.
> Cập nhật: 08/11/2026.

## Vừa xong

- P1A (P1A-01 migration + P1A-02 model) → commit `feat(evidence): add evidence schema and models` (hash ghi trong `MASTER_TASK_LIST.md` / `PROJECT_STATE.md` ở commit kế tiếp).
- Model: `MediaAttachment` (ẩn disk/path, hằng số giới hạn D-007), `ConfirmationOtp` (ẩn code_hash, TTL 10', tối đa 5 lần, `isUsable()`), `CustomerConfirmation` (chỉ thêm: chặn update/delete), `Quotation::confirmations()`.
- Test: `EvidenceSchemaTest` 4, `EvidenceModelsTest` 3. Suite 153/153 (có 1 test chập chờn có sẵn: QA-01).

## Tiếp theo: P1B-01 + P1B-02 (một commit `feat(media)`)

- `MediaService`: lưu `storage/app/private/evidence/{yyyy}/{mm}/{uuid}.{ext}` (disk `local`), SHA-256, kiểm MIME thật (JPEG/PNG/WebP), ≤ 10 MB, ≤ 30 ảnh/đối tượng.
- API: `POST /api/media` (ADVISOR; multipart `file`, `attachable_type` theo whitelist alias, `attachable_id`, `caption?`, `position_code?`, `taken_at?`) ; `GET /api/media/{id}` (stream; nhân viên ADVISOR/ADMIN hoặc khách sở hữu phiếu liên quan); `GET /api/media/{id}` trả 403 cho khách khác.
- Whitelist alias P1: `quotation` → `Quotation`, `repair_order` → `RepairOrder`, `inspection` → `Inspection` (P2 thêm `handover`).
- Test: 422 sai loại / quá dung lượng / quá số lượng; 403 khách khác; khách chủ phiếu xem được; Storage::fake.

## Sau đó

P1C-01..03 (confirmation + OTP email, `Mail::fake`), P1D (frontend), rồi P2…

## Cần PO

Trước P1D-03 (trình duyệt): cho `php artisan migrate` (chỉ thêm bảng) trên DB dev Laragon? Nếu chưa được trả lời → ghi BROWSER_NOT_VERIFIED cho phần cần bảng mới.
