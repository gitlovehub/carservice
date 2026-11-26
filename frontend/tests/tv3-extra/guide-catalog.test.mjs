import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {load,plain} from './loader.mjs';
const m=load('src/pages/showcase/serviceGuides.ts',{});
assert.equal(new Set(m.SERVICE_GUIDES.map(x=>x.slug)).size,m.SERVICE_GUIDES.length);
for(const guide of m.SERVICE_GUIDES){assert.equal(m.findGuide(guide.slug),guide);assert.equal(m.guideSlugOf(' '+guide.category.toUpperCase()+' '),guide.slug);assert.ok(guide.intro.length&&guide.when.length&&guide.includes.length);assert.ok(existsSync('public'+guide.image));}
assert.equal(m.findGuide('unknown'),null);assert.equal(m.guideSlugOf(null),null);
console.log('PASS guide-catalog');
