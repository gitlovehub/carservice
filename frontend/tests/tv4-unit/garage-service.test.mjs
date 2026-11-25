import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceUrl } from './module-loader.mjs';
const apiStub = `export const calls = []; let response; let failure;
export function reply(data) { response = data; failure = undefined; calls.length = 0; }
export function rejectWith(error) { failure = error; calls.length = 0; }
const request = async (method, ...args) => { calls.push([method, ...args]); if (failure) throw failure; return { data: { data: response } }; };
const apiClient = { get: (...args) => request('GET', ...args), put: (...args) => request('PUT', ...args) };`;
const api = await import(sourceUrl('services/garageService.ts', [
  ['import { useEffect, useState } from "react";', 'const useEffect = () => { throw new Error("Hook not under test"); }; const useState = useEffect;'],
  ['import { apiClient } from "./api";', apiStub],
]));
test('garage address joins only available address components', () => {
  assert.equal(api.formatGarageAddress(null), null);
  assert.equal(api.formatGarageAddress({ province: 'Hanoi' }), null);
  assert.equal(api.formatGarageAddress({ address_line: '12 Main St', ward: null, district: 'District', province: 'Hanoi' }), '12 Main St, District, Hanoi');
});
test('hotline formatting normalizes ten digits and preserves other lengths', () => {
  assert.equal(api.formatPhone('090-123-4567'), '090 123 4567');
  assert.equal(api.formatPhone(' 1900 1234 '), '1900 1234');
  assert.equal(api.formatPhone(' +84 90 123 4567 '), '+84 90 123 4567');
});
test('garage information shares one cached request and updates after save', async () => {
  const original = { name: 'Garage' }; api.reply(original);
  const first = api.garageApi.get(); const second = api.garageApi.get();
  assert.equal(first, second); assert.deepEqual(await first, original); assert.deepEqual(api.calls, [['GET', '/garage-settings']]);
  const updated = { name: 'Updated', phone: '0901234567' }; api.reply(updated);
  assert.deepEqual(await api.garageApi.save(updated), updated); assert.deepEqual(await api.garageApi.get(), updated);
  assert.deepEqual(api.calls, [['PUT', '/admin/garage-settings', updated]]);
});
test('address autocomplete forwards search and abort signal; place lookup uses place ID', async () => {
  const signal = new AbortController().signal; api.reply([]);
  assert.deepEqual(await api.garageApi.suggest('Hanoi', signal), []);
  const location = { latitude: 21, longitude: 105, description: 'Test' }; api.reply(location);
  assert.deepEqual(await api.garageApi.place('test-id'), location);
  assert.deepEqual(api.calls, [['GET', '/address/place', { params: { place_id: 'test-id' } }]]);
  api.reply([]); await api.garageApi.suggest('Hanoi', signal);
  assert.deepEqual(api.calls, [['GET', '/address/suggest', { params: { q: 'Hanoi' }, signal }]]);
});
test('garage save failure propagates without replacing cached data', async () => {
  const error = new Error('save rejected'); api.rejectWith(error);
  await assert.rejects(api.garageApi.save({ name: 'Invalid' }), e => e === error);
  assert.deepEqual(await api.garageApi.get(), { name: 'Updated', phone: '0901234567' });
});
