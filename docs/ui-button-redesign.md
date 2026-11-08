# Đặc tả: Thiết kế lại hệ thống nút theo vai trò (đã duyệt)

Bản thiết kế đã được duyệt: https://claude.ai/artifact/YWPyvoc1XFtVTuCm3Jxwjw
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

| Token | Customer (đỏ) | Advisor (vàng đồng) | Admin (navy + lime neon) |
|---|---|---|---|
| accent | `#cf2935` | `#8f6624` | `#c8f53c` |
| accent-hover | `#b3222d` | `#7a561e` | `#b5e52c` |
| accent-gradient (mới) | — | — | `linear-gradient(135deg, #e2fb5a 0%, #9be86a 100%)` |
| accent-gradient-hover | — | — | `linear-gradient(135deg, #d2f040 0%, #84dc56 100%)` |
| accent-contrast (chữ trên nút chính) | `#ffffff` | `#ffffff` | `#0b1022` |
| soft (nền Tonal) | `#fff1f1` | `#fbf2de` | `#26301f` |
| soft-hover | `#ffe1e3` | `#f3e3bd` | `#313d24` |
| on-soft (chữ Tonal) | `#a51f29` | `#6e4e1a` | `#d8f86a` |
| focus | `#cf2935` | `#8f6624` | `#c8f53c` |
| btn-radius | `11px` | `11px` | `999px` (viên thuốc) |

Giữ nguyên các giá trị dark-mode hiện có của Customer và Advisor; thêm `--cs-soft-hover` và `--cs-on-soft` tương ứng
cho dark mode (gợi ý: Customer `#4a2a2f` / `#ffb3ba`, Advisor `#3b301d` / `#f0d08f`).

### Admin = khu luôn tối (bất kể theme sáng/tối)

`[data-area="admin"]` ghi đè **toàn bộ** token nền, chữ, viền, trạng thái sang bộ navy sau. Áp dụng cả khi
`html[data-theme="light"]`; đặt `color-scheme: dark` cho khu này.

| Token | Giá trị Admin |
|---|---|
| `--cs-bg` | `#0b1022` |
| `--cs-surface` | `#141a2e` |
| `--cs-surface-2` | `#232a3f` |
| `--cs-hover` | `#2c3450` |
| `--cs-border` | `#232a3f` (viền nút: `rgba(255,255,255,0.10)`) |
| `--cs-border-strong` | `rgba(255,255,255,0.24)` |
| `--cs-text` / `--cs-text-2` / `--cs-muted` | `#f4f6fb` / `#c3c9d8` / `#aab2c5` |
| `--cs-disabled-bg` / `--cs-disabled-fg` | `#1d2234` / `#6b7287` |
| `--cs-danger` (chữ/viền) / `--cs-danger-soft` | `#ff8a8a` / `#3a1f2a` |
| `--cs-danger-solid` / hover | `#d93a3a` / `#e85050` |
| Success (Admin dùng kiểu tonal) | nền `#123524`, hover `#174530`, chữ `#6ee7a0`, viền `rgba(110,231,160,0.35)` |
| `--cs-sidebar-bg` | `#080c1a`; `--cs-sidebar-accent: #c8f53c` |
| Ô tìm kiếm | nền `#121933`, viền `rgba(200,245,60,0.35)`, bo `999px`, icon lime |
| Thẻ lối tắt | navy `#161d36` hoặc tím `linear-gradient(120deg, #4a2a8f 0%, #1b1f40 85%)`, bo `24px`, icon lime trong ô `#26301f` |
| Card / section | bo góc `24px` |

Màu xanh lá của Success ở khu Admin phải là kiểu **tonal** (nền tối, chữ xanh), để khác hẳn nút chính lime chữ tối.

## 2. Hệ thống nút (`src/styles/buttons.css` + `components/ui/buttonClass.ts` + `Button.tsx`)

`ButtonVariant` mới: `"primary" | "tonal" | "secondary" | "outline" | "ghost" | "success" | "danger-outline" | "danger"`.

