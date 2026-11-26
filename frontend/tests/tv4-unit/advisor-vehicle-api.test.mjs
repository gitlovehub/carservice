import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceUrl, fetchStub } from './module-loader.mjs';
const api = await import(sourceUrl('services/advisorVehicleService.ts', [['import { fetchApi } from "./api";', fetchStub]]));

test('advisor vehicle search trims input and preserves pagination', async () => {
  const data = [{ id: 8, customer_id: 3 }];
  api.reply({ data: { data, current_page: 2, last_page: 4, per_page: 10, total: 35 } });
  assert.deepEqual(await api.getAdvisorVehicles({ search: '  A & B  ', page: 2 }), { data, current_page: 2, last_page: 4, per_page: 10, total: 35 });
  assert.deepEqual(api.calls, [['/vehicles?search=A+%26+B&page=2']]);
});
test('advisor vehicle listing handles absent and malformed data', async () => {
  for (const response of [undefined, { data: { data: null } }, { data: { data: {} } }]) {
    api.reply(response);
    assert.deepEqual(await api.getAdvisorVehicles({ search: '  ' }), { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0 });
    assert.deepEqual(api.calls, [['/vehicles?page=1']]);
  }
});
test('advisor vehicle creation passes customer, model and trim IDs', async () => {
  const input = { customer_id: 3, model_id: 7, trim_id: 9, license_plate: '30A-123.45', mileage: 0 };
  api.reply({ data: { id: 8, ...input } });
  assert.deepEqual(await api.createAdvisorVehicle(input), { id: 8, ...input });
  assert.deepEqual(api.calls, [['/vehicles', { method: 'POST', body: JSON.stringify(input) }]]);
});
test('advisor update and deletion target the selected vehicle', async () => {
  api.reply({ data: { id: 8, note: '' } });
  assert.deepEqual(await api.updateAdvisorVehicle(8, { note: '', trim_id: null }), { id: 8, note: '' });
  await api.deleteAdvisorVehicle(8);
  assert.deepEqual(api.calls, [['/vehicles/8', { method: 'PUT', body: '{"note":"","trim_id":null}' }], ['/vehicles/8', { method: 'DELETE' }]]);
});
test('advisor vehicle mutation propagates API failure', async () => {
  const error = new Error('request rejected'); api.rejectWith(error);
  await assert.rejects(api.deleteAdvisorVehicle(8), e => e === error);
});
