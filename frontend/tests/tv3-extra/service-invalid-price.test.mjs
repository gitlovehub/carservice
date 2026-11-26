import assert from 'node:assert/strict';
import {component} from './component-harness.mjs';
const {money}=component('src/pages/showcase/serviceDisplay.ts',{'../../services/api':{API_BASE_URL:'/api'}});
for(const price of [null,undefined,'','  ', -1,'-50',NaN,Infinity,'abc']) assert.equal(money(price),'Liên hệ tư vấn');
assert.match(money(0),/^Từ 0/); assert.equal(money('100000'),money(100000));
