import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {load,plain} from './loader.mjs';
const m=load('src/pages/showcase/serviceDisplay.ts',{'../../services/api':{API_BASE_URL:'/api'}});
const data=[{id:1,popularity_rank:null},{id:2,popularity_rank:2},{id:3,popularity_rank:1},{id:4,popularity_rank:null}];assert.deepEqual(data.sort(m.byPopularity).map(x=>x.id),[3,2,4,1]);assert.ok(m.byPopularity({id:1,created_at:'2026-02-01'},{id:2,created_at:'2026-01-01'})<0);
console.log('PASS service-popularity');
