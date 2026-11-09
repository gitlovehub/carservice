# SESSION HANDOFF

> Chế độ: **AUTONOMOUS DONE MODE** (D-015) — tự triển khai + tự commit từng chức năng; không push.
> Cập nhật: 10/11/2026 — góp ý PO đợt 3 trang Admin (xong); chờ PO quyết B-05 "Chờ phụ tùng".

## Mới nhất: góp ý PO đợt 3 — tinh gọn bảng Admin (10/11/2026, nhánh v3) — PO chốt "tạm thời done trang admin"

- **Bảng chung (`DataTable`)**: bỏ dòng "Sắp xếp: … (giảm dần)" (xoá `SortStatus`); bấm dòng = mở chi tiết (Tab + Enter/Space), bỏ cột Thao tác trùng ở Phiếu sửa chữa, Hoá đơn, Khách hàng, Phụ tùng & kho (tab Tồn kho: bấm dòng = Nhập kho); thêm `evenColumns` (chia đều cột) + `actionsWidth`. `useTableSort` thêm `reset` / `isDefault`.
- **Bỏ sắp xếp** ở Tài khoản, Nhân sự, Khách hàng (luôn mới tạo nhất) và cột SĐT.
- **Nút "Xoá bộ lọc"** (`ClearFilters` trong AdminKit, chỉ hiện khi khác mặc định, đưa cả sort về mặc định): Lịch hẹn, Khách hàng, Tài khoản, Nhân sự, Hoá đơn (2 tab), Phiếu sửa chữa, Phụ tùng & kho (3 tab), Dịch vụ, Đánh giá, Nhật ký. PO bỏ ở Gói bảo dưỡng, Hãng & dòng xe.
- **Lịch hẹn**: bỏ cột Mã lịch; bỏ giờ "từ – đến" (giờ kết thúc chỉ là ước tính hệ thống) và "Loại yêu cầu" (hệ thống tự suy ra) ở bảng / lịch tuần / chi tiết / CSV / bộ lọc / form tạo lịch (form gửi `REPAIR` nếu chọn dịch vụ, ngược lại `DIAGNOSIS`); thêm cột "Tạm tính". Nút "Tuần này" đặt giữa ô tìm kiếm và chọn tuần, đỏ khi đang ở tuần hiện tại.
- **Hoá đơn**: tách cột Ngày lập (ngày + giờ 2 dòng), Thời gian giao dịch 2 dòng, cột chia đều.
- **Khách hàng**: bỏ cột Khu vực, địa chỉ (pane + form; địa chỉ cũ giữ nguyên khi sửa); khoá/mở khoá chuyển vào pane; form Thêm xe thay Biển số bằng ODO (km, không bắt buộc).
- **Dịch vụ**: bỏ cột danh mục trái → nút "Xem danh mục dịch vụ" mở `CategoryDrawer` (trượt phải: xem/lọc/sửa/thêm/xoá danh mục; thay `CategoryManagerModal`); 3 thẻ thống kê (API `service-categories.meta` thêm `active`, `visible`); bỏ cột #, bỏ kéo thả/đổi thứ tự (thứ tự hiện có giữ nguyên — PO chưa yêu cầu làm lại), bỏ sort tên; Giá / Thời gian 2 cột; Trạng thái = nhãn + công tắc; nút sửa gộp vào menu ⋯. **Bỏ "Phổ biến"** toàn hệ thống (cột, menu, form, thống kê, sort; nhóm "Phổ biến" trên trang đặt lịch khách) — cột `services.is_popular` giữ trong DB, không dùng.
- **Sửa lỗi**: sửa dịch vụ chỉ bật/tắt bị "The name has already been taken" do DB dev có tên trùng (Bảo dưỡng phanh 4 bánh ×3, Thay dầu động cơ ×2, Thay lọc gió điều hòa ×2). Form chỉ gửi `name` khi đổi; thông báo validate tiếng Việt. **Dữ liệu trùng chưa xử lý** — chờ PO cho phép đổi tên/gộp.
- **Hãng & dòng xe**: 4 thẻ thống kê (API mới `GET /api/admin/vehicle-catalog/summary`); cột số + trạng thái căn giữa, thao tác sát phải, cột chia đều.
- **Thông tin gara**: tạm đóng — trang hiện "đang nâng cấp, bảo trì" (`UNDER_MAINTENANCE = true` trong `GarageSettings.tsx`; form có chế độ Sửa → Lưu/Huỷ giữ nguyên bên dưới).
- **Chờ PO**: B-05 nghiệp vụ "Chờ phụ tùng" (`BLOCKERS.md`).
- **Kiểm thử**: build + ESLint file sửa đạt; backend test liên quan (BookingCatalog, AdminService, AdminCatalogRedesign) đạt. **Chưa kiểm trình duyệt** các thay đổi đợt này.

