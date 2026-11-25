import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source = readFileSync(new URL('../../src/services/vehicleCatalog.ts', import.meta.url), 'utf8');
// Isolate the adapter from network and Vite; capture real adapter calls.
const stubbed = source.replace('import { API_BASE_URL, fetchApi } from "./api";', 'const API_BASE_URL = "/api"; export const calls = []; const fetchApi = async (...args) => { calls.push(args); return {data: []}; };');
assert.notEqual(stubbed, source);
const { calls, vehicleCatalogApi, adminVehicleCatalogApi, selectionFromVehicle, foldText, vehicleDisplayName, brandLogoUrl } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(stubbed)).toString('base64'));
test('catalog search trims and encodes search and forwards signal', async () => {
  const signal = new AbortController().signal;
  assert.deepEqual(await vehicleCatalogApi.brands('  A & B  ',signal),[]);
  assert.deepEqual(calls.pop(),['/vehicle-catalog/brands?search=A%20%26%20B',{signal}]);
});
test('catalog model and trim requests use parent IDs', async () => {
  await vehicleCatalogApi.models(12,' '); assert.equal(calls.pop()[0],'/vehicle-catalog/brands/12/models');
  await vehicleCatalogApi.trims(34); assert.equal(calls.pop()[0],'/vehicle-catalog/models/34/trims');
});
test('admin list excludes blank and undefined filters but preserves zero', async () => {
  await adminVehicleCatalogApi.list('models',{brand_id:0,search:'',status:undefined,page:2});
  const [path] = calls.pop(); assert.equal(path,'/admin/vehicle-models?brand_id=0&page=2');
});
test('admin CRUD uses correct methods and JSON bodies', async () => {
  await adminVehicleCatalogApi.create('brands',{name:'Test'}); assert.deepEqual(calls.pop(),['/admin/vehicle-brands',{method:'POST',body:'{"name":"Test"}'}]);
  await adminVehicleCatalogApi.update('models',7,{name:'Updated'}); assert.deepEqual(calls.pop(),['/admin/vehicle-models/7',{method:'PATCH',body:'{"name":"Updated"}'}]);
  await adminVehicleCatalogApi.remove('trims',8); assert.deepEqual(calls.pop(),['/admin/vehicle-trims/8',{method:'DELETE'}]);
});
test('saved vehicle selection prefers related IDs and supports legacy IDs', () => {
  assert.deepEqual(selectionFromVehicle({model_id:9,trim_id:8}),{brandId:null,brandName:'',modelId:9,modelName:'',trimId:8,trimName:''});
  assert.deepEqual(selectionFromVehicle({model:{id:2,name:'Vios',brand:{id:1,name:'Toyota'}},trim:{id:3,name:'G'}}),{brandId:1,brandName:'Toyota',modelId:2,modelName:'Vios',trimId:3,trimName:'G'});
});
test('Vietnamese search folds accents and whitespace', () => { assert.equal(foldText('  Động Cơ  '),'dong co'); });
test('display name prefers trim and supports legacy variant', () => {
  const model={name:'Vios',brand:{name:'Toyota'}};
  assert.equal(vehicleDisplayName({model,trim:{name:'G'},variant:'E'}),'Toyota Vios G');
  assert.equal(vehicleDisplayName({model,variant:'E'}),'Toyota Vios E');
});
test('brand logo URL includes version for cache busting', () => { assert.equal(brandLogoUrl(7,3),'/api/vehicle-catalog/brands/7/logo?v=3'); });
