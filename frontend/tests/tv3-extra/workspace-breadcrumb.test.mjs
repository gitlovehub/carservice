import assert from 'node:assert/strict';
import { load, plain } from './loader.mjs';
const {crumbs,navGroups,shellNavigation} = load('src/layouts/navigation.ts');
assert.deepEqual(plain(crumbs('advisor','/advisor/service-orders/42','')), [{label:'Cố vấn dịch vụ',to:'/advisor'},{label:'Phiếu sửa chữa',to:'/advisor/service-orders'},{label:'Chi tiết phiếu'}]);
assert.deepEqual(plain(crumbs('admin','/admin/profile','')), [{label:'Quản trị',to:'/admin'},{label:'Hồ sơ của bạn'}]);
for (const area of ['customer','advisor','admin']) {
 assert.deepEqual(plain(navGroups(area).flatMap(g=>g.items)),plain(shellNavigation[area]));
 const paths=shellNavigation[area].map(x=>x.path); assert.equal(new Set(paths).size,paths.length);
}
