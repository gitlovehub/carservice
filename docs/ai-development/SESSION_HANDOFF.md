# SESSION HANDOFF

> Chế độ: **AUTONOMOUS DONE MODE** (D-015) — tự triển khai + tự commit từng chức năng; không push.
> Cập nhật: 08/11/2026.

## Commit đã tạo trong chế độ này

| Chức năng | Commit |
|---|---|
| P1A evidence schema + models | `a67819e` |
| P1B media storage + authorization | commit `feat(media)` (hash: `git log --oneline -1 -- backend/app/Services/MediaService.php`) |

## Vừa xong: P1B

- `app/Services/MediaService.php`: whitelist alias (`repair_order`, `quotation`, `inspection`), quy về phiếu sửa chữa để kiểm quyền; MIME thật (finfo) JPEG/PNG/WebP, ≤ 10 MB, ≤ 30 ảnh/đối tượng (lock), lưu `evidence/Y/m/uuid.ext` trên disk `local` (= storage/app/private), SHA-256; chặn thêm ảnh khi đối tượng đã có `customer_confirmations`.
- `MediaController`: `GET /api/media` (list), `GET /api/media/{media}` (stream, nosniff, private cache) — quyền `RepairOrderPolicy::view`; `POST /api/media` — chỉ ADVISOR + `RepairOrderPolicy::update`, throttle 60/phút.
- Test `MediaApiTest` 7/7. Suite 160/160.

## Tiếp theo: P1C (một commit `feat(confirmation)`)

- `ConfirmationService`:
  - `contentHash(Quotation)`: SHA-256 của JSON chuẩn hóa (id, version, status, total, items: id/type/ref/qty/unit_price/amount).
  - `requestOtp(quotation, advisorAccount)`: chỉ khi SENT; mã 6 số `random_int`, lưu `Hash::make`, TTL 10', gửi `ConfirmationOtpMail` tới email chủ xe (customer.email, fallback account.email); throttle route; vô hiệu OTP cũ cùng target (set used_at? → không: đánh dấu bằng attempts=MAX hoặc xóa? → **đặt `expires_at = now()`** cho OTP cũ chưa dùng).
  - `verifyOtpAndRespond(quotation, code, responses, witnessEmployee, request)`: kiểm OTP usable, so hash nội dung hiện tại với `content_sha256` của OTP (khác → 409/422), sai mã → attempts++; đúng → `used_at`, gọi lại logic phản hồi hiện có của khách (RepairOrderService / CustomerRepairOrderController::respondQuotation — tái sử dụng service, không nhân bản), tạo `CustomerConfirmation` EMAIL_OTP + witness.
  - Khách tự duyệt trong tài khoản (`POST /me/quotations/{id}/respond` hiện có): thêm ghi `CustomerConfirmation` METHOD_ACCOUNT (IP, UA, hash) — **không đổi** quy tắc duyệt/tính tiền.
- API: `POST /api/quotations/{quotation}/otp` (ADVISOR), `POST /api/quotations/{quotation}/verify-otp-response` (ADVISOR, body: code + responses). Tên theo roadmap P3 nhưng chức năng thuộc P1 (D-005, D-008).
- Test: `Mail::fake`; OTP sai 5 lần khóa; hết hạn; dùng lại bị từ chối; nội dung đổi sau khi gửi → thất bại; advisor không gọi được `/me/...`; xác nhận ACCOUNT được ghi.

## Cần PO

Trước P1D-03 (trình duyệt): cho `php artisan migrate` (chỉ thêm bảng) trên DB dev Laragon? Chưa trả lời → BROWSER_NOT_VERIFIED cho phần cần bảng mới.
