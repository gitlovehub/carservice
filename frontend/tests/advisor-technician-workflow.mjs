import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const src = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const routes = src('src/App.tsx');
const workflow = src('src/services/workflowService.ts');
const reception = src('src/pages/advisor/ReceptionWorkflow.tsx');
const orders = src('src/pages/advisor/AdvisorRepairOrders.tsx');
const detail = src('src/pages/advisor/AdvisorRepairOrderDetail.tsx');
const advisor = src('src/pages/advisor/Appointments.tsx');
const apiRoutes = src('../backend/routes/api.php');
const migration = src('../backend/database/migrations/2026_09_24_084628_create_repair_orders_table.php');
assert.match(routes, /path="reception" element=\{<ReceptionWorkflow\/>\}/);
assert.match(routes, /path="service-orders" element=\{<AdvisorRepairOrders\/>\}/);
assert.match(routes, /path="service-orders\/:orderId" element=\{<AdvisorRepairOrderDetail\/>\}/);
assert.match(routes, /allowedRoles=\{\["ADVISOR"\]\}/);
assert.doesNotMatch(routes, /pages\/technician|path="\/technician"/, "Technician screens removed; advisor records inspections");
assert.match(advisor, /navigate\(`\/advisor\/reception\?appointment=\$\{id\}`\)/);
assert.match(advisor, /Tạo \/ xem phiếu/);
assert.match(workflow, /\/repair-orders/);
assert.match(workflow, /getAdvisorAppointments/);
assert.match(workflow, /appointment\.status !== "CHECKED_IN"/);
assert.match(workflow, /findOrderForAppointment/);
assert.match(migration, /->unique\(\)/);
assert.match(reception, /confirmPendingAppointment/);
assert.match(reception, /checkInConfirmedAppointment/);
assert.match(reception, /receiveRepairOrder/);
assert.match(reception, /Tạo phiếu sửa chữa/);
// ADV-07 + mockup 17/11: danh sách thẻ dùng API có lọc nhiều trạng thái + tìm kiếm + số đếm; khung xem nhanh mở đúng bước chi tiết.
assert.match(orders, /listRepairOrders\(query, signal\)/);
assert.match(orders, /onClick=\{\(\) => openOrder\(o\)\}/);
assert.match(orders, /navigate\(orderStepPath\(order\.id\)\)/);
assert.match(src('src/pages/advisor/repairOrderFlow.ts'), /\/advisor\/service-orders\/\$\{id\}/);
assert.match(detail, /searchParams\.get\("step"\)/);
// Báo giá & phê duyệt (mockup 17/11): danh sách GET /quotations; nhân viên không duyệt thay khách (D-008).
const quotes = src('src/pages/advisor/AdvisorQuotations.tsx');
assert.match(routes, /path="quotations" element=\{<AdvisorQuotations\/>\}/);
assert.match(quotes, /listQuotations\(query, signal\)/);
assert.match(apiRoutes, /Route::get\('quotations', 'index'\)/);
assert.doesNotMatch(quotes, /Đánh dấu đã phê duyệt|\/respond/, 'Advisor must not approve on behalf of the customer');
// Tiến độ sửa chữa (mockup 17/11): danh sách kèm % công việc; hoàn thành chỉ khi mọi công việc xong.
const progress = src('src/pages/advisor/AdvisorRepairProgress.tsx');
assert.match(routes, /path="repair-progress" element=\{<AdvisorRepairProgress\/>\}/);
assert.match(progress, /withProgress: true/);
assert.match(progress, /disabled=\{working \|\| unfinished > 0\}/);
assert.match(progress, /workflowApi\.transition\(order\.id, "complete"\)/);
// Phụ tùng (mockup 17/11) — chỉ xem theo D-020: không gọi API nhập/xuất/điều chỉnh tồn của Admin.
const partsPage = src('src/pages/advisor/AdvisorParts.tsx');
assert.match(routes, /path="parts" element=\{<AdvisorParts\/>\}/);
assert.match(partsPage, /workflowApi\.reportPartShortage\(/);
assert.doesNotMatch(partsPage, /adjustStock|\/admin\/parts/, 'Advisor must not adjust stock (D-020)');
assert.match(apiRoutes, /Route::get\('advisor\/parts'/);
// Kiểm tra & bàn giao (mockup 17/11): kiểm tra sau sửa bắt buộc; bàn giao chỉ khi đủ điều kiện; không nhân viên ký thay khách.
const deliveryPage = src('src/pages/advisor/AdvisorDelivery.tsx');
assert.match(routes, /path="delivery" element=\{<AdvisorDelivery\/>\}/);
assert.match(deliveryPage, /disabled=\{working \|\| state !== "ready"\}/);
// Thu tiền / bàn giao chỉ làm ở trang Thanh toán / Kiểm tra & bàn giao; chi tiết phiếu chỉ có một nút dẫn tới đó (PO 18/11).
assert.match(src('src/pages/advisor/repairOrderFlow.ts'), /if \(!order\.quality_checked_at\) return "check";/);
assert.match(src('src/pages/advisor/RepairOrderPanels.tsx'), /\/advisor\/payments\?order=\$\{order\.id\}/);
assert.doesNotMatch(src('src/pages/advisor/RepairOrderPanels.tsx'), /"hand-over"|payCash/, 'Chi tiết phiếu không còn nút thu tiền / bàn giao trùng với trang riêng');
assert.match(apiRoutes, /Route::post\('quality-check', 'qualityCheck'\)/);
// Thanh toán (mockup 17/11): 4 phương thức thu tại quầy, trừ tiền mặt phải có mã giao dịch.
const billingPage = src('src/pages/advisor/AdvisorBilling.tsx');
assert.match(routes, /path="payments" element=\{<AdvisorBilling\/>\}/);
assert.match(billingPage, /workflowApi\.payAtCounter\(invoice\.id, method, amountValue, method === "DIRECT" \? undefined : code\.trim\(\)\)/);
assert.match(billingPage, /method !== "DIRECT" && !code\.trim\(\)/);
// Khách hàng (mockup 17/11): nhóm khách lọc qua API, tổng chi tiêu từ backend (không tự cộng ở giao diện).
const customersPage = src('src/pages/advisor/Customers.tsx');
assert.match(customersPage, /customerDirectoryApi\.customers\(query, signal\)/);
assert.match(customersPage, /formatVnd\(c\.total_spent \?\? 0\)/);
const panels = src('src/pages/advisor/RepairOrderPanels.tsx');
assert.match(detail, /window\.print\(\)/);
assert.match(detail, /<InspectionPanel /, "Advisor records inspection on the repair order page (no technician hand-off)");
assert.doesNotMatch(detail, /assignTechnician|workflowApi\.technicians\(\)/, "Assignment step removed from advisor flow");
assert.match(panels, /workflowApi\.recordInspection\(/);
assert.match(panels, /workflowApi\.completeInspection\(/);
assert.match(panels, /const canBuild = \["QUOTING", "WAITING_APPROVAL"\]/, "Quotation only after diagnosis is complete");
assert.match(apiRoutes, /post\('repair-orders', 'store'\)/);
assert.match(apiRoutes, /Account::ROLE_ADVISOR\.','\.Account::ROLE_TECHNICIAN\)->group[\s\S]*inspections\/complete/, 'Advisor may record and complete inspections');
assert.match(apiRoutes, /inspections\/complete/);
const files = ['src/App.tsx','src/services/workflowService.ts','src/pages/advisor/WorkflowUI.tsx','src/pages/advisor/ReceptionWorkflow.tsx','src/pages/advisor/AdvisorRepairOrders.tsx','src/pages/advisor/AdvisorRepairOrderDetail.tsx','src/pages/advisor/RepairOrderPanels.tsx','src/pages/advisor/Appointments.tsx'];
for (const file of files) {
  const contents = src(file);
  const result = ts.transpileModule(contents, { fileName: file, reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
  const errs = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errs.length, 0, `${file}: ${errs.map(e => ts.flattenDiagnosticMessageText(e.messageText,' ')).join(' | ')}`);
  assert.ok(result.outputText.length, file);
}
for (const candidate of fs.readdirSync(new URL('../src/pages/advisor/', import.meta.url))) {
  if (!candidate.endsWith('.tsx')) continue;
  const file = path.join('src/pages/advisor', candidate);
  assert.doesNotMatch(src(file), /http:\/\/localhost:\d+\/api/, file);
}
// Exercise the FE state-machine with simulated Laravel responses; no backend modifications.
const records = new Map([[7, { id: 7, status: 'PENDING', customer_id: 12, vehicle_id: 22, customer: { id: 12 }, vehicle: { id: 22 } }]]);
const repairOrders = [];
let creations = 0;
const actionLog = [];
const fakeApi = {
  fetchApi: async (route, options = {}) => {
    if (route.startsWith('/repair-orders?page=')) return { data: [...repairOrders], last_page: 1, current_page: 1, total: repairOrders.length };
    if (route === '/repair-orders' && options.method === 'POST') {
      creations++;
      const payload = JSON.parse(options.body);
      assert.equal(payload.appointment_id, 7);
      const value = { id: 100 + creations, repair_order_code: `RO-${creations}`, status: 'RECEIVED', ...payload };
      repairOrders.push(value);
      return value;
    }
    throw Error(`Unexpected mocked API route: ${route}`);
  },
};
const appointmentsApi = {
  getAdvisorAppointment: async id => ({ data: { ...records.get(id) } }),
  getAdvisorAppointments: async () => ({ data: [...records.values()], pagination: { last_page: 1 } }),
  confirmAdvisorAppointment: async id => { actionLog.push('confirm'); records.get(id).status = 'CONFIRMED'; return {}; },
  checkInAdvisorAppointment: async id => { actionLog.push('checkin'); records.get(id).status = 'CHECKED_IN'; return {}; },
};
const transpiled = ts.transpileModule(workflow, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
vm.runInNewContext(transpiled, { exports, require: name => name === './api' ? fakeApi : name === './advisorAppointmentService' ? appointmentsApi : (() => { throw Error(name); })(), URLSearchParams }, { filename: 'workflowService.js' });
await assert.rejects(() => exports.checkInConfirmedAppointment(7), /xác nhận/);
const confirmed = await exports.confirmPendingAppointment(7);
assert.equal(confirmed.status, 'CONFIRMED');
const received = await exports.checkInConfirmedAppointment(7);
assert.equal(received.status, 'CHECKED_IN');
const payload = { appointment_id: 7, customer_id: 12, vehicle_id: 22 };
await assert.rejects(() => exports.receiveRepairOrder({ ...payload, customer_id: 999 }), /không khớp/);
const first = await exports.receiveRepairOrder(payload);
assert.equal(first.existing, false);
assert.equal(first.order.status, 'RECEIVED');
const second = await exports.receiveRepairOrder(payload);
assert.equal(second.existing, true);
assert.equal(creations, 1, 'Duplicate repair order must not be POSTed');
assert.deepEqual(actionLog, ['confirm', 'checkin']);
console.log('PASS workflow: appointment confirmation -> check-in -> unique repair order -> advisor inspection and recommendations -> quotation -> advisor print; 9 TS/TSX files syntax valid.');
