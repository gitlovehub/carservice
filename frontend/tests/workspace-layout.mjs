/** Phase 4 — bố cục chung Advisor/Admin. Kiểm tra tĩnh; hành vi thực tế kiểm ở Phase 6 trên trình duyệt. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
const shell = read('layouts/AppShell.tsx');
const nav = read('layouts/navigation.ts');
const css = read('layouts/workspace.css');

// Một bố cục cho cả hai vai trò, chỉ khác menu.
assert.match(shell, /export function AdvisorLayout\(\) \{ return <WorkLayout area="advisor"\/>; \}/);
assert.match(shell, /export function AdminLayout\(\) \{ return <WorkLayout area="admin"\/>; \}/);

// Sidebar: nhóm nghiệp vụ, thu gọn có lưu, ngăn kéo trên điện thoại.
assert.match(shell, /navGroups\(area\)/);
assert.match(shell, /localStorage\.setItem\(SIDEBAR_KEY/, 'Trạng thái thu gọn phải được lưu');
assert.match(shell, /data-sidebar=\{collapsed \? "collapsed" : "expanded"\}/);
assert.match(shell, /aria-expanded=\{mobileOpen\} aria-controls="cs-workspace-sidebar"/);
assert.match(shell, /"Escape"/);
assert.match(shell, /aria-current=\{current \? "page" : undefined\}/, 'Mục đang mở phải có aria-current');
assert.match(css, /data-sidebar="collapsed"/);
assert.match(css, /max-width: 1023\.98px/);
assert.match(css, /visibility: hidden/, 'Ngăn kéo đóng không được nhận focus bàn phím');

// Topbar: breadcrumb, sáng/tối, menu tài khoản. Không có chuông/tìm kiếm toàn cục (chưa có API).
assert.match(shell, /<Breadcrumbs area=\{area\}\/>/);
assert.match(shell, /<ThemeToggle\/>/);
assert.match(shell, /<Dropdown label="Menu tài khoản"/);
assert.doesNotMatch(shell, /bell|notification|thông báo mới/i);
assert.match(nav, /export function crumbs\(/);

// Menu: nhóm, tên trang tổng quan thống nhất, trang khung gắn nhãn "Sắp có".
for (const group of ['Điều hành', 'Sửa chữa', 'Khách hàng', 'Con người', 'Danh mục', 'Hệ thống']) assert.ok(nav.includes(`group: "${group}"`), `Thiếu nhóm ${group}`);
assert.match(nav, /\{ label: "Tổng quan", path: "\/advisor"/);
assert.match(nav, /\{ label: "Tổng quan", path: "\/admin"/);
assert.doesNotMatch(nav, /Bàn điều hành|Trung tâm điều hành/);
assert.match(nav, /path: "\/advisor\/create-booking"[^}]*soon: true/);
// Admin: sidebar mới — mọi mục đều có trang (dữ liệu demo hoặc API), không còn mục "Sắp có".
for (const path of ['/admin/staff', '/admin/repair-orders', '/admin/invoices', '/admin/reviews', '/admin/vehicle-brands', '/admin/audit-logs']) assert.match(nav, new RegExp(`path: "${path}"`));
assert.doesNotMatch(nav.slice(nav.indexOf('admin: [')), /soon: true/);

// Không còn chữ trang trí tiếng Anh trong shell.
assert.doesNotMatch(shell + css, /SERVICE WORKSPACE|BUSINESS CONTROL|WORKSPACE"/);

// Sidebar/topbar cũ (luôn trả null trong shell) đã gỡ.
for (const file of ['pages/admin/AdminSidebar.tsx', 'pages/admin/AdminTopbar.tsx', 'pages/advisor/AdvisorSidebar.tsx', 'pages/advisor/AdvisorTopbar.tsx']) {
  assert.ok(!existsSync(new URL('../src/' + file, import.meta.url)), `${file} là code chết, phải được gỡ`);
}
console.log('PASS Phase 4: shared Advisor/Admin layout — grouped & collapsible sidebar, mobile drawer, breadcrumb, theme, account menu.');
