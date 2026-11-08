import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const read = file => readFileSync(path.join(here,'../src',file),'utf8');
const shell = read('layouts/shell.css');
const garage = read('pages/customer/Cars.tsx');
const theme = read('index.css');
const account = read('pages/admin/Accounts.tsx');
const nav = read('layouts/navigation.ts');
assert.match(shell,/tbody tr:hover.*--cs-row-hover/,'Table rows must use role-aware hover tokens');
// Hàng bảng khi hover dùng token --cs-hover; tokens.css định nghĩa giá trị tối riêng cho dark mode.
assert.match(shell,/--cs-row-hover:var\(--cs-hover\)/,'Row hover must come from the shared hover token');
assert.match(read('styles/tokens.css'),/html\[data-theme="dark"\][\s\S]*--cs-hover: #2a2d32/,'Dark row hover must stay dark');
assert.match(shell,/cs-admin-current-tile/,'Admin highlighted tile must be readable');
// Phase 5: điều hướng module Admin thống nhất ở sidebar (navigation.ts); AdminHubNav trùng lặp đã gỡ.
assert.doesNotMatch(account,/AdminHubNav/,'Admin accounts must rely on the shared sidebar navigation');
for (const dest of ['/admin/accounts','/admin/services','/admin/inventory','/admin/reports']) assert.ok(nav.includes(`path: "${dest}"`), 'Admin navigation missing '+dest);
for (const page of ['Accounts','Services','Inventory','Reports']) assert.doesNotMatch(read('pages/admin/'+page+'.tsx'),/AdminHubNav/,page+' must not duplicate navigation');
// Chữ chú thích dùng token đạt tương phản AA thay vì xám viết cứng (#8A949E chỉ 3.08:1).
for (const page of ['Accounts','Services','Inventory','AdminAppointments']) assert.doesNotMatch(read('pages/admin/'+page+'.tsx'),/text-\[#8A949E\]/i,page+' must not use low-contrast caption gray');
assert.match(garage,/grid grid-cols-3 items-stretch/, 'Vehicle cards should use a responsive Tailwind grid');
assert.match(garage,/getMyVehicles\(\)/,'Vehicle cards must use backend data');
assert.match(garage,/await addMyVehicle\(payload\)/,'Vehicle add must remain API-backed');
assert.match(garage,/await updateMyVehicle\(editingVehicle.id, payload\)/,'Vehicle edit must remain API-backed');
assert.match(garage,/await deleteMyVehicle\(deletingVehicle.id\)/,'Vehicle delete must remain API-backed');
assert.doesNotMatch(garage,/<table/,'Customer garage should be cards, not legacy table');
assert.match(garage,/max-\[1050px\]:grid-cols-2/,'Two columns at tablet breakpoint');
assert.match(garage,/max-\[670px\]:grid-cols-1/,'Single-column mobile layout');
assert.match(theme,/--color-cs-surface/,'Theme must expose palette to Tailwind v4');
assert.match(read('components/ui/Icon.tsx'),/plus: <path/,'Add vehicle icon must exist');
const vehicleController = readFileSync(path.join(here,'../../backend/app/Http/Controllers/Api/VehicleController.php'),'utf8');
assert.match(vehicleController,/Rule::in\(\$modelNames\)/,'Backend currently restricts accepted model names');
assert.match(garage,/const supportedVehicleModels = \[/,'UI must only offer accepted models');
console.log('PASS: dark hover and admin tile contrast; API-backed GARAGE customer garage with responsive cards.');
