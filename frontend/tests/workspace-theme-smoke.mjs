import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const css = read('../src/layouts/shell.css');
const tokens = read('../src/styles/tokens.css');
const dashboard = read('../src/pages/shared/WorkspaceDashboard.tsx');
const app = read('../src/App.tsx');
// Màu nhấn theo vai trò (sáng + tối) khai báo tập trung trong tokens.css.
// Admin luôn tối (docs/ui-button-redesign.md): sidebar navy #080c1a, nút chính lime chữ tối.
for (const [name, darkAccent] of Object.entries({advisor: '--cs-accent: #e3bb6f', admin: '--cs-sidebar-bg: #080c1a'})) {
  assert(tokens.includes(`html[data-theme="dark"] [data-area="${name}"]`), `${name} dark token scope absent`);
  assert(tokens.includes(darkAccent), `${name} dark token absent`);
  assert(css.includes(`data-area="${name}"`), `${name} role scope absent`);
}
for (const cls of ['bg-white','bg-\\[\\#F7F7F5\\]','text-\\[\\#20252B\\]','text-\\[\\#8A949E\\]','border-\\[\\#E1E4E6\\]','bg-\\[\\#D6A85F\\]']) assert(css.includes(cls), `Missing mapping ${cls}`);
// Phase 4: dashboard dùng chung Advisor/Admin — số liệu từ API thật (lịch hẹn + phiếu sửa chữa), lưới co giãn.
for(const needle of ['getAdvisorAppointments','listWorkflowOrders','pagination?.total','role === "advisor"','<PageHeader','title="Tổng quan"']) assert(dashboard.includes(needle),`Dashboard missing ${needle}`);
assert(!dashboard.includes('490.000') && !dashboard.includes('86M'),'Do not fabricate metric values');
assert(!/#[0-9a-f]{6}/i.test(dashboard), 'Dashboard colors must come from tokens (no hard-coded hex / neon)');
assert(!/[A-Z]{4,} [A-Z]{3,}/.test(dashboard.replace(/"[A-Z_]+"/g, '')), 'No decorative English captions on the dashboard');
assert(app.includes('<WorkspaceDashboard role="advisor"/>'));
for (const variant of ['sm:grid-cols-2', 'xl:grid-cols-4', 'xl:grid-cols-[']) assert(dashboard.includes(variant), `Tailwind responsive variant ${variant} must remain`);
console.log('PASS: role scoped theme, legacy dark compatibility, responsive GARAGE dashboards and real appointment integration.');
