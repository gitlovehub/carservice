import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sandbox, mountFinal, ui, tick } from './final-harness.mjs';
function setup(query){let params=new URLSearchParams(query), options;const e=sandbox();const {useDeepLink}=e.load('pages/customer/account/useDeepLink.ts',{'react':{useCallback:f=>f},'react-router-dom':{useSearchParams:()=>[params,(update,o)=>{params=update(params);options=o;}]}});return {hook:useDeepLink('order'),params:()=>params,options:()=>options};}
test('deep link reads the requested modal identifier',()=>assert.equal(setup('order=12&page=2').hook.value,'12'));
test('clear removes only the selected parameter and replaces history',()=>{const x=setup('order=12&page=2&filter=sent');x.hook.clear();assert.equal(x.params().toString(),'page=2&filter=sent');assert.deepEqual(x.options(),{replace:true});});
test('missing deep link is a no-op and returns the same params object',()=>{const x=setup('page=2'),before=x.params();assert.equal(x.hook.value,null);x.hook.clear();assert.equal(x.params(),before);});
