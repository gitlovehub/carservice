import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {load,plain} from './loader.mjs';
const m=load('src/pages/showcase/serviceDisplay.ts',{'../../services/api':{API_BASE_URL:'/api'}});
assert.equal(m.foldVi('  ĐÈN   Lọc Dầu '),'den loc dau');assert.equal(m.foldVi(null),'');assert.equal(m.foldVi('Ắc quy'.normalize('NFD')),'ac quy');
console.log('PASS service-search');
