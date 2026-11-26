import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {load,plain} from './loader.mjs';
const m=load('src/components/ui/tableSort.ts',{'react':{}});
assert.equal(m.ariaSort({key:'name',dir:'asc'},'name'),'ascending');
assert.equal(m.ariaSort({key:'name',dir:'desc'},'name'),'descending');
assert.equal(m.ariaSort({key:'name',dir:'desc'},'code'),undefined);
assert.equal(m.ariaSort(undefined,'code'),undefined);
console.log('PASS sort-accessibility');
