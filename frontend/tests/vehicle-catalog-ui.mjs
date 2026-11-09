/** Danh mục xe: bộ chọn Hãng → Dòng xe → Phiên bản (dữ liệu từ API) và trang Admin CRUD. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const api = read('src/services/vehicleCatalog.ts');
const select = read('src/components/vehicle/SearchableSelect.tsx');
const selector = read('src/components/vehicle/VehicleSelector.tsx');
const admin = read('src/pages/admin/VehicleCatalog.tsx');
const app = read('src/App.tsx');
const nav = read('src/layouts/navigation.ts');

// Dữ liệu chỉ lấy từ Laravel API.
assert.match(api, /\/vehicle-catalog\/brands/, 'Brands come from the public catalog API');
assert.match(api, /\/vehicle-catalog\/brands\/\$\{brandId\}\/models/, 'Models are loaded per brand');
assert.match(api, /\/vehicle-catalog\/models\/\$\{modelId\}\/trims/, 'Trims are loaded per model');
assert.doesNotMatch(selector + select, /Toyota|Honda|Hyundai|VinFast/, 'No hardcoded vehicle list in the selector');

// Combobox có tìm kiếm, bàn phím, trạng thái.
assert.match(select, /role="combobox"/, 'Accessible combobox');
assert.match(select, /ArrowDown[\s\S]*ArrowUp[\s\S]*Enter[\s\S]*Escape/, 'Keyboard navigation');
assert.match(select, /foldText/, 'Search ignores Vietnamese accents and case');
assert.match(select, /emptyText/, 'Empty state');
assert.match(select, /loadError[\s\S]*Thử lại/, 'Load error with retry');
assert.match(select, /animate-spin/, 'Loading indicator');
assert.match(select, /text-cs-|bg-cs-/, 'Theme tokens (light/dark)');
assert.doesNotMatch(select + selector, /#[0-9a-fA-F]{6}/, 'No hardcoded hex colours');

// Đổi hãng → reset dòng xe + phiên bản; đổi dòng xe → reset phiên bản.
assert.match(selector, /brandId: option\?\.value \?\? null[\s\S]*?modelId: null, modelName: "", trimId: null, trimName: ""/, 'Changing brand resets model and trim');
assert.match(selector, /modelId: option\?\.value \?\? null, modelName: option\?\.label \?\? "", trimId: null, trimName: ""/, 'Changing model resets trim');
assert.match(selector, /disabledHint="Chọn hãng xe trước\."/, 'Model locked until brand chosen');
assert.match(selector, /sm:grid-cols-3/, 'Responsive: stacked on mobile, 3 columns from sm');

// Admin CRUD.
assert.match(app, /path="vehicle-catalog" element=\{<AdminVehicleCatalog\/>\}/, 'Admin route');
assert.match(nav, /path: "\/admin\/vehicle-catalog"/, 'Admin navigation entry');
for (const level of ['brands', 'models', 'trims']) assert.match(admin, new RegExp(`${level}: \\{ tab:`), `Admin tab for ${level}`);
assert.match(admin, /<Pagination/, 'Pagination');
assert.match(admin, /<SearchInput/, 'Search');
assert.match(admin, /status: event\.target\.value/, 'Status filter');
assert.match(admin, /confirm\(confirmDelete\(/, 'Confirm before delete');
assert.match(admin, /models_count[\s\S]*trims_count/, 'Brand shows model and trim counts');
assert.match(admin, /status: next/, 'Toggle visibility');
assert.match(admin, /window\.setTimeout\([\s\S]*?300\)/, 'Search is debounced');

// Lưu xe vào hồ sơ + đặt lịch dùng bộ chọn, gửi model_id / trim_id.
const cars = read('src/pages/customer/Cars.tsx');
const booking = read('src/pages/customer/Booking.tsx');
const bookingCatalog = read('src/services/bookingCatalog.ts');
assert.match(cars, /<VehicleSelector[\s\S]*?value=\{newSelection\}/, 'Add-vehicle form uses the selector');
assert.match(cars, /<VehicleSelector[\s\S]*?value=\{editSelection\}/, 'Edit-vehicle modal uses the selector');
assert.match(cars, /model_id: newSelection\.modelId[\s\S]*?trim_id: newSelection\.trimId/, 'Saved vehicle stores model and trim ids');
assert.doesNotMatch(cars, /supportedVehicleModels|model_name: newModel/, 'No hardcoded Toyota-only list');
assert.match(booking, /<VehicleSelector[\s\S]*?onChange=\{handleSelectionChange\}/, 'Booking step 1 uses the selector');
assert.match(booking, /new_vehicle: \{\s*model_id: vehicleSelection\.modelId,\s*trim_id: vehicleSelection\.trimId/, 'Booking sends catalog ids');
assert.doesNotMatch(booking, /BRAND_MODELS|getBrandForModel/, 'Booking has no hardcoded brand/model list');
assert.match(booking, /selectionFromVehicle\(v\)/, 'Picking a saved vehicle fills the selector');
assert.match(bookingCatalog, /params\.set\("model_id"/, 'Service catalog is filtered by the chosen model id');

console.log('PASS vehicle catalog selector + admin CRUD UI + saved vehicle/booking integration.');