## Trước đó: góp ý PO đợt 2 — toast, báo cáo vận hành, đánh giá ga-ra, khung giờ đặt lịch (09/11/2026, nhánh v3)

Commit: `75de3cb` toast + hover nút icon · `2783927` nút duyệt xanh lá · `aec2557` Nhân sự bỏ cấp bậc + nút sửa trùng · `824c370` không xoá hãng/dòng xe · `3b8e4d3` Báo cáo (thu tiền + Vận hành) · `9763db6` Đánh giá ga-ra · `22fca58` khung giờ đặt lịch.

- **Toast duy nhất** (`FeedbackProvider`): trượt từ góc phải trên, tự tắt 3 giây, nút ✕, thanh tiến trình, không viền màu. `<Toast>` cũ chỉ còn là lớp chuyển tiếp sang `notify()`. Đã bỏ thông báo inline ở Dịch vụ, Gói, Thông tin gara, Bước chuẩn, Lịch hẹn admin/khách, Tiếp nhận, Giờ làm việc, Đặt lịch; nội dung toast nêu đúng thao tác (mã lịch, giờ, số khung giờ…).
- **Nút icon**: hover có viền + màu — sửa vàng, xem xanh dương, xoá đỏ, còn lại màu accent (`IconButton` gắn `data-icon`). Dropdown hover tô kín cả dòng. Tabs gạch chân hết thanh cuộn dọc thừa. ConfirmDialog có `variant: "success"`; mọi nút Duyệt/Xác nhận duyệt màu xanh lá.
- **Hãng/dòng xe không xoá được** (gỡ route DELETE; chỉ ẩn INACTIVE); phiên bản chưa dùng vẫn xoá được. Bỏ cột Nguồn.
- **Báo cáo**: thay `payment_methods` bằng `collection` (số hoá đơn, giá trị TB, đã thu/phát hành, còn phải thu) và `technicians` bằng `operations` (xe nhận/bàn giao/trong xưởng, thời gian xử lý TB, tỷ lệ đến đúng hẹn, khách quay lại, báo giá được duyệt, mức hài lòng). Tab mới "Vận hành".
- **Đánh giá = khách chấm ga-ra sau mỗi lần làm xe**: API bỏ tên KTV + điểm cố vấn/KTV, thêm thông tin lần làm (xe, biển số, phiếu, ngày, dịch vụ), lọc `status=unreplied|replied|hidden`, lọc từng mức sao, summary thêm TB 30 ngày / % hài lòng / % đã phản hồi. Form khách chỉ còn điểm chung + nhận xét. Cột `advisor_rating`, `technician_rating` vẫn giữ trong DB (nullable, không dùng).
- **Khung giờ đặt lịch sáng/chiều**: migration `2026_11_09_100000` thêm `garage_settings.booking_slots` (DB dev đã migrate). `GET /api/booking-slots` (công khai), `PUT /api/admin/booking-slots`. Trang Giờ làm việc có panel + nút "Chỉnh sửa khung giờ" (thay bản xem trước tự sinh). Đặt lịch của khách đọc khung giờ này và khoá giờ ngoài giờ làm việc của từng thứ (ngày nghỉ khoá hết).
- **Kiểm thử**: backend 272/272; smoke 27/27; tsc + build đạt; ESLint file sửa không thêm lỗi (còn nợ cũ `set-state-in-effect`). Trình duyệt 32/32 (16 trang Admin × sáng/tối) + chụp tab Vận hành, modal khung giờ, Nhân sự; hover sửa/xem/xoá đo bằng computed style.
- **Lưu ý dữ liệu dev**: giờ làm việc dev 08:00–16:00 nên khung mặc định 16:45 bị đánh dấu "ngoài giờ" trên panel — admin cần bỏ khung này (khách vốn đã không đặt được giờ đó). Khung giờ chưa được kiểm ở backend khi tạo lịch (cố vấn vẫn có thể đặt giờ tự do).

