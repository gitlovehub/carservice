import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sandbox, mountFinal, ui, tick } from './final-harness.mjs';
function setup(brand,uploaded=new Map()){return mountFinal('components/vehicle/VehicleBrandLogo.tsx','VehicleBrandLogo',{props:{brand},modules:{'../../services/vehicleCatalog':{brandLogoSnapshot:()=>uploaded,subscribeBrandLogos:()=>()=>{},loadBrandLogos:async()=>{}}}});}
test('known brand alias uses bundled logo and ignores surrounding whitespace',()=>{const x=setup(' Mercedes ');assert.equal(x.one(n=>n.type==='img').props.src,'/brand-logos/mercedes-benz.png');});
test('uploaded logo takes precedence over bundled logo',()=>{const x=setup('Toyota',new Map([['toyota','/custom/toyota.png']]));assert.equal(x.one(n=>n.type==='img').props.src,'/custom/toyota.png');});
test('unknown and missing brand render initial or question-mark fallback',()=>{for(const [brand,initial] of [['Unknown','U'],[null,'?']]){const x=setup(brand);assert.equal(x.all(n=>n.type==='img').length,0);assert.equal(x.render().props.children.props.children,initial);}});
test('failed brand image does not block a different logo',()=>{const x=setup('Toyota');x.one(n=>n.type==='img').props.onError();assert.equal(x.all(n=>n.type==='img').length,0);x.props({brand:'Honda'});assert.equal(x.one(n=>n.type==='img').props.src,'/brand-logos/honda.png');});
