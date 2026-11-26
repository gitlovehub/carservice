/** P0 — chỉ khách được duyệt báo giá; giao diện/API phía nhân viên không có đường "ghi nhận thay khách". */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const panels = read('src/pages/advisor/RepairOrderPanels.tsx');
const workflow = read('src/services/workflowService.ts');
const customerApi = read('src/services/customerApi.ts');
const routes = read('../backend/routes/api.php');

assert.doesNotMatch(panels, /respondQuotation|Ghi nhận phản hồi tại quầy|setApprovals/, 'Advisor UI must not record quotation responses');
assert.match(panels, /Chỉ khách được đồng ý hoặc từ chối/, 'Advisor UI must explain that only the customer approves');
assert.doesNotMatch(workflow, /\/quotations\/\$\{quotationId\}\/respond/, 'Staff API client must not call respond');
assert.match(customerApi, /\/me\/quotations\/\$\{quotationId\}\/respond/, 'Customer approval endpoint must remain');
assert.doesNotMatch(routes, /Route::post\('respond', 'respond'\)/, 'Backend must not expose a staff respond route');
console.log('PASS P0: quotation approval is customer-only (UI, API client, routes).');
