/** Khu "Hồ sơ của tôi": các trang tài khoản khách dùng chung sidebar; menu chính chỉ còn trang công khai; avatar ẩn trên mobile. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const nav = read('src/layouts/customerAccountNav.ts');
const header = read('src/components/AtelierPublic.tsx');
const group = app.slice(app.indexOf('<Route element={<CustomerAccountLayout/>}>'), app.indexOf('</Route>', app.indexOf('<Route element={<CustomerAccountLayout/>}>')));
for (const path of ['/customer/account', '/customer/appointments', '/customer/cars', '/repair-status', '/quotation', '/customer/service-history']) {
  assert.ok(group.includes(`path="${path}"`), `${path} is inside the account layout`);
  assert.ok(nav.includes(`to: "${path}"`), `${path} is in the shared account menu`);
}
assert.match(header, /CUSTOMER_ACCOUNT_LINKS/, 'Avatar dropdown + mobile drawer use the shared account menu');
assert.match(header, /guestLinks\.filter\(link => link\.label !== "Lịch hẹn"\)/, 'Customer main nav no longer repeats account pages');
assert.match(header, /max-\[820px\]:hidden"><AccountMenu/, 'Avatar is hidden next to the mobile menu button');
console.log('PASS customer account area layout.');