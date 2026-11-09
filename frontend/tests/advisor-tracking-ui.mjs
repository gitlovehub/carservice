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
assert.match(history, /\/advisor\/appointments\/\$\{appointment\.id\}\/reschedule/, 'Advisor can reschedule');
assert.match(history, /minLength=\{5\}/, 'Reschedule reason is required');
assert.match(reception, /<AppointmentHistoryPanel /, 'Reception shows history + reschedule');
assert.match(admin, /\/admin\/advisor-activity/, 'Admin activity page reads the API');
// Trang hoạt động cố vấn nằm trong Nhật ký hệ thống (tab "Hoạt động cố vấn"), menu trỏ tới /admin/audit-logs.
assert.match(nav, /\/admin\/audit-logs/, 'Admin menu links the audit log page');
assert.match(read('src/pages/admin/AuditLogs.tsx'), /<AdvisorActivity embedded\/>/, 'Audit log page embeds the activity tab');
console.log('PASS advisor tracking UI.');