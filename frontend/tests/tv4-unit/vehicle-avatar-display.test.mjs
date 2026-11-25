import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sandbox, mountFinal, ui, tick } from './final-harness.mjs';
const setup=path=>mountFinal('components/vehicle/VehicleAvatar.tsx','VehicleAvatar',{props:{path,name:'Vios'}});
test('missing avatar displays a labeled fallback instead of a broken image',()=>{const x=setup(null);assert.equal(x.all(n=>n.type==='img').length,0);assert.equal(x.one(n=>n.props.role==='img').props['aria-label'],'Xe Vios chưa có ảnh');});
test('stored avatar path is served through the configured API',()=>{const x=setup('vehicles/avatar-1.webp');assert.equal(x.one(n=>n.type==='img').props.src,'/api/vehicle-avatars/avatar-1.webp');assert.equal(x.one(n=>n.type==='img').props.loading,'lazy');});
test('image error falls back and a different avatar can be loaded',()=>{const x=setup('a.png');x.one(n=>n.type==='img').props.onError();assert.equal(x.all(n=>n.type==='img').length,0);x.props({path:'b.png',name:'Vios'});assert.equal(x.one(n=>n.type==='img').props.src,'/api/vehicle-avatars/b.png');});