## Trước đó: Admin dùng dữ liệu thật (09/11/2026, nhánh v3)

Commit: `e5b5831` seeder vận hành · `e298ec0` API tổng quan + báo cáo · `ef717b9` factory tiếng Việt + chuẩn hoá dữ liệu mẫu · `7d3c70a` API phiếu/hoá đơn/thanh toán/đánh giá/nhật ký · `688a1c4` API khách hàng/nhân sự/tài khoản · `8f5c4c4` API kho · `1226ba6` API ngày nghỉ · FE: `cbbff5d` `1a773d1` `d4d0ed8` `147778e` (gỡ `src/mocks/admin`) · test `3854f3f`.

- **Dữ liệu**: `DemoOperationsSeeder` (chạy riêng: `php artisan db:seed --class=DemoOperationsSeeder`) — ~60 ngày lịch hẹn → phiếu (lịch sử trạng thái hợp lệ) → báo giá → công việc + xuất kho → hoá đơn → thanh toán → đánh giá + nhật ký; mã có `-DM`; chạy lại không trùng. `NormalizeSampleDataSeeder` (chạy riêng) đổi dữ liệu faker en_US cũ (email `@example.*`, dòng xe Latin, biển số `?`) sang tiếng Việt, cập nhật tại chỗ. Factory Customer/Vehicle/Employee/Account dùng `Database\Factories\Support\VietnameseData`. DB dev đã chạy cả hai: 221 lịch, 176 phiếu, 164 hoá đơn, 85 đánh giá, 399 nhật ký.
- **Migration mới**: `reviews.is_hidden`, `inventory_transactions.created_by_account_id` (DB dev đã migrate).
- **API Admin (role ADMIN)**: `dashboard`, `reports?period=`, `repair-orders(/{id})`, `invoices(/{id})`, `payments`, `reviews` (+ reply, ẩn), `audit-logs`, `customers(/{id}, /lock)`, `staff` (tạo/sửa), `accounts` (tạo, khoá/mở, gửi OTP đặt lại mật khẩu — `App\Services\PasswordResetService`, AuthController dùng chung), `parts` (+ nhập/xuất), `stock-moves`, `holidays` (theo khoảng ngày). Danh sách lọc + phân trang ở server, kèm `summary`.
- **FE**: `services/adminApi.ts`, `kit/useAdminQuery.ts` (tải theo khoá, không setState đồng bộ trong effect), `kit/useDebounced.ts`. 10 trang + HolidaysPanel nối API, có loading/lỗi/rỗng; thẻ số liệu giả được thay bằng số thật; nút demo không có backend được đổi thành chức năng thật (Xuất CSV hoá đơn, In báo cáo) hoặc bỏ ("Đổi vai trò"). Test `test:admin-real-data`.
- **Kiểm thử**: backend 267/267; smoke 27/27; tsc + build đạt. Trình duyệt 32/32 (16 trang × sáng/tối, không nhãn demo, không lỗi console/API).
- **Còn lại**: doanh thu Báo cáo theo hoá đơn phát hành, Tổng quan theo tiền đã thu (hai khái niệm khác nhau, đã ghi chú trên nhãn). Trang Lịch hẹn/Dịch vụ/Gói/Giờ làm/Gara vốn dùng API thật từ trước. Đổi vai trò tài khoản chưa có API riêng (làm qua trang Nhân sự).

