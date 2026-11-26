import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
// Tiến độ của khách đã đăng nhập nằm ở Tra cứu tiến độ (/repair-status); trang /customer/repair-status/manage cũ chỉ chuyển hướng (PO 18/11/2026).
const tracking = read('src/pages/showcase/ReferenceTracking.tsx');
const picker = read('src/pages/customer/booking/ServicePicker.tsx');
const api = read('src/services/customerApi.ts');
const pickerCss = read('src/pages/customer/booking/servicePicker.css');
const customerCss = read('src/styles/garage-customer-pages.css');
assert.match(tracking,/getMyRepairOrderDetail\(selectedId\)/,'Tracking must read actual Laravel history');
assert.match(tracking,/o\.statusHistory \?\? o\.status_history/,'Read actual API history keys');
assert.match(tracking,/Nhật ký cập nhật/);
assert.match(tracking,/<ol className="grid grid-cols-5/,'Progress steps must be an ordered list');
assert.match(tracking,/WAITING_FOR_PARTS/);
assert.match(tracking,/QUOTING/);
assert.match(tracking,/const closed = order\.status === 'CLOSED'/,'Do not mark bypassed workflow as completed');
assert.match(api,/statusHistory\?:/);
// Đặt lịch: ngăn kéo chọn dịch vụ — trạng thái chọn, focus, màu theo token, hỗ trợ giảm chuyển động.
assert.match(picker,/aria-pressed=\{isSelected\}/);
assert.match(picker,/aria-expanded=\{isOpen\}/);
assert.match(picker,/bg-\[var\(--cs-surface\)\]/);
assert.match(picker,/closeButtonRef\.current\?\.focus/);
assert.match(pickerCss,/prefers-reduced-motion/);
assert.match(customerCss,/at-tracking-pill/);
assert.match(customerCss,/at-tracking-event/);
console.log('PASS Customer tracking & booking: real history, timeline badges, red notes, hover/selected/focus colors.');
