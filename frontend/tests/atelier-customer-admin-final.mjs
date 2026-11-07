import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../src/'+file, import.meta.url), 'utf8');
// Menu khách hàng nằm ở header công khai (AtelierPublic): "Đặt lịch" sáng cả ở /booking và /customer/booking.
// (Bản sao logic này trong AppShell là code chết — không có route nào render — đã gỡ ở Phase 4.)
const publicHeader = read('components/AtelierPublic.tsx');
assert.match(publicHeader, /label: "Đặt lịch", href: "\/booking"/);
assert.match(publicHeader, /location\.pathname === "\/customer\/booking"/);
// Phase 5: AdminHubNav (4 thẻ trùng sidebar) đã gỡ; các module vẫn phải có trong menu Admin và không trang nào nhân đôi điều hướng.
const nav = read('layouts/navigation.ts');
for(const module of ['accounts','services','inventory','reports']) assert.ok(nav.includes(`path: "/admin/${module}"`),`Missing admin nav route: ${module}`);
for(const name of ['Accounts','Inventory','Services','Reports']) assert.doesNotMatch(read(`pages/admin/${name}.tsx`), /AdminHubNav/, `${name} must not duplicate the sidebar`);
const appointment = read('pages/customer/Appointments.tsx');
assert.match(appointment, /GARA CỦA TÔI \/ LỊCH HẸN/);
assert.match(appointment, /getMyAppointments\(/);
assert.match(appointment, /await updateAppointment\(/);
assert.match(appointment, /await cancelAppointment\(/);
assert.doesNotMatch(appointment, /<table/);
const tracking = read('pages/customer/RepairStatus.tsx');
assert.match(tracking, /getMyRepairOrders\(/);
assert.doesNotMatch(tracking, /SC-001|Honda City/);
const booking = read('pages/customer/Booking.tsx');
// Trang đặt lịch mới: chọn dịch vụ qua ServicePicker, khung tóm tắt bên cạnh, gửi lịch qua completeBooking.
assert.match(booking, /<ServicePicker/);
assert.match(booking, /<BookingSummary/);
assert.match(booking, /completeBooking/);
assert.doesNotMatch(booking, /<Header \/>|<Footer \/>/);
assert.doesNotMatch(appointment, /<CustomerTopbar \/>|<CustomerHeader \/>/);
assert.match(read('styles/atelier-customer-pages.css'), /at-customer-status/);
console.log('PASS: admin hub & role nav, API appointments cards, live repair timeline and booking presentation.');
