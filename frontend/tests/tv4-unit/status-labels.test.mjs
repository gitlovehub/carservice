import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceUrl } from './module-loader.mjs';
const { getStatus, statusLabels, STATUS } = await import(sourceUrl('config/status.ts'));
test('quotation status uses audience-specific labels without changing its tone', () => {
  assert.deepEqual(getStatus('quotation', 'sent', 'customer'), { label: 'Chờ bạn duyệt', tone: 'warning' });
  assert.deepEqual(getStatus('quotation', 'SENT', 'staff'), { label: 'Đã gửi khách', tone: 'warning' });
});
test('completed repair is displayed as awaiting payment for staff', () => {
  assert.deepEqual(getStatus('repair', 'COMPLETED'), { label: 'Chờ thanh toán', tone: 'success' });
  assert.deepEqual(getStatus('repair', 'COMPLETED', 'customer'), { label: 'Đã hoàn tất', tone: 'success' });
});
test('unknown and missing status remain visible with a neutral tone', () => {
  assert.deepEqual(getStatus('account', 'FUTURE_CODE'), { label: 'FUTURE_CODE', tone: 'neutral' });
  for (const value of [null, undefined, '']) assert.deepEqual(getStatus('account', value), { label: 'Chưa cập nhật', tone: 'neutral' });
});
test('legacy appointment CREATED maps to PENDING label and tone', () => {
  assert.deepEqual(getStatus('appointment', 'CREATED'), getStatus('appointment', 'PENDING'));
});
test('all status label maps cover their declared codes for each audience', () => {
  for (const domain of Object.keys(STATUS)) for (const audience of ['customer', 'staff']) {
    const labels = statusLabels(domain, audience);
    assert.deepEqual(Object.keys(labels), Object.keys(STATUS[domain]));
    for (const code of Object.keys(labels)) assert.equal(labels[code], getStatus(domain, code, audience).label);
  }
});
