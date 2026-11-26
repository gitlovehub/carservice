import assert from 'node:assert/strict';
import { load } from './loader.mjs';
const {isNavigationCurrent: active} = load('src/layouts/navigation.ts');
assert.equal(active('admin','/admin','/admin/reviews',''),false);
assert.equal(active('admin','/admin/reviews','/admin/reviews/42',''),true);
assert.equal(active('admin','/admin/reviews','/admin/reviews-old',''),false);
assert.equal(active('advisor','/advisor/service-orders?status=COMPLETED','/advisor/service-orders','?page=2&status=COMPLETED'),true);
assert.equal(active('advisor','/advisor/service-orders?status=COMPLETED','/advisor/service-orders','?status=IN_PROGRESS'),false);
