import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceUrl } from './module-loader.mjs';
const stub = `export const calls = []; let responder;
export function setResponder(fn) { responder = fn; calls.length = 0; }
const fetchApi = async (...args) => { calls.push(args); return responder(...args); };
const apiClient = { post: () => { throw new Error('Unexpected network call'); } };`;
const api = await import(sourceUrl('services/liveSync.ts', [
  ['import { useEffect, useRef } from "react";', 'const useEffect = () => { throw new Error("Hook not under test"); }; const useRef = useEffect;'],
  ['import { apiClient, fetchApi } from "./api";', stub],
]));
const flush = () => new Promise(resolve => setImmediate(resolve));
function fakeBrowser(t) {
  const window = new EventTarget(); const document = new EventTarget(); document.visibilityState = 'visible';
  const timers = new Map(); let nextId = 0; let events = 0;
  window.setTimeout = (fn, delay) => { const id = ++nextId; timers.set(id, { fn, delay }); return id; };
  window.clearTimeout = id => timers.delete(id);
  window.addEventListener(api.LIVE_EVENT, () => events++);
  const previous = [Object.getOwnPropertyDescriptor(globalThis,'window'),Object.getOwnPropertyDescriptor(globalThis,'document')];
  Object.defineProperty(globalThis,'window',{value:window, configurable:true}); Object.defineProperty(globalThis,'document',{value:document, configurable:true});
  let stop;
  t.after(() => { stop?.(); for (const [i,key] of ['window','document'].entries()) { if (previous[i]) Object.defineProperty(globalThis,key,previous[i]); else delete globalThis[key]; } });
  return { document, timers, events: () => events, start: () => { stop = api.startLiveSync({id:1,role:'CUSTOMER'}); }, stop: () => stop(), async tick() { assert.equal(timers.size,1); const [id,{fn,delay}] = timers.entries().next().value; assert.equal(delay,4000); timers.delete(id); fn(); await flush(); } };
}
test('polling emits only when the stamp changes and schedules fallback interval', async t => {
  const b = fakeBrowser(t); let stamp='a'; api.setResponder(async () => ({stamp})); b.start(); await flush();
  assert.equal(b.events(),0); await b.tick(); assert.equal(b.events(),0); stamp='b'; await b.tick(); assert.equal(b.events(),1);
  assert.deepEqual(api.calls, [['/live'], ['/live'], ['/live']]);
});
test('hidden document skips requests and visible event refreshes data', async t => {
  const b=fakeBrowser(t); api.setResponder(async () => ({stamp:'a'})); b.document.visibilityState='hidden'; b.start(); await flush();
  assert.equal(api.calls.length,0); await b.tick(); assert.equal(api.calls.length,0); b.document.visibilityState='visible'; b.document.dispatchEvent(new Event('visibilitychange')); await flush(); assert.equal(api.calls.length,1);
});
test('polling prevents overlapping requests while one is pending', async t => {
  const b=fakeBrowser(t); let resolve; api.setResponder(() => new Promise(r => {resolve=r;})); b.start();
  b.document.dispatchEvent(new Event('visibilitychange')); assert.equal(api.calls.length,1); resolve({stamp:'a'}); await flush(); assert.equal(b.timers.size,1);
});
test('polling recovers from request failure and cleanup cancels future polling', async t => {
  const b=fakeBrowser(t); let fail=true; api.setResponder(async () => {if(fail) throw new Error('offline'); return {stamp:'a'};}); b.start(); await flush(); fail=false; await b.tick(); assert.equal(api.calls.length,2); b.stop(); assert.equal(b.timers.size,0); b.document.dispatchEvent(new Event('visibilitychange')); await flush(); assert.equal(api.calls.length,2);
});
