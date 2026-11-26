import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {load,plain} from './loader.mjs';
const m=load('src/pages/showcase/serviceDisplay.ts',{'../../services/api':{API_BASE_URL:'https://example.test/api'}});
assert.equal(m.serviceImage({image_url:'/api/service-images/5?v=2'}),'https://example.test/api/service-images/5?v=2');assert.equal(m.serviceImage({image_url:'/images/a.webp'}),'/images/a.webp');assert.equal(m.serviceImage({image_url:null}),null);
console.log('PASS service-image-url');