| Variant | Mặc định | Hover | Khi dùng |
|---|---|---|---|
| primary | nền accent (Admin: gradient), chữ accent-contrast | accent-hover / gradient-hover | Hành động chính, tiến bước trong luồng. Tối đa 1 nút mỗi khối. |
| **tonal (mới)** | nền soft, chữ on-soft, viền trong suốt | soft-hover | Hành động quan trọng thứ hai: Thêm xe, Gửi báo giá, Phân quyền, Thêm hạng mục. |
| secondary | surface-2, viền border | hover, viền border-strong | Quay lại, Làm mới, Hủy trong hộp thoại. |
| outline | trong suốt, viền border-strong | nền surface-2, **viền đổi sang focus (màu vai trò)** | Xem chi tiết, In, Lọc, Xuất file. |
| ghost | trong suốt, chữ text-2 | nền hover, chữ text | Thao tác trong dòng bảng / toolbar. |
| success | Customer/Advisor: nền `#15803d` chữ trắng; Admin: tonal xanh | đậm hơn | Đồng ý báo giá, Đã nhận tiền mặt, Bàn giao xe, Duyệt nhập kho, Kích hoạt. |
| danger-outline | trong suốt, chữ danger, viền danger 45% | nền danger-soft | Từ chối, Bỏ, Khóa tài khoản: đặt cạnh nút chính. |
| danger | nền danger-solid chữ trắng | danger-solid-hover | Xóa vĩnh viễn, Hủy lịch hẹn, Đóng phiếu: **chỉ trong ConfirmDialog**. |

- `border-radius: var(--cs-btn-radius)` cho mọi `.cs-btn`. Admin là `999px`, nên nút icon (`.cs-btn-icon`) thành hình tròn.
- Ở Admin, nút icon ghost có nền mặc định `--cs-surface-2` (vòng tròn xám xanh). Icon xóa trong dòng: chữ `--cs-danger`; khi hover thì nền `--cs-danger-soft` và viền danger.
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

### Admin (`pages/admin/*`, `AdminHubNav`, layout workspace khi `data-area="admin"`)
- Toàn khu: nền navy, card `#141a2e` bo 24px, sidebar `#080c1a` với mục đang chọn màu lime.
- Toolbar bảng: `Lọc`, `Xuất file` = outline viên thuốc; `Thêm …` = primary gradient lime (Thêm dịch vụ, Thêm gói, Thêm tài khoản, Nhập kho…).
- Dòng bảng: Sửa = IconButton tròn; Xóa = IconButton tròn chữ đỏ → ConfirmDialog (`Hủy` secondary, `Xóa vĩnh viễn` danger + trash).
- Accounts: `Khóa` = danger-outline; `Kích hoạt` = success (tonal xanh); `Phân quyền` = tonal lime.
- Dashboard admin: thêm lưới **thẻ lối tắt** 2 cột (Dịch vụ & gói, Kho phụ tùng, Tài khoản, Báo cáo), đó là `<Link>` dạng thẻ, xen kẽ navy/tím, icon lime bên phải. Thêm hàng "Tiện ích" gồm nút icon tròn 60px kèm nhãn dưới (Lịch hẹn, Nhập kho, Giờ làm việc, Gói bảo dưỡng), trỏ tới route có sẵn.
- Badge trạng thái ở Admin: "đang hoạt động" = nền `#26301f` chữ `#d8f86a`; trung tính = nền `#232a3f` chữ `#c3c9d8`.
- Ô tìm kiếm Admin: bo viên thuốc, viền lime mờ, icon lime.

### Dùng chung
- `ConfirmDialog` / `confirmPresets.ts`: nút xác nhận xóa/hủy = danger + icon trash/X; nút còn lại = secondary.
- `Pagination`: outline sm; trang hiện tại = tonal.
- `PageHeader` actions: tuân thủ "1 primary".
- Thay các `<button className="...">` tự viết trong `pages/**` bằng `<Button>` / `<IconButton>` / `buttonClass()`.

## 4. Độ tương phản (bắt buộc đạt WCAG AA)
- Chữ trắng trên lime: **không dùng**. Dùng `#0b1022` trên lime (khoảng 14:1).
- Chữ trắng trên `#cf2935` (~5:1), trên `#8f6624` (~5:1), trên `#d93a3a` (~4.6:1): đạt.
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
```
Nếu test nào kiểm tra class hay màu cũ (ví dụ admin dùng đỏ), cập nhật test cho khớp đặc tả này; **không** skip test.
Ghi tóm tắt thay đổi vào `docs/ai-development/SESSION_HANDOFF.md`.
