import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceUrl, fetchStub } from './module-loader.mjs';
const api = await import(sourceUrl('services/customerApi.ts', [
  ['import { fetchApi } from "./api";', fetchStub],
  ['import { statusLabels } from "../config/status";', `import { statusLabels } from '${sourceUrl('config/status.ts')}';`],
]));
test('advisor customer search encodes text and returns pagination', async () => {
  const result = { data: [{ id: 3 }], current_page: 2, last_page: 3, per_page: 5, total: 13 };
  api.reply({ data: result });
  assert.deepEqual(await api.getAdvisorCustomers({ search: '  A & B  ', page: 2 }), result);
  assert.deepEqual(api.calls, [['/customers?search=A+%26+B&page=2']]);
});
test('advisor customer listing handles absent data', async () => {
  api.reply(undefined);
  assert.deepEqual(await api.getAdvisorCustomers({ search: ' ' }), { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0 });
  assert.deepEqual(api.calls, [['/customers?page=1']]);
});
test('advisor customer creation, partial update and detail use correct routes', async () => {
  const input = { full_name: 'Test customer', phone: '0900000000', email: null }; const data = { id: 4, ...input };
  api.reply({ data });
  assert.deepEqual(await api.createAdvisorCustomer(input), data);
  assert.deepEqual(await api.updateAdvisorCustomer(4, { email: null }), data);
  assert.deepEqual(await api.getAdvisorCustomerDetail(4), data);
  assert.deepEqual(api.calls, [['/customers', { method: 'POST', body: JSON.stringify(input) }], ['/customers/4', { method: 'PATCH', body: '{"email":null}' }], ['/customers/4']]);
});
