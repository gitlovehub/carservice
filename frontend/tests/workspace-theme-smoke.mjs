import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const css = read('../src/layouts/shell.css');
const tokens = read('../src/styles/tokens.css');
const dashboard = read('../src/pages/shared/WorkspaceDashboard.tsx');
const app = read('../src/App.tsx');
// Màu nhấn theo vai trò (sáng + tối) khai báo tập trung trong tokens.css.
// Admin theo theme sáng/tối, màu nhấn đỏ (docs/ui-button-redesign.md): dark chỉ đổi chữ nhấn sang tông sáng.
for (const [name, darkAccent] of Object.entries({advisor: '--cs-accent: #e3bb6f', admin: '--cs-accent-text: #ff7d85'})) {
  assert(tokens.includes(`html[data-theme="dark"] [data-area="${name}"]`), `${name} dark token scope absent`);
  assert(tokens.includes(darkAccent), `${name} dark token absent`);
  assert(css.includes(`data-area="${name}"`), `${name} role scope absent`);
}
// Sidebar Admin ở theme sáng có nền sáng (surface), không còn sidebar đen cố định; mục chọn đỏ đặc chữ trắng.
const adminBlock = tokens.slice(tokens.indexOf('[data-area="admin"] {'));
assert(/--cs-sidebar-bg:\s*var\(--cs-surface\)/.test(adminBlock), 'Admin sidebar must use --cs-surface (light in light theme)');
assert(!/color-scheme:\s*dark/.test(adminBlock.split('}')[0]), 'Admin must not force dark color-scheme');
assert(/--cs-sidebar-active-bg:\s*#cf2935/.test(adminBlock) && /--cs-sidebar-active-fg:\s*#ffffff/.test(adminBlock), 'Admin active nav item: solid red, white text');
for (const old of ['c8f53c', '080c1a', '0b1022', '141a2e']) assert(!tokens.toLowerCase().includes(old), `Old admin navy/lime token ${old} must be gone`);
for (const cls of ['bg-white','bg-\\[\\#F7F7F5\\]','text-\\[\\#20252B\\]','text-\\[\\#8A949E\\]','border-\\[\\#E1E4E6\\]','bg-\\[\\#D6A85F\\]']) assert(css.includes(cls), `Missing mapping ${cls}`);
// Phase 4: dashboard dùng chung Advisor/Admin — số liệu từ API thật (lịch hẹn + phiếu sửa chữa), lưới co giãn.
for(const needle of ['getAdvisorAppointments','listWorkflowOrders','pagination?.total','role === "advisor"','<PageHeader','title="Tổng quan"']) assert(dashboard.includes(needle),`Dashboard missing ${needle}`);
assert(!dashboard.includes('490.000') && !dashboard.includes('86M'),'Do not fabricate metric values');
assert(!/#[0-9a-f]{6}/i.test(dashboard), 'Dashboard colors must come from tokens (no hard-coded hex / neon)');
assert(!/[A-Z]{4,} [A-Z]{3,}/.test(dashboard.replace(/"[A-Z_]+"/g, '')), 'No decorative English captions on the dashboard');
assert(app.includes('<WorkspaceDashboard role="advisor"/>'));
for (const variant of ['sm:grid-cols-2', 'xl:grid-cols-4', 'xl:grid-cols-[']) assert(dashboard.includes(variant), `Tailwind responsive variant ${variant} must remain`);
console.log('PASS: role scoped theme, legacy dark compatibility, responsive GARAGE dashboards and real appointment integration.');
