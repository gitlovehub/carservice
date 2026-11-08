/** P6-FE — phụ tùng chờ: cố vấn đặt hàng / nhận hàng / hủy có lý do; khách thấy phụ tùng chờ + ngày dự kiến về. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const panel = read('src/pages/advisor/PartRequestsPanel.tsx');
const panels = read('src/pages/advisor/RepairOrderPanels.tsx');
const customer = read('src/pages/customer/RepairStatus.tsx');
assert.match(panels, /<PartRequestsPanel /, 'Repair step lists pending parts');
assert.match(panel, /\/part-requests\/\$\{row\.id\}\/order/, 'Advisor records the order + ETA');
assert.match(panel, /\/part-requests\/\$\{row\.id\}\/receive/, 'Advisor marks parts as received (restock + notify)');
assert.match(panel, /trim\(\)\.length < 5/, 'Cancelling requires a reason');
assert.match(customer, /Phụ tùng đang chờ/, 'Customer sees pending parts');
assert.doesNotMatch(customer, /supplier_note/, 'Customer never sees supplier notes');
console.log('PASS P6-FE: pending parts UI.');
