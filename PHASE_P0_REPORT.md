# PHASE P0 – BÁO CÁO

- **Nhánh:** `fix/apt` @ `d864927`. Chưa commit.
- **Phạm vi:** chỉ P0. Không triển khai P1–P7.
- **Ngày:** 08/11/2026.

## 1. Đối chiếu roadmap với code trước khi sửa

Roadmap P0 có 2 việc. Đối chiếu với code cho thấy **việc thứ nhất sai** và đã được hủy.

| Việc trong roadmap | Kết quả đối chiếu | Quyết định |
|---|---|---|
| Hóa đơn / xuất kho / tạo công việc gộp dòng đã duyệt của **mọi** báo giá | Trong code, mỗi phiên bản báo giá là **bản thay thế**: `createQuotation` cho tạo bản mới khi phiếu đang chờ duyệt, nhưng chặn khi đang sửa (`IN_PROGRESS`). Bản mới nhất vì vậy luôn chính là bản dùng để bắt đầu sửa, nên đọc `latestQuotation` là **đúng**. Nếu gộp mọi phiên bản, một báo giá lập lại sẽ bị **tính tiền hai lần** (ví dụ: v1 duyệt công 300.000 → v2 lập lại có cùng công → hóa đơn thành 600.000) | **Không sửa logic.** Thêm 2 test khóa hành vi đúng. Chuyển việc gộp sang P3, chỉ gộp `INITIAL` + `SUPPLEMENT`. Đã đính chính `BUSINESS_REQUIREMENTS_AUDIT.md` và `BUSINESS_IMPLEMENTATION_ROADMAP.md` |
| Gỡ đường "nhân viên xác nhận thay khách" | Đúng như phân tích. Route Advisor `POST /quotations/{id}/respond` tồn tại, nhưng `QuotationPolicy::respond` chỉ cho CUSTOMER nên luôn trả 403. Nút "Ghi nhận phản hồi tại quầy" trên giao diện Advisor vì vậy là chức năng hỏng, và tiềm ẩn nguy cơ bị "sửa" sai bằng cách nới quyền | **Triển khai** |

## 2. Công việc đã hoàn thành

1. **Backend:** gỡ route `POST /api/quotations/{quotation}/respond` khỏi nhóm ADVISOR, và gỡ method `QuotationController::respond` (không còn nơi nào gọi). Khách vẫn duyệt qua `POST /api/me/quotations/{id}/respond` (`CustomerRepairOrderController::respondQuotation`), không đổi.
2. **Frontend:**
   - `RepairOrderPanels.tsx`: gỡ nút "Ghi nhận phản hồi tại quầy", các ô tick "Đồng ý" và hàm `recordResponse`.
   - Bảng báo giá phía Advisor chỉ hiển thị kết quả khách đã chọn.
   - Ở trạng thái "Đã gửi", hiển thị hướng dẫn: chỉ khách được duyệt, trong tài khoản của mình.
3. **API client:** gỡ `workflowApi.respondQuotation` (`workflowService.ts`). Hàm `respondQuotation` của khách trong `customerApi.ts` giữ nguyên.
4. **Test mới:**
   - `RepairFlowTest::test_staff_cannot_respond_to_quotation_on_behalf_of_customer`: cố vấn gọi route cũ nhận 404; cố vấn gọi route của khách nhận 403; báo giá vẫn `SENT`, không dòng nào bị đánh dấu, phiếu vẫn `WAITING_APPROVAL`.
   - `RepairFlowTest::test_requote_replaces_previous_version_and_invoice_is_not_double_counted`: v1 duyệt một phần, v2 lập lại và duyệt toàn bộ → 1 công việc, hóa đơn **750.000** (không phải 1.050.000).
   - `RepairFlowTest::test_new_quotation_cannot_be_created_while_repair_is_in_progress`: trả 422, khóa điều kiện để logic hóa đơn đúng.
   - `frontend/tests/customer-approval-only.mjs` (`npm run test:approval`): giao diện, API client và route đều không còn đường duyệt thay khách; đường duyệt của khách vẫn còn.

## 3. File đã sửa

| File | Thay đổi |
|---|---|
| `backend/routes/api.php` | Gỡ 1 route, thêm chú thích |
| `backend/app/Http/Controllers/Api/QuotationController.php` | Gỡ method `respond` |
| `backend/tests/Feature/RepairFlowTest.php` | +3 test |
| `frontend/src/pages/advisor/RepairOrderPanels.tsx` | Gỡ chức năng ghi nhận tại quầy; bảng chỉ hiển thị |
| `frontend/src/services/workflowService.ts` | Gỡ `respondQuotation` |
| `frontend/tests/customer-approval-only.mjs` (mới), `frontend/package.json` | Smoke test mới + script `test:approval` |
| `BUSINESS_REQUIREMENTS_AUDIT.md`, `BUSINESS_IMPLEMENTATION_ROADMAP.md` | Đính chính phát hiện D4 / P0 |