## Trước đó: giao diện Admin mới — bản demo theo mockup (09/11/2026, gộp vào v3 dạng 1 commit, không kéo lịch sử fix/apt cũ)

- **Sidebar mới** (`layouts/navigation.ts`): ĐIỀU HÀNH Tổng quan · Lịch hẹn · Phiếu sửa chữa · Hoá đơn & thanh toán · Báo cáo /
  CON NGƯỜI Khách hàng · Nhân sự · Tài khoản · Đánh giá / DANH MỤC Dịch vụ · Gói bảo dưỡng · Phụ tùng & kho · Hãng & dòng xe /
  HỆ THỐNG Giờ làm việc & ngày nghỉ · Thông tin gara · Nhật ký hệ thống. `/admin/parts` → `/admin/inventory`;
  `/admin/advisor-activity` → tab "Hoạt động cố vấn" trong `/admin/audit-logs`.
- **Bộ khung** `pages/admin/kit/` (AdminKit, Charts SVG, format, usePaged). `DataTable` thêm `rowClassName`, `data-ui="table"`.
- **Dữ liệu demo** `src/mocks/admin/{people,operations,catalog}.ts` — kiểu bám bảng DB; trang demo có nhãn "Dữ liệu demo".
- **Trang demo (chưa API)**: Tổng quan, Báo cáo, Khách hàng, Nhân sự, Tài khoản, Phiếu sửa chữa, Hoá đơn, Đánh giá,
  Phụ tùng & kho, Nhật ký thao tác, Ngày nghỉ lễ (`HolidaysPanel`).
- **Giữ API thật**: Lịch hẹn, Dịch vụ, Gói bảo dưỡng, Giờ làm việc, Thông tin gara, Hoạt động cố vấn, **Hãng & dòng xe** (`/admin/vehicle-brands` → trang `VehicleCatalog` của v3, API `/api/admin/vehicle-{brands,models,trims}`; bản demo `VehicleBrands.tsx` không dùng; `/admin/vehicle-catalog` chuyển hướng về đây).
- **Tiếp theo**: viết API admin cho các trang demo, thay import `mocks/admin` bằng service.

## Trước đó: Danh mục xe 3 cấp từ CSV (09/11/2026, nhánh v3)

Commit: `00a4279` schema · `60a0cc1` seeder CSV · `2f2c1f3` API công khai + admin · `ff8c932` lưu model/trim vào hồ sơ xe + đặt lịch · `3134ed2` trang Admin + bộ chọn · `714d3ad` sửa 2 lỗi UI phát hiện khi kiểm trình duyệt · `5c8c52e` tích hợp Xe của tôi + Đặt lịch.

