/** Thông tin gara: Admin sửa địa chỉ bằng gợi ý bản đồ qua backend; Footer + Liên hệ đọc địa chỉ cấu hình. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const ac = read('src/components/address/AddressAutocomplete.tsx');
const svc = read('src/services/garageService.ts');
const page = read('src/pages/admin/GarageSettings.tsx');
const footer = read('src/components/Footer.tsx');
const contact = read('src/pages/customer/Contact.tsx');
assert.match(svc, /"\/address\/suggest"/, 'Suggestions go through the backend proxy');
assert.doesNotMatch(svc + ac, /goong\.io|api_key|GOONG_API_KEY/, 'No map key or provider URL in the browser bundle');
assert.match(ac, /role="combobox"/, 'Autocomplete is an accessible combobox');
assert.match(ac, /ArrowDown/, 'Keyboard navigation');
assert.match(ac, /setTimeout\(\(\) => \{[\s\S]*?\}, 300\)/, 'Requests are debounced');
assert.match(page, /<AddressAutocomplete/, 'Admin picks the address from suggestions');
assert.match(footer, /useGarageInfo\(\)/, 'Footer shows the configured address');
assert.match(contact, /useGarageInfo\(\)/, 'Contact page shows the configured address');
console.log('PASS garage settings + address autocomplete UI.');