import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readPageCache, pageCacheSaver } from '../../src/services/pageCache.ts';
const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
let token;
beforeEach(() => {
  token = Symbol().toString();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => token } });
  token = 'reset'; readPageCache('reset'); token = 'A'; readPageCache('reset');
});
afterEach(() => { if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage; });
test('missing keys return null and saved data can be overwritten', () => {
  assert.equal(readPageCache('cars'), null);
  pageCacheSaver('cars')([1]); assert.deepEqual(readPageCache('cars'), [1]);
  pageCacheSaver('cars')([]); assert.deepEqual(readPageCache('cars'), []);
});
test('changing account or signing out clears cached data', () => {
  pageCacheSaver('profile')({ name: 'A' }); token = 'B';
  assert.equal(readPageCache('profile'), null);
  pageCacheSaver('profile')({ name: 'B' }); token = null;
  assert.equal(readPageCache('profile'), null);
});
test('late responses from another account cannot populate the current cache', () => {
  const save = pageCacheSaver('profile'); token = 'B';
  pageCacheSaver('profile')('B'); save('A'); assert.equal(readPageCache('profile'), 'B');
});
test('cache holds at most 30 entries and refreshes insertion order on overwrite', () => {
  for (let i = 0; i < 30; i++) pageCacheSaver(`key${i}`)(i);
  pageCacheSaver('key0')(100); pageCacheSaver('key30')(30);
  assert.equal(readPageCache('key1'), null); assert.equal(readPageCache('key0'), 100); assert.equal(readPageCache('key30'), 30);
});
