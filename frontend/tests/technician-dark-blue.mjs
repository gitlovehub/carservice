import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const role = read('src/pages/auth/auth.ts');
const api = read('src/pages/technician/atelier/technicianApi.ts');
const shell = read('src/pages/technician/atelier/TechnicianLayout.tsx');
const detail = read('src/pages/technician/atelier/TechnicianDetail.tsx');
const inspect = read('src/pages/technician/atelier/TechnicianInspection.tsx');
const list = read('src/pages/technician/atelier/TechnicianOrders.tsx');

assert.match(app, /path="\/technician" element=\{<ProtectedRoute allowedRoles=\{\["TECHNICIAN"\]\}>/);
assert.match(app, /path="orders\/:orderId\/inspection" element=\{<TechnicianInspection\/>\}/);
assert.match(role, /case "TECHNICIAN":\s*return \{ path: "\/technician"/);
for (const endpoint of ['/repair-orders', '/work-items/', '/inspections', '/complete']) {
  assert.ok(api.includes(endpoint), `missing API ${endpoint}`);
}
assert.ok(api.includes('JSON.stringify({ status })'), 'missing real PATCH work status payload');
assert.ok(inspect.includes('inspection_items'), 'missing validated inspection_items');
assert.ok(inspect.includes('technicianApi.startInspection'), 'missing real inspection create call');
assert.ok(inspect.includes('technicianApi.finishInspection'), 'missing real inspection completion call');
assert.ok(detail.includes('technicianApi.updateWorkStatus'), 'missing real status API call');
assert.ok(shell.includes('bg-ktv-page') && shell.includes('bg-ktv-sidebar'), 'missing dark-blue Tailwind design');
assert.ok(list.includes('useOrders'), 'list not backed by API');
for (const file of ['TechnicianDashboard.tsx','TechnicianOrders.tsx','TechnicianDetail.tsx','TechnicianInspection.tsx']) {
  const source = read(`src/pages/technician/atelier/${file}`);
  assert.doesNotMatch(source, /PSC-00[135]|Nguyễn Tiến Hiền|30A-123\.45|localStorage\.setItem\("repair/i, `mock data in ${file}`);
}
console.log('PASS Technician: role-secure routes, dark-blue Tailwind, real assigned orders, inspection & work APIs, no hardcoded repairs.');
