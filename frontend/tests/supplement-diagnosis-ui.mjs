/** P3-C — phát sinh không thay thế báo giá gốc; khách thấy nhãn phát sinh + lý do + chẩn đoán. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const workflow = read('src/services/workflowService.ts');
const panels = read('src/pages/advisor/RepairOrderPanels.tsx');
const supplement = read('src/pages/advisor/SupplementPanel.tsx');
const detail = read('src/pages/advisor/AdvisorRepairOrderDetail.tsx');
const customerQuote = read('src/pages/customer/Quotation.tsx');
const status = read('src/pages/customer/RepairStatus.tsx');

assert.match(workflow, /filter\(q => \(q\.type \?\? "INITIAL"\) === "INITIAL"\)/, 'latestQuotation must ignore supplements (matches backend)');
assert.match(panels, /billableQuotations\(order\)/, 'Used parts list = initial + approved supplements');
assert.match(detail, /<SupplementPanel /, 'Advisor can create supplements during repair');
assert.match(supplement, /type: "SUPPLEMENT"/, 'Supplement is created with its type');
assert.match(supplement, /minLength=\{5\}/, 'Supplement reason is required');
assert.match(supplement, /<CounterApprovalPanel /, 'Counter approval of supplements goes through the owner email OTP');
assert.doesNotMatch(supplement, /discount_amount/, 'No discount on supplements');
assert.match(customerQuote, /Phát sinh/, 'Customer sees the supplement label');
assert.match(customerQuote, /quotation\.reason/, 'Customer sees the supplement reason');
assert.match(status, /<CustomerDiagnosisBlock /, 'Customer sees the diagnosis');

console.log('PASS P3-C: supplement + diagnosis UI.');