## 4. API và database

- **API:** gỡ `POST /api/quotations/{quotation}/respond`. Route này vốn luôn trả 403 nên không có client hợp lệ nào bị ảnh hưởng.
- **Database:** **không thay đổi**. Không có migration.

## 5. Kết quả kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| Backend `php artisan test` (SQLite `:memory:`) | **146 / 146 đạt**, 634 assertion (trước P0: 143 / 605) |
| `RepairFlowTest` riêng | 13 / 13 |
| Pint `--test` (chỉ 3 file PHP đã sửa) | Đạt; không chạy định dạng lên file khác |
| `tsc -b` | Đạt |
| `vite build` | Đạt |
| ESLint (2 file frontend đã sửa) | 0 lỗi |
| Smoke test frontend | **14 / 14** (thêm `customer-approval-only.mjs`) |
| **Trình duyệt** (08/11/2026, P0-03) | **Đạt.** Edge headless, 1280×900, tài khoản `advisor.demo`, sáng + tối. Mở trang `/advisor/service-orders/{id}` với 4 phiếu **có sẵn** trong DB dev, mỗi phiếu ở một trạng thái báo giá: SENT (#10), REJECTED (#3), APPROVED (#5), chưa có báo giá (#1). Cả 8 lượt: không có nút "Ghi nhận phản hồi tại quầy", 0 ô tick trong bảng báo giá, 0 lỗi console, 0 request ghi dữ liệu. Phiếu SENT có hướng dẫn "Chỉ khách được đồng ý…"; cột "Khách" hiện "Chưa trả lời" / "✗ Từ chối" / "✓ Đồng ý" đúng dữ liệu. Đã xem ảnh chụp phiếu SENT ở cả 2 chế độ: hiển thị và tương phản đúng |

Không thao tác lên database thật; mọi test backend chạy trên SQLite trong bộ nhớ.

## 6. Hồi quy

- Luồng khách duyệt báo giá: không đổi. Các test `CustomerRepairOrderControllerTest`, `RepairFlowTest` (duyệt một phần / toàn bộ) và `customer-atelier-parity.mjs` vẫn đạt.
- Luồng gửi báo giá, bắt đầu sửa, hoàn thành, hóa đơn, thanh toán, bàn giao: không đổi; các test liên quan vẫn đạt.
- 81 file Phase 5 chưa commit: giữ nguyên, không bị ghi đè.

## 7. Lỗi còn lại và rủi ro

| # | Nội dung | Mức | Xử lý |
|---|---|---|---|
| 1 | Khách ở quầy mà không đăng nhập được thì hiện **không có cách duyệt** (trước P0 thì nút tại quầy cũng không chạy, nên không phải hồi quy) | Trung bình | P1: xác nhận bằng OTP email / ký tay |
| 2 | Lỗi gộp báo giá chỉ xuất hiện khi làm phát sinh | Cao **khi làm P3** | Đã có test khóa; P3 phải dùng `type = SUPPLEMENT` |
| 3 | Bàn giao xe chưa xác thực người nhận | Cao | P4 (ngoài phạm vi P0) |
| 4 | ~~Chưa kiểm tra trình duyệt~~ — đã kiểm 08/11/2026 (§5). Luồng khách tự duyệt **không** chạy lại trên trình duyệt vì code phía khách không đổi và việc bấm duyệt sẽ ghi dữ liệu thật trong DB dev; được bao phủ bởi test backend | Thấp | — |

## 8. Điều kiện nghiệm thu P0

- [x] Không còn route, method, API client hay nút nào cho nhân viên đánh dấu "khách đồng ý" (có test backend + smoke test).
- [x] Hóa đơn khớp tổng các dòng khách đã duyệt của bản báo giá có hiệu lực; không tính trùng khi báo giá lại (có test).
- [x] Không lập được báo giá mới khi đang sửa (có test).
- [x] Toàn bộ test cũ vẫn đạt (146/146 backend, 14/14 smoke).
- [x] Kiểm tra trình duyệt trang Chi tiết phiếu sửa chữa (Advisor): đạt, sáng + tối, 4 trạng thái báo giá (08/11/2026).
- [ ] PO nghiệm thu P0 và xác nhận T-001 (hủy mục "gộp mọi báo giá").

**DỪNG Ở P0.** Chưa commit, chưa push. Chờ phê duyệt trước khi sang P1.
