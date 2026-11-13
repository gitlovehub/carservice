import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'../../');
const read=(path)=>readFileSync(resolve(root,path),'utf8');
const assets=resolve(root,'frontend/public/showcase');
for(const name of ['hero-red-suv.webp','hero-white-sedan.webp','hero-premium-suv.webp','service-1.webp','service-2.webp','service-3.webp','service-4.webp','service-5.webp','service-6.webp','car-detail.webp']){
  assert(statSync(resolve(assets,name)).size>100000,`${name} must not be a tiny placeholder`);
}
const home=read('frontend/src/pages/showcase/ReferenceHome.tsx');
for(const name of ['hero-red-suv.webp','hero-white-sedan.webp','hero-premium-suv.webp']) assert(home.includes(name),`missing ${name}`);
assert(home.includes('style={{backgroundImage:`url(${selected.image})`}}'),'carousel must change image with slide');
const inv=read('frontend/src/pages/admin/Inventory.tsx');
for(const name of ['type="file"','adminApi.uploadPartImage','adminApi.deletePartImage','part.image_url'])assert(inv.includes(name),`missing UI ${name}`);
const control=read('backend/app/Http/Controllers/Api/AdminInventoryController.php');
for(const name of ['function uploadImage','function deleteImage','function showImage','image_url','mimes:jpg,jpeg,png,webp','max:4096'])assert(control.includes(name),`missing controller ${name}`);
const routes=read('backend/routes/api.php');
for(const name of ["Route::post('parts/{part}/image'", "Route::delete('parts/{part}/image'", "Route::get('part-images/{part}'"])assert(routes.includes(name),`missing route ${name}`);
assert(read('backend/database/migrations/2026_11_12_200000_add_image_path_to_parts_table.php').includes("$table->string('image_path'"));
console.log('PASS: V3 sharp slider images, service assets, admin image UI, Laravel upload/delete/view endpoints, migration');
