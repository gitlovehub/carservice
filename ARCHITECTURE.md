# ARCHITECTURE – CarService Frontend

Tài liệu cho lập trình viên hoặc AI mới vào dự án: **sửa cái gì thì mở file nào**.
Frontend: React 19 + Vite + TypeScript + Tailwind CSS v4 (`frontend/`). Backend: Laravel (`backend/`), giao tiếp qua `/api`.

---

## 1. Cấu trúc thư mục `frontend/src`

| Thư mục / file | Vai trò |
|---|---|
| `App.tsx` | Toàn bộ route. Bọc theo thứ tự `ThemeProvider → AuthProvider → AppErrorBoundary → FeedbackProvider` |
| `main.tsx` | Điểm vào; nạp `index.css` và `styles/buttons.css` |
| `index.css` | Nạp Tailwind và `styles/tokens.css`; khai báo thang chữ, bo góc, bóng (`@theme`) và màu token (`@theme inline`) |
| `styles/tokens.css` | **Nguồn duy nhất của màu**: sáng/tối, màu nhấn theo vai trò, trạng thái |
| `styles/buttons.css` | Style duy nhất cho nút (`.cs-btn` và các biến thể) |
| `layouts/` | `PublicLayout` (trang công khai + Customer), `AppShell` (`WorkLayout` cho Advisor/Admin), `navigation.ts` (menu, breadcrumb), `workspace.css` |
| `components/ui/` | **Thư viện component dùng chung**; import qua `components/ui` (`index.ts`) |
| `config/status.ts` | Nhãn tiếng Việt + màu của mọi trạng thái nghiệp vụ |
| `config/labels.ts` | Nhãn giao diện dùng chung (Lưu, Hủy, Đang tải…) |
| `contexts/` | `AuthContext` + `authSession.ts` (`useAuthSession`), `ThemeContext` + `theme.ts` (`useTheme`) |
| `hooks/useAsyncAction.ts` | Chuẩn thao tác gọi API: xác nhận → đang xử lý → thông báo, chống gửi lặp |
| `services/` | Gọi API: `api.ts` (axios, token, chuẩn hóa lỗi tiếng Việt), `customerApi.ts`, `workflowService.ts`, `advisorAppointmentService.ts` |
| `pages/{customer,advisor,admin,auth,shared}` | Trang theo vai trò |
| `tests/*.mjs` | Smoke test tĩnh (`npm run test:*`) |

## 2. Routing và bố cục theo vai trò

| Vai trò | Tiền tố | Layout | Điều hướng |
|---|---|---|---|
| Khách vãng lai / Customer | `/`, `/customer/*`, `/booking`, `/repair-status`… | `PublicLayout` → `CustomerLayout` | Header `AtelierPublicHeader` (`components/AtelierPublic.tsx`) |
| Advisor | `/advisor/*` | `AdvisorLayout` = `WorkLayout area="advisor"` | Sidebar từ `navigation.ts` (`advisor`) |
| Admin | `/admin/*` | `AdminLayout` = `WorkLayout area="admin"` | Sidebar từ `navigation.ts` (`admin`) |

- Phân quyền: `ProtectedRoute allowedRoles=[…]`. Quyền thật do backend kiểm tra qua `/api/me`.
- **Thêm mục menu Advisor/Admin:** thêm vào `shellNavigation` trong `layouts/navigation.ts` với `group` (nhóm trên sidebar). Dùng `soon: true` nếu chưa có API (hiện nhãn "Sắp có"). Breadcrumb tự sinh; trang chi tiết khai báo thêm trong `detailPages`.
- `WorkLayout` cung cấp sẵn: sidebar thu gọn (lưu ở `localStorage`), ngăn kéo dưới 1024 px, breadcrumb, nút sáng/tối, menu tài khoản. Trang **không** tự vẽ sidebar hay topbar.
- 404: `pages/NotFound.tsx` (nằm trong `PublicLayout`).

## 3. Design token

- Màu: dùng class Tailwind theo token (`bg-cs-surface`, `text-cs-text`, `text-cs-muted`, `border-cs-border`, `bg-cs-accent`, `text-cs-accent-contrast`, `bg-success-soft text-success-fg`…), hoặc `var(--cs-…)` trong CSS.
- **Không viết mã hex trong component.** Thiếu màu thì thêm token vào `tokens.css`, kèm giá trị cho chế độ tối.
- Vai trò chỉ đổi `--cs-accent*`, `--cs-soft`, `--cs-sidebar-*`: Customer đỏ thương hiệu, Advisor vàng đồng, Admin graphite + đỏ.
- Chữ chú thích dùng `text-cs-muted` (đạt AA ở cả hai theme). Không dùng xám tự chọn như `#8A949E` (chỉ 3,08:1).
- Thang chữ: `text-display / title / section / subheading / body / small / caption / label / button`. Bo góc: `rounded-control / card / panel`. Bóng: `shadow-card / raised / overlay`. Khung trang: `page-container`.
- Font: **Kanit**, nạp ở `index.html`, dùng qua `--font-sans`.

## 4. Component dùng chung (`components/ui`)

