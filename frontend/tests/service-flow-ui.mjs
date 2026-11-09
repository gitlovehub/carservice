/** P5-C — quy trình dịch vụ + dịch vụ nhanh: admin cấu hình bước/mức, cố vấn gửi báo giá niêm yết, ảnh 4 góc, giờ dự kiến. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

// Form dịch vụ + bước chuẩn nằm trong modal của trang Dịch vụ.
const admin = read('src/pages/admin/services/ServiceModals.tsx');
const steps = read('src/pages/admin/ServiceStepsEditor.tsx');
const quick = read('src/pages/advisor/QuickServicePanel.tsx');
const detail = read('src/pages/advisor/AdvisorRepairOrderDetail.tsx');
const checkIn = read('src/pages/advisor/CheckInPanel.tsx');
const evidence = read('src/services/evidenceService.ts');
const panels = read('src/pages/advisor/RepairOrderPanels.tsx');
const customer = read('src/pages/customer/RepairStatus.tsx');

assert.match(admin, /service_level: form\.service_level/, 'Admin saves the service level');
assert.match(admin, /<ServiceStepsEditor /, 'Admin edits standard steps');
assert.match(steps, /method: "PUT"/, 'Steps are saved through the admin API');
assert.match(detail, /<QuickServicePanel /, 'Advisor can send a quick-service quotation');
assert.match(quick, /s\.service_level === "QUICK"/, 'Only QUICK services are offered');
assert.match(quick, /status === "RECEIVED" && checkedIn/, 'Quick quotation only after a confirmed check-in');
assert.match(evidence, /FRONT: "Đầu xe", REAR: "Đuôi xe", LEFT: "Bên trái", RIGHT: "Bên phải"/, 'Four overview positions are available');
assert.match(checkIn, /positions=\{VEHICLE_POSITIONS\}/, 'Check-in photos carry a position');
assert.match(panels, /Dự kiến xong/, 'Advisor sees the estimated ready time');
assert.match(customer, /Dự kiến xong/, 'Customer sees the estimated ready time');

console.log('PASS P5-C: service flow + quick service UI.');
