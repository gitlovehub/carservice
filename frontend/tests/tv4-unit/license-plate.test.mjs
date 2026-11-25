import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatLicensePlate, isValidLicensePlate, licensePlateError, LICENSE_PLATE_ERROR } from '../../src/services/licensePlate.ts';
test('formats four and five digit plates', () => {
  for (const [input, expected] of [['30a12345','30A-123.45'], ['29ld1234','29LD-1234'], [' 30a-123.45 ','30A-123.45']]) assert.equal(formatLicensePlate(input), expected);
});
test('handles partial input and punctuation', () => {
  assert.equal(formatLicensePlate('51k'), '51K');
  assert.equal(formatLicensePlate('! '), '');
  assert.equal(formatLicensePlate('AB 12'), 'AB12');
});
test('validates supported plate format and province range', () => {
  for (const plate of ['11A-1234','99AB-123.45','30A-123.45']) assert.equal(isValidLicensePlate(plate), true, plate);
  for (const plate of ['10A-1234','00A-123.45','30A-123','30a-1234','30ABC-1234','30A12345']) assert.equal(isValidLicensePlate(plate), false, plate);
});
test('allows empty and unchanged legacy plates, rejects new invalid values', () => {
  assert.equal(licensePlateError('  '), '');
  assert.equal(licensePlateError(' old-plate ', 'OLD-PLATE'), '');
  assert.equal(licensePlateError(' 30a-123.45 '), '');
  assert.equal(licensePlateError('new-invalid', 'old-plate'), LICENSE_PLATE_ERROR);
});
