import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

// Replace only the Vite-dependent API import; execute the real session logic.
const source = readFileSync(new URL('../../src/services/authPersistence.ts', import.meta.url), 'utf8');
const stubbed = source.replace('import { API_BASE_URL } from "./api";', 'const API_BASE_URL = "/api";');
assert.notEqual(stubbed, source);
const { markAuthSession, clearAuthSessionMarker, expireUnrememberedSession } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(stubbed)).toString('base64'));

function browser(t, values = {}, cookie = '') {
  const store = new Map(Object.entries(values));
  const requests = [];
  const mocks = { localStorage: { getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v), removeItem: k => store.delete(k) }, document: { cookie }, fetch: async (...args) => { requests.push(args); } };
  for (const [key, value] of Object.entries(mocks)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
  }
  return { store, requests };
}
const flag = 'carservice_auth_persist';
test('remember choice and session cookie are recorded', t => {
  const { store } = browser(t);
  markAuthSession(true); assert.equal(store.get(flag), '1');
  markAuthSession(false); assert.equal(store.get(flag), '0');
  assert.match(document.cookie, /^cs_session_alive=1;/);
  assert.match(document.cookie, /SameSite=Lax/);
});
test('logout clears persistence marker and expires cookie', t => {
  const { store } = browser(t, { [flag]: '1' });
  clearAuthSessionMarker(); assert.equal(store.has(flag), false);
  assert.match(document.cookie, /max-age=0/);
});
test('remembered session survives missing cookie', t => {
  const { store, requests } = browser(t, { [flag]: '1', token: 'demo' });
  expireUnrememberedSession(); assert.equal(store.get('token'), 'demo'); assert.equal(requests.length, 0);
});
test('active browser session keeps unremembered login', t => {
  const { store, requests } = browser(t, { [flag]: '0', token: 'demo' }, 'other=1; cs_session_alive=1');
  expireUnrememberedSession(); assert.equal(store.get('token'), 'demo'); assert.equal(requests.length, 0);
});
test('expired unremembered session clears auth keys and revokes bearer token', t => {
  const { store, requests } = browser(t, { [flag]: '0', token: 'demo', role: 'CUSTOMER', user: '{}', authToken: 'demo', isLoggedIn: 'true', theme: 'dark' });
  expireUnrememberedSession(); assert.deepEqual([...store], [['theme','dark']]);
  assert.equal(requests.length, 1); assert.equal(requests[0][0], '/api/logout');
  assert.equal(requests[0][1].method, 'POST'); assert.equal(requests[0][1].headers.Authorization, 'Bearer demo');
  assert.equal(requests[0][1].keepalive, true);
});
test('cookie authentication marker is cleared without bearer revocation', t => {
  const { store, requests } = browser(t, { [flag]: '0', token: 'session_authenticated' });
  expireUnrememberedSession(); assert.equal(store.has('token'), false); assert.equal(requests.length, 0);
});
