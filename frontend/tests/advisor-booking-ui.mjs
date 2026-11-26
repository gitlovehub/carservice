/**
 * ADV-04 — Đặt lịch hộ: trang thật (không placeholder), dùng chung bộ chọn khách + xe, khung giờ theo cấu hình + tình trạng còn chỗ,
 * cảnh báo vượt công suất, gửi khách / xe mới cùng lịch, xong chuyển sang Tiếp nhận để xác nhận với khách.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const app = read('src/App.tsx');
const page = read('src/pages/advisor/CreateBooking.tsx');
const service = read('src/services/workflowService.ts');

assert.match(app, /path="create-booking" element=\{<AdvisorCreateBooking\/>\}/, 'Route renders the real booking page');
assert.match(page, /<CustomerVehiclePicker /, 'Uses the shared customer + vehicle picker');
assert.match(service, /\/advisor\/booking-availability\?date=/, 'Slots come from the availability API');
assert.match(page, /disabled = s\.status !== "available"/, 'Full / closed / past slots cannot be picked');
assert.match(page, /capacityDay\?\.over_capacity/, 'Over-capacity day is warned (Q6: warning only)');
assert.match(page, /\.\.\.pickPayload\(pick\)/, 'New customer / vehicle are sent with the booking');
assert.match(page, /navigate\(`\/advisor\/reception\?appointment=\$\{appointment\.id\}`\)/, 'After booking go to reception to confirm');
console.log('PASS ADV-04: advisor booking page.');
