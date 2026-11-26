import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {load,plain} from './loader.mjs';
const m=load('src/services/servicePicks.ts',{'react':{}});
assert.equal(m.bookingLinkFor({ids:[],symptom:''}),'/booking');const url=new URL(m.bookingLinkFor({ids:[1,3],symptom:'Máy nóng & rung'}),'https://example.test');assert.equal(url.searchParams.get('services'),'1,3');assert.equal(url.searchParams.get('symptom'),'Máy nóng & rung');
console.log('PASS booking-link');
