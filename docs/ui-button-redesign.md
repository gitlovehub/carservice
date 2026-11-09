# Đặc tả: Thiết kế lại hệ thống nút theo vai trò (đã duyệt)

Cập nhật 09/11/2026: Admin bỏ phong cách navy + lime luôn tối, dùng hệ màu cơ bản đỏ thương hiệu theo theme.
File này là nguồn sự thật để triển khai vào code. Phạm vi: **toàn bộ giao diện web của cả 3 tác nhân**
(Customer, Advisor, Admin) trong `frontend/src`.

## 0. Nguyên tắc chung

1. Màu nút chính đi theo vai trò; màu trạng thái dùng chung:
   - **Xanh lá = tiền & hoàn tất** (Success).
   - **Đỏ đậm = xóa / hủy / đóng phiếu** (Danger).
2. Mỗi khối thao tác chỉ có **tối đa MỘT nút primary**, đặt cuối hàng bên phải. Nút quan trọng thứ hai dùng **Tonal** (mới).
3. Nút xóa/hủy **luôn có icon** (trash hoặc X). Nút danger nền đặc chỉ xuất hiện **trong hộp thoại xác nhận**;
   ngoài danh sách dùng `danger-outline` hoặc icon ghost màu đỏ.
4. Nút bước tiếp theo của luồng (Tiếp tục, Hoàn tất chẩn đoán…) có icon mũi tên phải `iconRight="arrow-right"`.
5. Trạng thái vô hiệu dùng token `--cs-disabled-bg` / `--cs-disabled-fg` thay vì chỉ `opacity: .5`.
6. Không viết mã hex trong component. Mọi màu đi qua token trong `src/styles/tokens.css`.
7. Không đổi logic nghiệp vụ, API hay route. Chỉ đổi style, variant và icon của nút.

## 1. Token theo vai trò (`src/styles/tokens.css`)

Thêm vào mỗi vai trò các token: `--cs-accent`, `--cs-accent-hover`, `--cs-accent-contrast`, `--cs-soft`,
`--cs-soft-hover` (mới), `--cs-on-soft` (mới), `--cs-focus`, `--cs-btn-radius` (mới).

| Token | Customer (đỏ) | Advisor (vàng đồng) | Admin (đỏ thương hiệu) |
|---|---|---|---|
| accent | `#cf2935` | `#8f6624` | `var(--cs-brand)` = `#cf2935` |
| accent-hover | `#b3222d` | `#7a561e` | `var(--cs-brand-hover)` = `#b3222d` |
| accent-contrast (chữ trên nút chính) | `#ffffff` | `#ffffff` | `#ffffff` |
| soft (nền Tonal) | `#fff1f1` | `#fbf2de` | `var(--cs-brand-soft)` |
| soft-hover | `#ffe1e3` | `#f3e3bd` | mặc định chung (`#ffe1e3`; tối `#4a2a2f`) |
| on-soft (chữ Tonal) | `#a51f29` | `#6e4e1a` | mặc định chung (`#a51f29`; tối `#ffb3ba`) |
| focus | `#cf2935` | `#8f6624` | `#cf2935` |
| btn-radius | `11px` | `11px` | `11px` (mặc định chung) |

Giữ nguyên các giá trị dark-mode hiện có của Customer và Advisor; thêm `--cs-soft-hover` và `--cs-on-soft` tương ứng
cho dark mode (gợi ý: Customer `#4a2a2f` / `#ffb3ba`, Advisor `#3b301d` / `#f0d08f`).

### Admin = hệ màu cơ bản, theo theme sáng/tối

`[data-area="admin"]` **chỉ** đổi nhóm accent và sidebar. Nền, chữ, viền, trạng thái, bo góc nút/card dùng token chung
và tự đổi theo `html[data-theme]` (không ép `color-scheme`, không gradient, không viên thuốc 999px, không card 24px).

