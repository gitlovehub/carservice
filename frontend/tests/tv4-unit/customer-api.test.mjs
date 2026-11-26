import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceUrl, fetchStub } from './module-loader.mjs';
const api = await import(sourceUrl('services/customerApi.ts', [
  ['import { fetchApi } from "./api";', fetchStub],
  ['import { statusLabels } from "../config/status";', `import { statusLabels } from '${sourceUrl('config/status.ts')}';`],
]));

test('customer vehicle listing and mutations use self-service endpoints', async () => {
  const input = { model_id: 7, trim_id: 9, license_plate: null, mileage: 0 };
  const data = [{ id: 4, ...input }]; api.reply({ data });
  assert.deepEqual(await api.getMyVehicles(), data);
  await api.addMyVehicle(input); await api.updateMyVehicleMileage(4, 1200); await api.deleteMyVehicle(4);
  assert.deepEqual(api.calls, [
    ['/me/vehicles'], ['/me/vehicles', { method: 'POST', body: JSON.stringify(input) }],
    ['/me/vehicles/4', { method: 'PATCH', body: '{"mileage":1200}' }], ['/me/vehicles/4', { method: 'DELETE' }],
  ]);
});
test('appointment listing preserves filters and server pagination', async () => {
  const pagination = { current_page: 2, per_page: 5, total: 12, last_page: 3 };
  const data = [{ id: 9 }]; api.reply({ data, pagination });
  assert.deepEqual(await api.getMyAppointments({ status: 'CONFIRMED', page: 2, perPage: 5 }), { items: data, pagination });
  assert.deepEqual(api.calls, [['/appointments?status=CONFIRMED&page=2&per_page=5']]);
});
test('appointment listing safely defaults missing pagination and data', async () => {
  api.reply({ data: [{ id: 1 }] });
  assert.deepEqual(await api.getMyAppointments({ perPage: 8 }), { items: [{ id: 1 }], pagination: { current_page: 1, per_page: 8, total: 1, last_page: 1 } });
  api.reply({ data: {} });
  assert.deepEqual(await api.getMyAppointments(), { items: [], pagination: { current_page: 1, per_page: 10, total: 0, last_page: 1 } });
});
test('appointment reschedule and cancel requests preserve user input', async () => {
  api.reply({}); const input = { appointment_date: '2026-12-01', appointment_time: '09:00' };
  await api.updateAppointment(7, input); await api.cancelAppointment(7, 'Schedule changed');
  assert.deepEqual(api.calls, [['/appointments/7', { method: 'PATCH', body: JSON.stringify(input) }], ['/appointments/7/cancel', { method: 'POST', body: '{"cancel_reason":"Schedule changed"}' }]]);
});
test('billing and repair order queries use scoped routes', async () => {
  api.reply({ data: [{ id: 2 }] });
  assert.deepEqual(await api.getMyRepairOrders(), [{ id: 2 }]); assert.deepEqual(await api.getMyBillingOrders(), [{ id: 2 }]); await api.getMyRepairOrderDetail(2);
  assert.deepEqual(api.calls, [['/me/repair-orders'], ['/me/repair-orders?include=billing&per_page=100'], ['/me/repair-orders/2']]);
});
test('quotation response preserves explicit rejected items', async () => {
  api.reply({}); const responses = [{ item_id: 2, is_approved: true }, { item_id: 3, is_approved: false }];
  await api.respondQuotation(6, responses);
  assert.deepEqual(api.calls, [['/me/quotations/6/respond', { method: 'POST', body: JSON.stringify({ responses }) }]]);
});
test('review submission and listing use customer-scoped endpoints', async () => {
  api.reply({ data: [] }); assert.deepEqual(await api.getMyReviews(), []);
  const data = { repair_order_id: 3, overall_rating: 5, comment: 'Good' }; await api.submitReview(data);
  assert.deepEqual(api.calls, [['/me/reviews'], ['/me/reviews', { method: 'POST', body: JSON.stringify(data) }]]);
});
test('customer API preserves rejection for the UI error handler', async () => {
  const error = new Error('forbidden'); api.rejectWith(error);
  await assert.rejects(api.respondQuotation(6, []), e => e === error);
});
