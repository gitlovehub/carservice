/** P2-D — biên bản nhận xe + đổi xe khi tiếp nhận: khách tự xác nhận hoặc OTP email chủ xe; nhân viên không tự xác nhận. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const panel = read('src/pages/advisor/CheckInPanel.tsx');
const detail = read('src/pages/advisor/AdvisorRepairOrderDetail.tsx');
const reception = read('src/pages/advisor/ReceptionWorkflow.tsx');
const evidence = read('src/services/evidenceService.ts');
const customer = read('src/pages/customer/RepairStatus.tsx');

assert.match(detail, /<CheckInPanel /, 'Order detail shows the check-in record');
assert.match(panel, /handoverApi\.submit/, 'Advisor submits the record to lock it');
assert.match(panel, /handoverApi\.requestOtp/, 'Counter confirmation goes through an OTP to the owner email');
assert.match(panel, /<PhotoUploader type="handover"/, 'Condition photos are attached to the record');
assert.match(panel, /minLength=\{5\}/, 'Voiding requires a reason');
assert.doesNotMatch(panel, /confirmAsCustomer/, 'Staff UI never calls the customer confirmation endpoint');
assert.match(evidence, /\/me\/handovers\/\$\{id\}\/confirm/, 'Customer confirms from their own account');
assert.match(customer, /handoverApi\.confirmAsCustomer/, 'Customer page lets the owner confirm');

assert.match(reception, /vehicle_change_reason/, 'Reception sends the vehicle change reason');
assert.match(reception, /vehicleChanged && changeReason\.trim\(\)\.length < 5/, 'Reason is required when the vehicle differs from the booking');

console.log('PASS P2-D: check-in record UI + vehicle change at reception.');
