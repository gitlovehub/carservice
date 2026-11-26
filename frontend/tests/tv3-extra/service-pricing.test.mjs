import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {load,plain} from './loader.mjs';
const m=load('src/pages/showcase/serviceDisplay.ts',{'../../services/api':{API_BASE_URL:'/api'}});
for(const value of [null,undefined,'','abc',Infinity]) assert.equal(m.money(value),'Liên hệ tư vấn');
assert.equal(m.money(0),m.money('0'));assert.match(m.money(120000),/^Từ /);assert.equal(m.money(120000),m.money('120000'));
console.log('PASS service-pricing');