- **Không tạo bảng trùng**: dùng lại `vehicle_brands`, `vehicle_models` (đã có, được `vehicles.model_id`, gói bảo dưỡng, phụ tùng dùng); thêm `vehicle_trims` + `vehicles.trim_id` (nullable, `variant` cũ giữ nguyên) + cột `source` (CSV/ADMIN/NULL = có sẵn) + unique (brand_id, name) cho dòng xe (chỉ thêm khi dữ liệu chưa trùng). DB dev đã migrate + seed: 44 hãng, 265 dòng, 471 phiên bản; 31 xe cũ nguyên vẹn.
- **Seeder** `VietnamVehicleCsvSeeder` đọc `backend/database/data/vietnam_vehicles.csv` (471 dòng, 0 trùng, 0 lỗi): chỉ THÊM, không sửa/xóa → giữ dữ liệu/trạng thái admin; so khớp không phân biệt hoa/thường; dùng lại hãng/dòng có sẵn. Đã gọi trong `DatabaseSeeder`.
- **API**: công khai `GET /api/vehicle-catalog/brands`, `/brands/{id}/models`, `/models/{id}/trims`, `/search?q=` (chỉ ACTIVE, throttle 120/phút). Admin `/api/admin/vehicle-{brands,models,trims}` (role ADMIN): danh sách có đếm, lọc, phân trang; tạo/sửa/ẩn; **xóa bị chặn (422)** khi còn cấp con hoặc đang dùng ở hồ sơ xe (kể cả xe xóa mềm → lịch hẹn), gói bảo dưỡng, phụ tùng tương thích. Không cho đổi cấp cha.
- **Hồ sơ xe + đặt lịch**: nhận `model_id` + `trim_id` (`App\Support\VehicleCatalogSelection`): phiên bản phải thuộc dòng xe; khách chỉ chọn mới bản ghi ACTIVE, giữ được lựa chọn cũ đã bị ẩn; nhân viên được chọn dòng đã ẩn (xe đời cũ). Đường gửi tên cũ (`brand`/`model`, `model_name`) vẫn chạy.
- **Frontend**: `components/vehicle/SearchableSelect` (combobox tìm không dấu, bàn phím, loading/empty/lỗi + thử lại) + `VehicleSelector` (đổi hãng reset dòng+phiên bản, đổi dòng reset phiên bản). Dùng ở "Xe của tôi" (thêm + sửa) và bước 1 "Đặt lịch" (bỏ `BRAND_MODELS` viết cứng, bỏ danh sách 8 dòng Toyota). Trang Admin nay ở `/admin/vehicle-brands` (menu Danh mục → Hãng & dòng xe). Dùng Icon có sẵn, không dùng Font Awesome (dự án đang gỡ dần — UX M7).
- **Kiểm thử**: backend 246/246; smoke 26/26 (mới `test:vehicle-catalog`; sửa 1 assertion cũ trong `ui-contrast-regression` vốn khóa danh sách Toyota); tsc + build đạt; ESLint file sửa sạch (Cars.tsx còn 1 lỗi cũ `set-state-in-effect`). Trình duyệt (Chrome headless, chỉ đọc, 0 request ghi): 65/65 — Xe của tôi + Đặt lịch sáng/tối, Đặt lịch 390px tối, Admin sáng/tối/390px. Frontend dự án chạy ở **cổng 5174** (5173 là project khác).
- **Còn lại / chờ PO**: (1) Dòng xe cũ và CSV khác tên nên tồn tại song song, ví dụ "Mazda 2"/"Mazda2", "5 Series"/"Series 5", "Seltos"/"New Seltos" — không tự gộp (cấm suy đoán); admin có thể ẩn bản không dùng. (2) Trang cố vấn "Xe khách hàng" vẫn nhập `model_id` dạng số — chưa gắn bộ chọn. (3) Bộ lọc hãng/dòng trong Admin tải tối đa 100 mục mỗi cấp. (4) Tìm kiếm LIKE trên MySQL không phân biệt dấu (gõ "cho" ra cả "chỗ") — có ích, chấp nhận.

## Trước đó: Admin bỏ navy + lime, dùng đỏ thương hiệu theo theme (09/11/2026)

PO đổi quyết định: khu Admin **không còn luôn tối**. `tokens.css` khối `[data-area="admin"]` chỉ đổi accent (= `--cs-brand`, chữ trắng, nút primary đỏ đặc, không gradient) và sidebar (`--cs-sidebar-bg: var(--cs-surface)`, mục đang chọn `--cs-sidebar-active-bg #cf2935` / chữ trắng, bo 10px); nền/chữ/viền/trạng thái/bo góc dùng token chung theo `html[data-theme]`. `workspace.css`: bỏ mục chọn lime, ô tìm kiếm lime, badge lime, thẻ navy/tím; thẻ lối tắt + hàng Tiện ích thành thẻ trung tính, icon đỏ trên nền soft. `shell.css`: gỡ phần nhân bản ánh xạ dark cho Admin (giờ chỉ áp khi theme tối). `buttons.css`: bỏ nút icon tròn riêng Admin. Nút Admin không dùng success (Mở khóa, Duyệt → secondary + check); xanh lá chỉ còn ở badge trạng thái thành công. Đã cập nhật `docs/ui-button-redesign.md` (§1, §2, §3 Admin, §4), `tests/button-redesign.mjs`, `tests/workspace-theme-smoke.mjs` (kiểm tra sidebar Admin nền surface, mục chọn đỏ, không còn mã navy/lime). `grep -i "c8f53c|080c1a|0b1022|141a2e|lime|navy" frontend/src` → không còn. 24/24 `test:*`, tsc, build đạt; ESLint giữ nguyên nợ cũ (22 + 2). Trình duyệt: `/admin/maintenance-packages` và `/admin` ở theme sáng (sidebar trắng) và tối (sidebar `#191b1e`), mục chọn đỏ đặc chữ trắng, nút primary đỏ, không tràn ngang, không lỗi console, 0 request ghi.

