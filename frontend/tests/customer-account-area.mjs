/** Khu "Hồ sơ của tôi": các trang tài khoản khách dùng chung sidebar; menu chính chỉ còn trang công khai; avatar ẩn trên mobile. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const nav = read('src/layouts/customerAccountNav.ts');
const header = read('src/components/GaragePublic.tsx');
const group = app.slice(app.indexOf('<Route element={<CustomerAccountLayout/>}>'), app.indexOf('</Route>', app.indexOf('<Route element={<CustomerAccountLayout/>}>')));
for (const path of ['/customer/account', '/customer/appointments', '/customer/cars', '/repair-status', '/quotation', '/customer/service-history', '/reviews', '/invoices', '/payment']) {
  assert.ok(group.includes(`path="${path}"`), `${path} is inside the account layout`);
  assert.ok(nav.includes(`to: "${path}"`), `${path} is in the shared account menu`);
}
assert.match(header, /CUSTOMER_ACCOUNT_LINKS/, 'Avatar dropdown + mobile drawer use the shared account menu');
assert.match(header, /guestLinks\.filter\(link => link\.label !== "Lịch hẹn"\)/, 'Customer main nav no longer repeats account pages');
assert.match(header, /max-\[820px\]:hidden"><AccountMenu/, 'Avatar is hidden next to the mobile menu button');
console.log('PASS customer account area layout.');
const modal = read('src/components/ui/Modal.tsx');
const css = read('src/index.css');
assert.match(css, /\.cs-page-enter \{ animation: cs-page-enter [^}]* backwards; \}/, 'Page transition must not leave a transform (it would offset fixed modals)');
assert.match(modal, /cs-modal-panel relative m-auto/, 'Bare modals are centred with auto margins (tall modals scroll from the top)');
console.log('PASS modal centring guards.');

// Đổi thương hiệu "atelier" → "garage"; bỏ breadcrumb trang trí; Hồ sơ dùng cùng khung tiêu đề với các trang khác.
import { readdirSync, statSync } from 'node:fs';
const walk = dir => readdirSync(new URL('../' + dir, import.meta.url)).flatMap(name => {
  const rel = `${dir}/${name}`;
  return statSync(new URL('../' + rel, import.meta.url)).isDirectory() ? walk(rel) : [rel];
});
const sources = walk('src').filter(file => /\.(tsx?|css)$/.test(file));
assert.deepEqual(sources.filter(file => /atelier/i.test(file) || /atelier/i.test(read(file))), [], 'No "atelier" left in file names or code');
assert.deepEqual(sources.filter(file => /(GARA CỦA TÔI|KHÁCH HÀNG|CARSERVICE) \/ /.test(read(file))), [], 'No decorative breadcrumb eyebrows');
assert.match(read('src/components/GaragePublic.tsx'), /GARAGE · CHĂM SÓC Ô TÔ/, 'Brand subtitle says GARAGE');
const account = read('src/pages/customer/Account.tsx');
assert.match(account, /<main className="at-customer-page"><div className="at-customer-container">/, 'Profile uses the shared page container');
assert.match(account, /<div className="at-customer-heading">[\s\S]*?<h1>Hồ sơ của tôi<\/h1>/, 'Profile uses the shared page heading');
console.log('PASS garage rename + no eyebrows + consistent profile heading.');