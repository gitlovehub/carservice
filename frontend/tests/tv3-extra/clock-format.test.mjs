import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {load,plain} from './loader.mjs';
const m=load('src/layouts/clock.ts',{'react':{}});
assert.deepEqual(plain(m.formatClock(new Date('2026-01-01T17:00:00Z'),true)),{time:'00:00:00',period:''});
assert.deepEqual(plain(m.formatClock(new Date('2026-01-01T05:15:32Z'),false)),{time:'12:15:32',period:'PM'});
assert.deepEqual(plain(m.formatClock(new Date('2026-01-01T17:00:00Z'),false)),{time:'12:00:00',period:'AM'});
console.log('PASS clock-format');