## Trước đó: hệ thống nút theo vai trò (09/11/2026)

Commit: `afdc38c` token + biến thể · `cf7abcd` component dùng chung · `8ad4551` Advisor · `1c752e2` Admin + dashboard · `933a942` Customer · `ae76c54` buttonClass còn lại + Admin luôn tối + test.

- **Token** (`styles/tokens.css`): mỗi vai trò có `--cs-soft-hover`, `--cs-on-soft`, `--cs-btn-radius`, `--cs-card-radius`, `--cs-accent-fill`; Admin **luôn tối** (navy `#0b1022`, lime `#c8f53c`, nút chính gradient lime chữ navy, bo viên thuốc 999px, card 24px, success kiểu tonal xanh).
- **Nút** (`buttons.css`, `buttonClass.ts`, `Button.tsx`): thêm `tonal`; `tone="danger"` cho nút icon Xóa chữ đỏ; disabled dùng token (không còn chỉ mờ); loading opacity .8; giữ alias `.cs-unified-*`. Icon mới: arrow-right/left, x, send, cash, printer, download, lock, key, grid.
- **Dùng chung**: ConfirmDialog nút danger luôn có icon (trash cho xóa, X cho hủy/đóng/từ chối; `confirmIcon` tùy chọn); Pagination outline, trang hiện tại tonal; Admin: sidebar mục chọn lime, ô tìm kiếm viên thuốc viền lime, badge `ACTIVE` lime (`data-status` trên StatusBadge), card 24px.
- **Trang**: ánh xạ theo §3 đặc tả (Customer: đặt lịch, báo giá, VNPay, xe, lịch hẹn, đánh giá, liên hệ; Advisor: phiếu sửa chữa các bước, tiếp nhận, lịch hẹn, khách/xe; Admin: tài khoản, dịch vụ, gói, kho, giờ làm việc, lịch hẹn, khách). Dashboard Admin: lưới 4 thẻ lối tắt 2 cột (navy/tím) + hàng "Tiện ích" 4 nút tròn 60px (route có sẵn).
- **Thay đổi hiển thị có chủ ý** (không đổi API/logic gọi): "Bàn giao xe cho khách" hiện ngay khi phiếu COMPLETED nhưng **khóa** tới khi hóa đơn PAID; nút cuối luồng đặt lịch đổi chữ "Đặt lịch" → "Xác nhận đặt lịch"; "Xác nhận duyệt báo giá" → "Đồng ý báo giá".
- **Chưa làm theo đặc tả**: "Đóng phiếu" chưa chuyển vào Dropdown "Thao tác khác" (hiện là danger-outline + X cạnh thông báo khách từ chối, vẫn qua ConfirmDialog) — cần chuyển state `closeDeclined` lên trang chi tiết. Còn 83 `<button>` tự viết trong `pages/**` (chủ yếu tab, chip, thẻ chọn dịch vụ/khung giờ, trang auth, Dashboard khách); các nút hành động đã dùng `Button`/`IconButton`/`buttonClass()`. Nhiều class màu hex cũ trong trang vẫn còn (được ánh xạ sang token qua `shell.css`); chưa gỡ hết.
- **Test**: thêm `tests/button-redesign.mjs` (`npm run test:buttons`); sửa `workspace-theme-smoke.mjs` (sidebar Admin `#080c1a` thay màu cũ). 24/24 script `test:*` đạt, `tsc -b` + build đạt; ESLint giữ nguyên nợ cũ (22 `set-state-in-effect` + 2 `exhaustive-deps`), không lỗi mới.
- **Trình duyệt** (CDP, chỉ đọc, 0 request ghi): Customer `/customer/cars`, `/quotation`, `/customer/appointments`, `/customer/booking`; Advisor `/advisor`, `/advisor/appointments`, `/advisor/customer-cars`; Admin `/admin`, `/admin/accounts`, `/admin/services` — màu/bo góc đúng đặc tả, không tràn ngang, không lỗi console. Đã phát hiện và sửa: trang Admin cũ còn thẻ trắng do ánh xạ màu sáng chỉ áp ở dark theme → mở rộng cho khu Admin. BROWSER_NOT_VERIFIED: các panel phiếu sửa chữa (Bước 2–5), modal báo giá khách, trang thanh toán (cần dữ liệu phù hợp).

