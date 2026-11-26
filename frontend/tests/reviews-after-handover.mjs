import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const src = rel => fs.readFileSync(path.join(import.meta.dirname, '../src', rel), 'utf8');
const exists = rel => fs.existsSync(path.join(import.meta.dirname, '../src', rel));
const history = src('pages/customer/ServiceHistory.tsx');
const dialog = src('pages/customer/ServiceReviewDialog.tsx');
const app = src('App.tsx');
const nav = src('layouts/customerAccountNav.ts');
const api = src('services/customerApi.ts');
const backend = fs.readFileSync(path.join(import.meta.dirname, '../../backend/app/Http/Controllers/Api/CustomerReviewController.php'), 'utf8');

// Không còn trang Đánh giá riêng cho khách: đánh giá nằm trong Lịch sử bảo dưỡng (modal theo từng phiếu).
assert.ok(!exists('pages/customer/Reviews.tsx'), 'Customer review page removed');
assert.doesNotMatch(nav, /"\/reviews"/, 'Account menu has no review page');
assert.match(app, /path="\/reviews" element=\{<LegacyReviewsRedirect\/>\}/, 'Old /reviews links redirect');
assert.match(app, /\/customer\/service-history\?review=/, 'Redirect keeps the target order');

assert.match(history, /getMyRepairOrders\(\)/, 'Service history fetches repair orders');
assert.match(history, /getMyReviews\(/, 'History loads actual reviews to match each service order');
assert.match(history, /reviewsByOrder\.get\(/, 'Only exact-order reviews are shown');
assert.match(history, /<ServiceReviewDialog/, 'Rating opens in a modal from history');
assert.match(history, /searchParams\.get\("review"\)/, 'Deep link ?review= opens the matching modal');
assert.match(history, /Xem đánh giá/, 'Button turns into "Xem đánh giá" after submitting');

assert.match(dialog, /submitReview\(/, 'Modal submits through API adapter');
assert.match(dialog, /order\.status === "HANDED_OVER"/, 'Only handed over cars are eligible');
// Một điểm chung cho gara (đúng điểm admin/báo cáo/trang chủ dùng) — không còn 2 mục phụ.
assert.match(dialog, /overall_rating: overall/, 'Overall rating is sent');
assert.doesNotMatch(dialog, /advisor_rating|technician_rating/, 'No unused sub-ratings in the form');
assert.match(dialog, /<RatingInput/, 'Uses the shared star input');
assert.doesNotMatch(dialog, /★/, 'No text star glyphs — shared StarIcon only');
assert.match(dialog, /maxLength=\{Math\.max\(0, 1000 - chipsLength\)\}/, 'Comment limit follows backend (quick chips + free text ≤ 1000)');
assert.match(dialog, /finalComment\.slice\(0, 1000\)/, 'Sent comment never exceeds backend limit');
assert.match(dialog, /buildSuggestions\(serviceNames, overall\)/, 'Quick suggestions follow services used and rating');
assert.match(dialog, /MAX_SUGGESTIONS/, 'Quick suggestions are capped');
assert.match(dialog, /review\.reply/, 'Garage reply shown to customer');
assert.doesNotMatch(dialog, /(text|bg|border)-\[#[0-9a-d]/i, 'Modal uses theme tokens (star yellow excepted)');

assert.match(api, /export async function submitReview/, 'API helper not removed');
assert.match(backend, /RepairOrder::HANDED_OVER/, 'Backend checks handover');
assert.match(backend, /Rule::unique\('reviews', 'repair_order_id'\)/, 'Backend prevents duplicate review');
console.log('PASS: Reviews live in service history modal; legacy links redirect; API eligibility intact.');
