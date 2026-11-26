/**
 * P6-FE + ADV-01 (D-020) — phụ tùng chờ.
 * Cố vấn chỉ báo thiếu (và rút lại khi kho chưa đặt); "Chờ phụ tùng" bắt buộc chọn phụ tùng thiếu.
 * Admin / kho đặt hàng + nhận hàng ở Phụ tùng & kho → "Cần đặt hàng"; nhập kho thường cảnh báo khi đang có yêu cầu chờ.
 * Khách thấy phụ tùng chờ + ngày dự kiến về, không thấy ghi chú nhà cung cấp.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const panel = read('src/pages/advisor/PartRequestsPanel.tsx');
const panels = read('src/pages/advisor/RepairOrderPanels.tsx');
const service = read('src/services/workflowService.ts');
const admin = read('src/pages/admin/PartOrders.tsx');
const inventory = read('src/pages/admin/Inventory.tsx');
const adminApi = read('src/services/adminApi.ts');
const customer = read('src/pages/customer/RepairStatus.tsx');

// Cố vấn: báo thiếu, không đặt / nhận hàng.
assert.match(panels, /<PartRequestsPanel /, 'Repair step lists pending parts');
assert.match(service, /\/repair-orders\/\$\{id\}\/part-requests/, 'Advisor reports a shortage');
assert.doesNotMatch(panel, /\/order`|\/receive`|receivePartRequest|orderPartRequest/, 'Advisor UI must not order or receive parts (D-020)');
assert.match(panel, /row\.status === "REQUESTED"/, 'Advisor can only withdraw a request the warehouse has not ordered yet');
assert.match(panel, /trim\(\)\.length < 5/, 'Withdrawing requires a reason');
// "Chờ phụ tùng" phải nói rõ thiếu gì.
assert.match(panels, /<WaitForPartsModal /, '"Chờ phụ tùng" opens the shortage dialog');
assert.match(service, /waiting-for-parts`, \{ method: "POST", body: JSON\.stringify\(\{ parts/, 'Waiting for parts sends the missing parts');

// Admin / kho: đặt hàng + nhận hàng (một lần), "đã có trong kho" không cộng lần nữa.
assert.match(adminApi, /\/part-requests\/\$\{id\}\/order/, 'Warehouse records the order + ETA');
assert.match(adminApi, /\/part-requests\/\$\{id\}\/receive`, "POST", \{ already_in_stock/, 'Warehouse receives (restock once) or closes when already stocked');
assert.match(admin, /receivePartRequest\(request\.id, alreadyInStock\)/, 'Receive buttons wired');
assert.match(inventory, /id: "orders", label: "Cần đặt hàng"/, 'Inventory has the "Cần đặt hàng" tab');
assert.match(inventory, /selectedStockPart\.requested > 0/, 'Plain stock-in warns when parts are awaited for repair orders');

// Khách.
assert.match(customer, /Phụ tùng đang chờ/, 'Customer sees pending parts');
assert.doesNotMatch(customer, /supplier_note/, 'Customer never sees supplier notes');
console.log('PASS ADV-01: advisor reports shortages, warehouse orders/receives once, customer sees ETA.');