## Nhánh làm việc: `v3` (09/11/2026)

PO chuyển sang làm trên `v3`. Lịch sử `v3` đã viết lại (bỏ 25 commit tác giả Claude ngày 02/11, code giữ nguyên) và force push; `origin/v3` = `f83c641` (xóa `backend/.claude`, `backend/CLAUDE.md`). Hash commit liệt kê bên dưới là hash cũ trên `fix/apt`, trên `v3` đã đổi. Không ghi `Co-Authored-By`/link claude.ai vào commit hay file. Backup cục bộ: nhánh `v3-backup-truoc-xoa-claude` (chưa push).

## Commit (fix/apt, hash cũ)

P1: `a67819e` `b533524` `26389df` `7452c1a` · P2: `b9e40cb` `6fe0f37` `9f51b4c` · QA-01: `b237658` · P3: `2d64bd2` `0967552` `8fb42fa` · P4: `1b37879` `2468b81` · P5: `47eef0d` `09a3a0c` `da44e68` · P6: `31f7214` `bf5f429` · P7: `d734ffa` `2f58501` · docs: `51beadc`.

DB dev local đã migrate tới `2026_11_08_160000` (D-016).

## Kiểm thử gần nhất

Backend **211/211** · smoke **21/21** · tsc + build đạt · ESLint không tăng so với trước (nợ cũ 22 lỗi `set-state-in-effect` vẫn còn — UX-06).
Trình duyệt: hồi quy chỉ đọc đạt ở mỗi phase; nhiều panel mới BROWSER_NOT_VERIFIED (dữ liệu dev không có phiếu phù hợp; tránh tạo dữ liệu giả / gửi email thật). Admin không đăng nhập được bằng script (không có mật khẩu admin demo).

## Quyết định kỹ thuật chờ PO (không chặn)

T-002 không giảm giá phát sinh · T-003 dịch vụ nhanh chỉ gồm dịch vụ niêm yết · T-004 lịch không rõ thời lượng = 60 phút.

## Còn lại

1. **UX-01..09** (`FINAL_UI_UX_AUDIT_AFTER_PHASE5.md` §5): H4 nút trong bảng/form cũ → `Button`; M3 gộp Toast → `notify()`; M6 lưới mobile + vùng bấm; M2 `PageHeader` trang khách; M7 gỡ Font Awesome/emoji; 22 lỗi ESLint `set-state-in-effect`; tách bundle theo route; L6–L8; đo lại tương phản dark. Làm từng mục một, mỗi mục một commit; không đổi nghiệp vụ.
2. **P3-FE-H**: giao diện lịch sử duyệt từng dòng (dữ liệu đã có).
3. **FINAL-01**: chạy toàn bộ test, security review nhanh (route mới: quyền, throttle, rò rỉ dữ liệu khách), kiểm trình duyệt có thể, rồi tạo `FINAL_IMPLEMENTATION_REPORT.md` (danh sách chức năng + commit, migration/API mới, test, lỗi còn lại, quyết định chờ duyệt, bảo mật, trình duyệt, mức sẵn sàng demo).

Gợi ý thứ tự: FINAL-01 trước (để PO có báo cáo tổng sớm), rồi UX theo mức ảnh hưởng demo.
