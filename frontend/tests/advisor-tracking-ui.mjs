/** Theo dõi cố vấn: cột người xử lý, lịch sử + đổi lịch (lý do, báo khách), trang admin hoạt động cố vấn. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const list = read('src/pages/advisor/Appointments.tsx');
const history = read('src/pages/advisor/AppointmentHistoryPanel.tsx');
const reception = read('src/pages/advisor/ReceptionWorkflow.tsx');
const admin = read('src/pages/admin/AdvisorActivity.tsx');
const nav = read('src/layouts/navigation.ts');
assert.match(list, /Người xử lý/, 'Appointment list shows the handling advisor');
// Đổi lịch: modal dùng chung (Lịch hẹn + Tiếp nhận) — lý do, xác nhận khách đồng ý, chống ghi đè (expected_*).
const reschedule = read('src/pages/advisor/RescheduleModal.tsx');
assert.match(history, /<RescheduleModal /, 'Reception history uses the shared reschedule modal');
assert.match(list, /<RescheduleModal /, 'Appointment list uses the shared reschedule modal');
assert.match(reschedule, /\/advisor\/appointments\/\$\{appointment\.id\}\/reschedule/, 'Advisor can reschedule');
assert.match(reschedule, /customer_agreed: true/, 'Only saves after the customer agreed');
assert.match(reschedule, /contact === "agreed"/, 'Save is blocked until "Đã liên hệ và khách đồng ý"');
assert.match(reschedule, /expected_date: currentDate/, 'Sends the time the advisor saw (stale-update guard)');
assert.match(reception, /<AppointmentReschedulePanel /, 'Reception shows reschedule');
assert.match(reception, /<AppointmentTimeline /, 'Reception shows history timeline');
assert.match(admin, /\/admin\/advisor-activity/, 'Admin activity page reads the API');
// Trang hoạt động cố vấn nằm trong Nhật ký hệ thống (tab "Hoạt động cố vấn"), menu trỏ tới /admin/audit-logs.
assert.match(nav, /\/admin\/audit-logs/, 'Admin menu links the audit log page');
assert.match(read('src/pages/admin/AuditLogs.tsx'), /<AdvisorActivity embedded\/>/, 'Audit log page embeds the activity tab');
console.log('PASS advisor tracking UI.');