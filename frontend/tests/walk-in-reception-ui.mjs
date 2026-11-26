/**
 * ADV-02 / ADV-03 — tiếp nhận tại quầy: khách vãng lai (tìm SĐT / tên / biển số hoặc khách mới),
 * xe chưa có trong hệ thống (hãng → dòng → biển số), gửi một lần để backend tạo khách / xe / phiếu trong một giao dịch.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const reception = read('src/pages/advisor/ReceptionWorkflow.tsx');
const walkIn = read('src/pages/advisor/WalkInReception.tsx');
const picker = read('src/pages/advisor/CustomerVehiclePicker.tsx');
const forms = read('src/pages/advisor/counterForms.ts');
const fields = read('src/pages/advisor/CounterFields.tsx');
const service = read('src/services/workflowService.ts');

assert.match(reception, /mode === "walk-in"|"walk-in"/, 'Reception page has a walk-in mode');
assert.match(reception, /<WalkInReception\/>/, 'Walk-in panel is mounted');
assert.match(reception, /<VehicleChoiceList /, 'Appointment reception can pick another or a new vehicle');
assert.match(reception, /vehicle: toNewVehicle\(newVehicle\)/, 'New vehicle is sent with the appointment reception');

assert.match(service, /\/customers\?search=/, 'Counter search by customer');
assert.match(service, /\/vehicles\?search=/, 'Counter search by plate');
assert.match(walkIn, /<CustomerVehiclePicker [^>]*blockBusyVehicles/, 'Walk-in uses the shared picker and blocks busy vehicles');
assert.match(walkIn, /\.\.\.pickPayload\(pick\)/, 'Walk-in sends customer + vehicle (new or existing) in the same request');
assert.match(forms, /customer: toNewCustomer\(pick\.newCustomer\)/, 'New customer payload');
assert.match(forms, /vehicle: toNewVehicle\(pick\.newVehicle\)/, 'New vehicle payload');
assert.match(walkIn, /open_repair_order_code/, 'Vehicle with an open order cannot be received twice');
assert.match(picker, /searchCounter\(term\)/, 'Picker searches customers and plates');

assert.match(fields, /<VehicleSelector /, 'New vehicle uses the 3-level catalog selector (no numeric model_id)');
assert.match(fields, /disabled=\{!!v\.open_repair_order_code\}/, 'Busy vehicles are disabled');
assert.match(fields, /Xem thêm/, 'Long vehicle lists collapse');
console.log('PASS ADV-02/03: walk-in reception + unregistered vehicle at the counter.');
