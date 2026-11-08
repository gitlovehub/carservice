/** P4-D — trả xe: người nhận là chủ xe hoặc người chủ xe ủy quyền; chủ xe tự khai báo / thu hồi ủy quyền. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const panel = read('src/pages/advisor/CheckInPanel.tsx');
const detail = read('src/pages/advisor/AdvisorRepairOrderDetail.tsx');
const evidence = read('src/services/evidenceService.ts');
const customer = read('src/pages/customer/RepairStatus.tsx');

assert.match(detail, /<CheckInPanel type="CHECK_OUT"/, 'Order detail shows the check-out record');
assert.match(panel, /filter\(\(\[value\]\) => !isOut \|\| value !== "OTHER"\)/, 'Check-out recipient cannot be an unauthorized other person');
assert.match(panel, /activeAuthorizations/, 'Authorized recipient is picked from owner-declared authorizations');
assert.match(panel, /Khác lúc nhận xe/, 'Discrepancies against check-in are shown');
assert.match(evidence, /\/me\/repair-orders\/\$\{orderId\}\/pickup-authorizations/, 'Owner declares authorizations from their account');
assert.match(evidence, /apiClient\.delete<PickupAuthorization>\(`\/me\/pickup-authorizations\/\$\{id\}`\)/, 'Owner can revoke');
assert.match(customer, /<CustomerPickupBlock /, 'Customer page has the pickup authorization block');
assert.doesNotMatch(panel, /pickupAuthorizationApi/, 'Staff UI never creates authorizations on behalf of the owner');

console.log('PASS P4-D: check-out + pickup authorization UI.');
