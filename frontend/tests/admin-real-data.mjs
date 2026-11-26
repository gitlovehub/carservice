/** Khu Admin dùng dữ liệu thật từ Laravel API — không còn dữ liệu giả trong frontend. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

assert.ok(!existsSync(new URL('../src/mocks/admin', import.meta.url)), 'src/mocks/admin đã được gỡ');

const pages = readdirSync(new URL('../src/pages/admin', import.meta.url)).filter(f => f.endsWith('.tsx'));
for (const page of pages) {
  const source = read(`src/pages/admin/${page}`);
  assert.doesNotMatch(source, /mocks\/admin/, `${page} không import dữ liệu giả`);
  if (source.includes('<AdminPage ')) assert.match(source, /demo=\{false\}/, `${page} không gắn nhãn "Dữ liệu demo"`);
}

const api = read('src/services/adminApi.ts');
const wiring = {
  'AdminDashboard.tsx': 'adminApi.dashboard', 'Reports.tsx': 'adminApi.reports', 'RepairOrders.tsx': 'adminApi.repairOrders',
  'Invoices.tsx': 'adminApi.invoices', 'Reviews.tsx': 'adminApi.reviews', 'AuditLogs.tsx': 'adminApi.auditLogs',
  'AdminCustomers.tsx': 'adminApi.customers', 'Staff.tsx': 'adminApi.staff', 'Accounts.tsx': 'adminApi.accounts',
  'Inventory.tsx': 'adminApi.parts', 'HolidaysPanel.tsx': 'adminApi.holidays',
};
for (const [page, call] of Object.entries(wiring)) assert.ok(read(`src/pages/admin/${page}`).includes(call), `${page} gọi ${call}`);
for (const path of ['/admin/dashboard', '/admin/reports', '/admin/repair-orders', '/admin/invoices', '/admin/payments', '/admin/reviews', '/admin/audit-logs',
  '/admin/customers', '/admin/staff', '/admin/accounts', '/admin/parts', '/admin/stock-moves', '/admin/holidays']) {
  assert.ok(api.includes(`"${path}`) || api.includes(`\`${path}`), `adminApi có ${path}`);
}

// Trạng thái tải / lỗi / phân trang ở server.
const query = read('src/pages/admin/kit/useAdminQuery.ts');
assert.match(query, /AbortController/, 'Huỷ request cũ khi đổi bộ lọc');
assert.doesNotMatch(query, /useEffect\(\(\) => \{\s*set/, 'Không setState đồng bộ trong effect');
for (const page of ['RepairOrders.tsx', 'Invoices.tsx', 'AdminCustomers.tsx', 'Accounts.tsx', 'Inventory.tsx', 'AuditLogs.tsx']) {
  const source = read(`src/pages/admin/${page}`);
  assert.match(source, /useDebounced/, `${page} tìm kiếm có debounce`);
  assert.match(source, /meta\.last_page/, `${page} phân trang theo API`);
}

// Bộ lọc: select gốc phủ trong suốt (không bị CSS theme tối tô nền lệch), lọc đang áp dụng có màu nhấn.
const kit = read('src/pages/admin/kit/AdminKit.tsx');
assert.match(kit, /data-ui="filter"[\s\S]*?absolute inset-0[^"]*opacity-0/, 'FilterSelect phủ select trong suốt');
assert.match(kit, /data-active=\{active \|\| undefined\}/, 'FilterSelect báo trạng thái đang lọc');
// Lề đồng nhất: AdminPage và các trang cũ dùng page-container, không còn khung riêng.
assert.match(kit, /<main className="page-container">/, 'AdminPage dùng page-container');
for (const page of ['Services.tsx', 'MaintenancePackages.tsx', 'WorkingHours.tsx', 'AdminAppointments.tsx']) {
  const source = read(`src/pages/admin/${page}`);
  assert.doesNotMatch(source, /lg:ml-\[250px\]|max-w-\[1200px\]/, `${page} không dùng khung riêng`);
  // Trực tiếp, hoặc qua <AdminPage> (đã bọc page-container).
  assert.match(source, /page-container|<AdminPage /, `${page} dùng page-container`);
}
// Tổng quan (điều hành hôm nay) khác Báo cáo (phân tích theo kỳ).
const dashboard = read('src/pages/admin/AdminDashboard.tsx');
assert.match(dashboard, /Việc cần xử lý/, 'Tổng quan có danh sách việc cần xử lý');
assert.doesNotMatch(dashboard, /BarChart/, 'Tổng quan không lặp biểu đồ cột của Báo cáo');

console.log('PASS admin pages use real API data (no mocks), unified layout and filters.');
