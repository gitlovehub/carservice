/** Trang chi tiết nhóm dịch vụ: bài viết + gợi ý theo tình trạng + chọn dịch vụ (lưu lại) → đặt lịch tick sẵn. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const src = rel => fs.readFileSync(path.join(import.meta.dirname, '../src', rel), 'utf8');
const app = src('App.tsx');
const page = src('pages/showcase/ServiceGuidePage.tsx');
const guides = src('pages/showcase/serviceGuides.ts');
const picks = src('services/servicePicks.ts');
const booking = src('pages/customer/Booking.tsx');
const home = src('pages/showcase/ReferenceHome.tsx');
const layout = src('layouts/PublicLayout.tsx');

assert.match(app, /path="\/services\/:slug" element=\{<ServiceGuidePage\/>\}/, 'Detail route registered');
assert.match(layout, /pathname\.startsWith\("\/services\/"\)/, 'Detail pages use the reference shell (dark theme)');
for (const slug of ['bao-duong-dinh-ky', 'gam-phanh', 'dien-dien-lanh']) assert.match(guides, new RegExp(`slug: '${slug}'`), `Guide ${slug} exists`);
for (const category of ['Bảo dưỡng định kỳ', 'Gầm - Phanh', 'Điện - Điện lạnh']) assert.match(guides, new RegExp(`category: '${category}'`), `Guide maps to category ${category}`);
assert.match(home, /guideSlugOf\(g\.category\)/, 'Home "Xem chi tiết" opens the detail page');

// Dịch vụ con lấy thật từ API theo danh mục; đã bỏ mục "Xe bạn gặp tình trạng nào?".
assert.match(page, /fetchApi<GuideService\[\] \| \{ data: GuideService\[\] \}>\('\/services'\)/, 'Sub-services come from the API');
assert.doesNotMatch(page, /Xe bạn gặp tình trạng nào/, 'Symptom section removed');

// Chọn được lưu lại và mang sang đặt lịch; đặt xong thì xóa.
assert.match(picks, /localStorage\.setItem\(KEY/, 'Picks persist across visits');
assert.match(picks, /params\.set\("services", picks\.ids\.join\(","\)\)/, 'Booking link carries selected services');
assert.match(booking, /searchParams\.get\("services"\)/, 'Booking pre-selects ?services=1,2,3');
// Mọi nút "Đặt lịch" theo dịch vụ / gói: chọn ngay từ bước 1 (lưu nháp luôn), không áp trong hàm cập nhật state
// (StrictMode gọi 2 lần → từng làm mất lựa chọn). Sang bước 2 sáng nhẹ một lần.
assert.match(booking, /useState<string\[\]>\(\(\) => \[\.\.\.new Set\(\[\.\.\.\(draft\?\.selectedKeys \?\? \[\]\), \.\.\.linkedKeys\]\)\]\)/, 'Linked items always merged into the selection from step 1 (even with a restored draft)');
assert.match(src('pages/customer/booking/ServicePicker.tsx'), /item\.recommended && \(/, '"Phù hợp với xe" only when the backend marks the package as due');
assert.doesNotMatch(booking, /deepLinkApplied/, 'No impure deep-link flag inside a state updater');
assert.match(booking, /flashKeys=\{flashKeys\}/, 'Linked items flash once at step 2');
assert.match(src('pages/customer/booking/ServicePicker.tsx'), /cs-flash-once/, 'Selected list uses the one-time flash');
assert.match(src('index.css'), /\.cs-flash-once \{ animation: cs-flash-once [^}]*\s1\s/, 'Flash animation runs exactly once');
assert.match(booking, /"services", "package", "vehicle_id", "symptom"/, 'A new deep link starts a fresh form instead of an old draft');
assert.match(booking, /clearServicePicks\(\);/, 'Picks are cleared after a successful booking');
// Xóa dịch vụ ở bước 2 là xóa hẳn: URL bỏ ?services (tải lại không nhét lại) + kho lựa chọn chung đồng bộ theo.
assert.match(booking, /\["service", "services", "package", "symptom"\]\.forEach\(\(key\) => next\.delete\(key\)\)/, 'Consumed deep-link params are removed from the URL');
assert.match(booking, /syncServicePicks\(selectedKeys/, 'Booking selection is the source of truth for saved picks');
assert.match(booking, /readServicePicks\(\)\.ids/, 'Opening booking from the menu still carries ticked services');
// Trang Dịch vụ hoạt động giống trang chi tiết: tick chọn (cùng kho lựa chọn) + thanh "Đặt lịch" dùng chung.
const servicesPage = src('pages/showcase/ReferenceServices.tsx');
assert.match(servicesPage, /useServicePicks\(\)/, 'Services page shares the saved picks');
assert.match(servicesPage, /<ServicePicksBar /, 'Services page uses the shared booking bar');
assert.match(page, /<ServicePicksBar /, 'Guide page uses the shared booking bar');
assert.doesNotMatch(page, /serviceImage\(service\) \?\? guide\.image/, 'Guide cards use only admin-uploaded images');
console.log('PASS service guide pages: content, real sub-services, saved picks → booking (pre-selected + flash once).');
