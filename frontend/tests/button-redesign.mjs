// Khóa đặc tả docs/ui-button-redesign.md: token theo vai trò, biến thể tonal, Admin đỏ thương hiệu theo theme sáng/tối,
// nút danger nền đặc chỉ trong hộp thoại xác nhận, các ánh xạ chính theo màn hình.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { strict as assert } from 'node:assert';
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');

const tokens = read('../src/styles/tokens.css');
const buttons = read('../src/styles/buttons.css');
const buttonClass = read('../src/components/ui/buttonClass.ts');
const confirm = read('../src/components/ui/ConfirmDialog.tsx');
const pagination = read('../src/components/ui/Pagination.tsx');

// 1. Token theo vai trò.
for (const token of ['--cs-soft-hover', '--cs-on-soft', '--cs-btn-radius', '--cs-accent-fill', '--cs-success-btn-bg', '--cs-danger-border']) {
  assert(tokens.includes(token), `tokens.css thiếu ${token}`);
}
// Admin: đỏ thương hiệu, theo theme sáng/tối — chỉ đổi accent + sidebar, không ghi đè nền/chữ/viền/trạng thái.
const adminStart = tokens.indexOf('[data-area="admin"] {');
assert(adminStart > 0, 'Thiếu khối token Admin');
const admin = tokens.slice(adminStart, tokens.indexOf('}', adminStart));
for (const needle of ['--cs-accent: var(--cs-brand)', '--cs-accent-hover: var(--cs-brand-hover)', '--cs-accent-contrast: #ffffff', '--cs-soft: var(--cs-brand-soft)', '--cs-sidebar-bg: var(--cs-surface)', '--cs-sidebar-active-bg: #cf2935']) {
  assert(admin.includes(needle), `Admin token thiếu: ${needle}`);
}
for (const banned of ['color-scheme', 'gradient', '--cs-bg:', '--cs-surface:', '--cs-text:', '--cs-card-radius', '--cs-success', '--cs-search-', '--cs-tile-']) {
  assert(!admin.includes(banned), `Admin không được ghi đè ${banned}`);
}
// Admin Button Kit: bo góc nút 10px.
assert(admin.includes('--cs-btn-radius: 10px'), 'Admin: bo góc nút 10px theo Admin Button Kit');
for (const old of ['c8f53c', '080c1a', '0b1022', '141a2e', 'lime']) assert(!tokens.toLowerCase().includes(old), `tokens.css còn ${old}`);
const workspace = read('../src/layouts/workspace.css');
assert(!/lime|--cs-search-|--cs-tile-|is-violet/.test(workspace), 'workspace.css còn style lime / navy riêng của Admin');

// 2. Hệ thống nút.
assert(/"primary" \| "tonal" \| "secondary" \| "outline" \| "ghost" \| "success" \| "warning" \| "danger-outline" \| "danger"/.test(buttonClass), 'ButtonVariant phải theo đặc tả');
for (const needle of ['.cs-btn-tonal', '.cs-btn-warning', 'var(--btn-active-bg', 'var(--cs-soft-hover)', 'border-radius: var(--cs-btn-radius', 'var(--cs-accent-fill', 'var(--cs-disabled-bg)', '.cs-btn-tone-danger', '.cs-unified-primary']) {
  assert(buttons.includes(needle), `buttons.css thiếu ${needle}`);
}
// Hover / nhấn chỉ đổi màu: không scale, translate hay chuyển động transform/box-shadow trên nút.
const buttonRules = buttons.replace(/@keyframes[^{]+\{[^}]*\{[^}]*\}[^}]*\}/g, '');
assert(!/scale\(|translate[XY]?\(/.test(buttonRules), 'buttons.css: nút không được scale/translate khi hover/nhấn');
assert(!/transition:[^;]*(transform|box-shadow)/.test(buttons), 'buttons.css: transition chỉ gồm màu nền / chữ / viền');
const adminDir = new URL('../src/pages/admin', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const walkAdmin = dir => readdirSync(dir).flatMap(name => { const p = join(dir, name); return statSync(p).isDirectory() ? walkAdmin(p) : p.endsWith('.tsx') ? [p] : []; });
for (const file of walkAdmin(adminDir)) {
  assert(!/(hover|active|group-hover):(-?translate|scale|shadow)/.test(readFileSync(file, 'utf8')), `${file}: hover/active chỉ được đổi màu`);
}

// 3. Dùng chung.
assert(/confirmIconFor|icon=\{confirmIconFor/.test(confirm) && confirm.includes('"trash"') && confirm.includes('"x"'), 'Nút xác nhận danger phải có icon trash/X');
assert(pagination.includes('"tonal"') && pagination.includes('"outline"'), 'Pagination: outline, trang hiện tại tonal');

// Danger nền đặc chỉ trong hộp thoại xác nhận (file có Modal) — không nằm trong trang thường.
const walk = dir => readdirSync(dir).flatMap(name => { const p = join(dir, name); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.tsx') ? [p] : []; });
const pagesDir = new URL('../src/pages', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
for (const file of walk(pagesDir)) {
  const src = readFileSync(file, 'utf8');
  // Nút thật: JSX variant="danger", buttonClass({ variant: "danger" }) hoặc class cs-btn-danger. (variant: "danger" trong
  // confirm({...}) là tùy chọn của ConfirmDialog nên hợp lệ.)
  const solid = src.match(/variant="danger"(?!-)|buttonClass\(\{\s*variant: "danger"(?!-)|cs-btn-danger(?!-)/g) ?? [];
  if (solid.length) assert(src.includes('<Modal'), `${file}: danger nền đặc ngoài hộp thoại xác nhận`);
}

// 4. Ánh xạ chính theo màn hình.
const quotation = read('../src/pages/customer/Quotation.tsx');
assert(quotation.includes('variant="success" size="lg" icon="check"') && quotation.includes('variant="danger-outline" icon="x"'), 'Báo giá: Đồng ý = success lg, Từ chối = danger-outline X');
const booking = read('../src/pages/customer/Booking.tsx');
assert(booking.includes('icon="arrow-left"') && booking.includes('"arrow-right"') && booking.includes('size="lg"'), 'Đặt lịch: Quay lại + mũi tên, Tiếp tục primary lg');
const cars = read('../src/pages/customer/Cars.tsx');
assert(cars.includes('variant="tonal" icon="plus"') && cars.includes('icon="trash" tone="danger"'), 'Xe của tôi: Thêm xe tonal, Xóa icon đỏ');
const panels = read('../src/pages/advisor/RepairOrderPanels.tsx');
for (const needle of ['icon="send"', 'iconRight="arrow-right"', 'variant="success" icon="cash"', 'disabled={invoice.status !== "PAID"}', 'variant="tonal" icon="plus"']) {
  assert(panels.includes(needle), `Phiếu sửa chữa thiếu ${needle}`);
}
const adminDashboard = read('../src/pages/admin/AdminDashboard.tsx');
assert(adminDashboard.includes('StatCard') && adminDashboard.includes('variant="segment"'), 'Dashboard Admin: thẻ số liệu + bộ chọn khoảng thời gian');
const accounts = read('../src/pages/admin/Accounts.tsx');
assert(accounts.includes('icon: "key"') && accounts.includes('icon: "lock", danger: true') && accounts.includes('variant="primary" icon="plus"'), 'Tài khoản: Đặt lại mật khẩu, Khóa (danger), Tạo tài khoản primary');

console.log('PASS button redesign: role tokens, tonal variant, admin red + theme-following sidebar, confirm-only solid danger, screen mappings, admin dashboard.');