| Nhu cầu | Dùng | Ghi chú |
|---|---|---|
| Nút | `<Button variant size icon loading>` | Mặc định `secondary`; mỗi khối chỉ **một** `primary`; `danger` cho xóa/hủy; `loading` tự khóa nút |
| Nút chỉ có icon | `<IconButton icon label>` | `label` bắt buộc (aria-label + tooltip) |
| `<Link>` trông như nút | `buttonClass({ variant, size })` | |
| Ô nhập | `<Field label error hint>` + `<Input/Select/Textarea>`, `<SearchInput>` | Tự gắn id và aria |
| Trạng thái nghiệp vụ | `<StatusBadge domain status audience>` | Nhãn và màu từ `config/status.ts`; `audience="customer"` cho phía khách |
| Đầu trang | `<PageHeader title description actions>` | Mỗi trang **một** `h1`; tiêu đề trùng tên menu |
| Hộp thoại | `<Modal>` / `<Drawer>` | Esc, khóa cuộn, giữ và trả focus, `role="dialog"`. `bare` cho modal cũ tự vẽ nội dung |
| Xác nhận | `useAppFeedback().confirm(confirmDelete(...))` | **Không** tự làm hộp xác nhận |
| Thông báo | `useAppFeedback().notify(msg, "success" | "error" | "info")` | **Không** tạo toast riêng (xem mục 8) |
| Menu thao tác | `<Dropdown items trigger>` | Bàn phím ↑ ↓ Esc |
| Bảng | `<DataTable columns rows>` + `<Pagination>` | Tự chuyển dạng thẻ dưới 768 px; có sẵn Loading/Error/Empty |
| Trạng thái trang | `<EmptyState> <LoadingState> <ErrorState onRetry>` | |
| Thao tác gọi API | `useAsyncAction(fn, { confirm, success, onSuccess })` | Chống gửi lặp |

## 5. Trạng thái nghiệp vụ

`config/status.ts` khai báo các nhóm `appointment`, `repair`, `quotation`, `invoice`, `payment`, `workItem`, `inspection`, `account`.
Mã trạng thái giữ đúng như backend (`RepairOrder::TRANSITIONS`). Các bảng nhãn trong `services/customerApi.ts` (`repairStatusLabel`…) được **sinh từ** file này.
Thêm trạng thái mới: chỉ sửa `status.ts`.

## 6. Theme

`ThemeContext.tsx` lưu lựa chọn vào `localStorage["carservice-theme"]` và gắn `html[data-theme]`. Script trong `index.html` gắn theme trước khi vẽ để tránh nháy màu.
Đọc theme: `useTheme()` trong `contexts/theme.ts`.

## 7. Gọi API

- Dùng `fetchApi` / `apiClient` (`services/api.ts`): tự gắn Bearer token, lỗi trả về `ApiClientError` với message tiếng Việt.
- Không gọi `fetch` trực tiếp. **Không tạo dữ liệu giả**: chưa có API thì dùng `EmptyState` / "Sắp có" (ví dụ `pages/admin/Reports.tsx`, `pages/shared/ModulePlaceholder.tsx`).

## 8. Quy tắc

**Thêm trang mới**
1. Tạo file trong `pages/<vai trò>/`.
2. Khai báo route trong `App.tsx` (bên trong layout của vai trò).
3. Nếu là trang Advisor/Admin, thêm mục vào `navigation.ts`.
4. Bố cục trang: `<div className="page-container">` + `<PageHeader>` + component trong `components/ui`.

**Thêm component mới:** chỉ khi `components/ui` chưa có. Đặt vào `components/ui`, export ở `index.ts`, mô tả cách dùng ở đầu file.

**Việt hóa**
- Mọi chữ người dùng thấy (kể cả placeholder, aria-label, thông báo lỗi) đều bằng tiếng Việt.
- Giữ nguyên tên thương hiệu "CarService" và "ATELIER".
- Không đưa thuật ngữ kỹ thuật (Laravel, backend, API, seeder) ra giao diện.

**Responsive**
- Không để trang tràn ngang ở 375 px.
- Vùng bấm tối thiểu 40 px (44 px dưới 640 px).
- Bảng rộng cuộn ngang trong khung riêng, hoặc dùng `DataTable`.

**Kiểm thử**
- `npx tsc -b`, `npm run build`, `npm run lint`.
- Toàn bộ `tests/*.mjs`.
- Kiểm tra trên trình duyệt với tài khoản demo (`*.demo@carservice.test`), ở 375 / 768 / 1280 px, sáng và tối.

## 9. Khu vực không tự ý thay đổi

- API contract, database, migration, luồng nghiệp vụ: đặt lịch → xác nhận → tiếp nhận → chẩn đoán → báo giá → sửa chữa → thanh toán → bàn giao.
- Mã trạng thái trong `config/status.ts` (phải khớp backend).
- `services/api.ts` (xác thực, xử lý 401).

## 10. Nợ kỹ thuật đã biết (cập nhật sau Phase 5)

- Còn nhiều `<button>` tự viết và màu viết cứng trong các trang lớn: `admin/MaintenancePackages.tsx`, `customer/Account.tsx`, `admin/Services.tsx`, `customer/Booking.tsx`.
- `components/auth/Toast.tsx` vẫn được 7 trang dùng song song với `notify()`.
- Header cũ (`Header`, `CustomerHeader`, `CustomerTopbar`, `RoleAccountMenu`, `Footer`) luôn trả `null` nhưng còn bị `tests/base-smoke.mjs` buộc giữ.
- `shell.css` còn các quy tắc cầu nối dark mode cho màu viết cứng của trang cũ. Chỉ gỡ khi trang tương ứng đã chuyển sang token.
- 22 lỗi ESLint, cùng một kiểu `react-hooks/set-state-in-effect`, ở các trang cũ.
