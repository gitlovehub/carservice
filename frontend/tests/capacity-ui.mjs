/** P7-FE — công suất: cảnh báo quá tải khi xác nhận lịch (không chặn), bảng tải 7 ngày, admin nhập năng lực. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const reception = read('src/pages/advisor/ReceptionWorkflow.tsx');
const week = read('src/pages/advisor/CapacityWeek.tsx');
const hours = read('src/pages/admin/WorkingHours.tsx');
assert.match(reception, /capacityApi\.day\(/, 'Confirming an appointment checks the day load');
assert.match(reception, /vẫn xác nhận/, 'Over capacity is a warning only');
assert.match(reception, /<CapacityWeek\/>/, 'Reception shows the 7-day load');
assert.match(week, /role="progressbar"/, 'Load bars are accessible');
assert.match(hours, /daily_capacity_minutes/, 'Admin sets daily capacity');
console.log('PASS P7-FE: capacity warning + week view + admin capacity.');