| Token | Giá trị Admin |
|---|---|
| `--cs-accent` / hover | `var(--cs-brand)` (#cf2935) / `var(--cs-brand-hover)` |
| `--cs-accent-contrast` | `#fff` — nút primary nền đỏ đặc, chữ trắng |
| `--cs-soft` | `var(--cs-brand-soft)` |
| `--cs-accent-text` (theme tối) | `#ff7d85` (đỏ đọc được trên nền tối) |
| `--cs-sidebar-bg` | `var(--cs-surface)` — trắng ở theme sáng, surface tối ở theme tối; viền phải `--cs-border` |
| Chữ sidebar / tiêu đề nhóm / hover | `--cs-text-2` / `--cs-muted` / nền `--cs-hover` |
| Mục đang chọn (`--cs-sidebar-active-bg/fg`) | nền đỏ đặc `#cf2935`, chữ + icon trắng, bo `10px` (cả hai theme) |
| Ô tìm kiếm | style chung (`SearchInput`), không style riêng |
| Thẻ lối tắt dashboard | thẻ trung tính `--cs-surface` + viền `--cs-border`, icon màu nhấn trên nền `--cs-soft` |

Xanh lá ở khu Admin **chỉ** dùng cho badge trạng thái thành công ("Đang áp dụng", "Đã thanh toán"…) dạng chấm + chữ
trên nền nhạt (`Badge tone="success"`). Nút ở Admin không dùng biến thể success (Mở khóa, Duyệt = secondary + icon check).

## 2. Hệ thống nút (`src/styles/buttons.css` + `components/ui/buttonClass.ts` + `Button.tsx`)

`ButtonVariant` mới: `"primary" | "tonal" | "secondary" | "outline" | "ghost" | "success" | "danger-outline" | "danger"`.

| Variant | Mặc định | Hover | Khi dùng |
|---|---|---|---|
| primary | nền accent đặc, chữ accent-contrast | accent-hover | Hành động chính, tiến bước trong luồng. Tối đa 1 nút mỗi khối. |
| **tonal (mới)** | nền soft, chữ on-soft, viền trong suốt | soft-hover | Hành động quan trọng thứ hai: Thêm xe, Gửi báo giá, Phân quyền, Thêm hạng mục. |
| secondary | surface-2, viền border | hover, viền border-strong | Quay lại, Làm mới, Hủy trong hộp thoại. |
| outline | trong suốt, viền border-strong | nền surface-2, **viền đổi sang focus (màu vai trò)** | Xem chi tiết, In, Lọc, Xuất file. |
| ghost | trong suốt, chữ text-2 | nền hover, chữ text | Thao tác trong dòng bảng / toolbar. |
| success | nền `#15803d` chữ trắng (kiểu chung) | đậm hơn | Customer/Advisor: Đồng ý báo giá, Đã nhận tiền mặt, Bàn giao xe, Xuất kho. Admin không dùng. |
| danger-outline | trong suốt, chữ danger, viền danger 45% | nền danger-soft | Từ chối, Bỏ, Khóa tài khoản: đặt cạnh nút chính. |
| danger | nền danger-solid chữ trắng | danger-solid-hover | Xóa vĩnh viễn, Hủy lịch hẹn, Đóng phiếu: **chỉ trong ConfirmDialog**. |

- `border-radius: var(--cs-btn-radius)` cho mọi `.cs-btn` (11px cho cả ba vai trò).
- Icon xóa trong dòng: chữ `--cs-danger`; khi hover thì nền `--cs-danger-soft` và viền danger.
- Kích thước giữ nguyên: sm 32 / md 40 (44 trên điện thoại) / lg 48. Icon 14 / 16 / 18.
- Focus: `outline: 2px solid var(--cs-focus); outline-offset: 2px`.
- Disabled: `background: var(--cs-disabled-bg); color: var(--cs-disabled-fg); border-color: var(--cs-disabled-bg)`, bỏ `opacity`.
- Loading (`aria-busy`): giữ vòng quay hiện có, `opacity: .8`.
- Giữ các alias `.cs-unified-*` để không vỡ trang cũ.

## 3. Ánh xạ nút theo màn hình

### Customer (`pages/customer/*`, `AtelierPublic`, `CustomerHeader`/`Topbar`)
- Booking từng bước: `Quay lại` = secondary + icon back (trái); `Tiếp tục` / `Xác nhận đặt lịch` = primary **lg** + mũi tên (phải).
- Quotation: `Từ chối` = danger-outline + icon X; `Đồng ý báo giá` = **success** lg + icon check (không dùng đỏ).
- Payment: `Thanh toán qua VNPay` = primary lg block; `Xem chi tiết hóa đơn` = outline block.
- Cars: `Thêm xe` = tonal + plus; Sửa = IconButton ghost; Xóa = IconButton ghost chữ danger → mở ConfirmDialog.
- Appointments: `Hủy lịch hẹn` = danger-outline; trong ConfirmDialog là danger.
- Reviews / Contact: `Gửi` = primary.

### Advisor (`pages/advisor/*`, `WorkflowUI`, `RepairOrderPanels`)
- Nút chuyển bước của phiếu sửa chữa (`workflowApi.transition`: Hoàn tất chẩn đoán, Bắt đầu sửa chữa…) = primary + mũi tên. Mỗi panel chỉ có một nút như vậy.
- `Lưu nháp` / `Lưu kết quả kiểm tra` = secondary; `Lưu đề xuất bổ sung` = secondary.
- `Gửi báo giá cho khách` = primary + icon send; `Thêm hạng mục` = tonal.
- Hạng mục phát sinh: `Bỏ` = danger-outline sm; `Giữ` = tonal sm.
- `In phiếu sửa chữa` = outline sm ở header; `Đóng phiếu` chuyển vào Dropdown "Thao tác khác" (•••) → ConfirmDialog danger.
- `Xác nhận đã nhận tiền mặt` = success + icon cash; `Tạo mã VNPay` = outline.
- `Bàn giao xe cho khách` = success lg, **disabled** đến khi đã thu tiền.
- Dòng lịch hẹn: `Chi tiết` = ghost sm; `Tiếp nhận` = primary sm. `Từ chối` = danger-outline sm.
- `Xuất kho`: primary hoặc success tuỳ ngữ cảnh hoàn tất (ưu tiên success).

### Admin (`pages/admin/*`, layout workspace khi `data-area="admin"`)
- Toàn khu: nền trung tính theo theme sáng/tối như Customer; màu nhấn đỏ thương hiệu; sidebar theo theme (sáng: nền trắng),
  mục đang chọn nền đỏ đặc chữ trắng.
- Toolbar bảng: `Lọc`, `Xuất file`, `Tìm kiếm` = outline; `Thêm …` = primary đỏ đặc (Thêm dịch vụ, Thêm gói, Tạo tài khoản, Nhập phụ tùng…).
- Dòng bảng: Xem/Sửa = IconButton ghost; Xóa/Ẩn = IconButton chữ đỏ → ConfirmDialog (`Hủy` secondary, `Xóa vĩnh viễn` danger + trash).
- Accounts / Khách hàng: thao tác trong `Dropdown` (⋯): `Khóa` = mục danger + icon khóa → ConfirmDialog; `Mở khóa`/`Kích hoạt` = mục thường.
- Lịch hẹn: `Duyệt` = secondary + check; `Hủy` = danger-outline + X; `Tiếp nhận` = primary sm.
- Dashboard admin (`pages/admin/AdminDashboard.tsx`): 4 thẻ số liệu (`StatCard`), biểu đồ doanh thu 30 ngày + donut phiếu theo
  trạng thái, bảng "Lịch hẹn sắp tới" và "Cảnh báo tồn kho thấp"; bộ chọn Hôm nay / 7 ngày / 30 ngày (`Tabs` segment).
- Bộ khung dùng chung `pages/admin/kit/`: `AdminPage` (tiêu đề + nhãn "Dữ liệu demo"), `StatCard`, `Panel`, `Tabs`
  (gạch chân / phân đoạn / chip đếm), `FilterSelect`, `Person`/`Avatar`, `Pill`, `Progress`, `Toggle`, `Stars`,
  `SplitView` (danh sách + ngăn chi tiết; < 1280px mở Drawer), biểu đồ SVG `BarChart` / `AreaChart` / `DonutChart`.
  Token riêng: `--cs-chart-1..6`, `--cs-tint-*`, `--cs-violet*`.
- Trang chạy dữ liệu mẫu (`src/mocks/admin/*`) phải hiện nhãn "Dữ liệu demo"; khi nối API truyền `demo={false}` cho `AdminPage`.
- Badge trạng thái: dùng `Badge` chung (chấm + chữ trên nền nhạt); xanh lá chỉ cho trạng thái thành công.

### Dùng chung
- `ConfirmDialog` / `confirmPresets.ts`: nút xác nhận xóa/hủy = danger + icon trash/X; nút còn lại = secondary.
- `Pagination`: outline sm; trang hiện tại = tonal.
- `PageHeader` actions: tuân thủ "1 primary".
- Thay các `<button className="...">` tự viết trong `pages/**` bằng `<Button>` / `<IconButton>` / `buttonClass()`.

## 4. Độ tương phản (bắt buộc đạt WCAG AA)
- Chữ trắng trên `#cf2935` (~5:1, nút primary và mục sidebar đang chọn của Customer/Admin), trên `#8f6624` (~5:1): đạt.
- Chữ đỏ trên nền tối dùng `--cs-accent-text: #ff7d85` (≥ 5:1).
- Chạy `npm run test:contrast` sau khi đổi token.

## 5. Kiểm tra trước khi xong
Từ thư mục `frontend/`:
```
npm run lint
npx tsc -b
npm run test:components
npm run test:contrast
npm run test:workspace
npm run test:layout
npm run test:nav
npm run test:buttons
```
Nếu test nào kiểm tra class hay màu cũ (ví dụ admin dùng đỏ), cập nhật test cho khớp đặc tả này; **không** skip test.
Ghi tóm tắt thay đổi vào `docs/ai-development/SESSION_HANDOFF.md`.
