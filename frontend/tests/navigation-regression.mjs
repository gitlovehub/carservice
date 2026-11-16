import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here=path.dirname(fileURLToPath(import.meta.url));
const src=f=>readFileSync(path.join(here,'../src',f),'utf8');
const app=src('App.tsx'), dashboard=src('pages/shared/WorkspaceDashboard.tsx'), header=src('components/GaragePublic.tsx');
const auth=src('pages/auth/auth.ts'), guard=src('pages/auth/ProtectedRoute.tsx'), services=src('pages/customer/Services.tsx');
const login=src('pages/auth/Login.tsx'), boundary=src('components/AppErrorBoundary.tsx');
// Lỗi cũ: dùng biến `advisor` trước khi khai báo. Phase 4 viết lại dashboard — vẫn kiểm tra không dùng trước khai báo.
const advisorDecl = dashboard.indexOf('const advisor = role === "advisor";');
assert.ok(advisorDecl > 0, 'Dashboard must declare advisor');
assert.doesNotMatch(dashboard.slice(0, advisorDecl), /[(!{\s]advisor\s*[?)&|,]/, 'Dashboard must not use advisor before declaration');
assert.match(app, /<AppErrorBoundary><FeedbackProvider><Routes>/);
// Chatbot + nút "Lên đầu trang" gắn một lần ở gốc App, ngoài <Routes>.
assert.match(app, /<\/Routes><ScrollToTopButton\/><ChatWidget\/><\/FeedbackProvider>/);
assert.match(boundary, /getDerivedStateFromError/);
assert.match(header, /label: "Dịch vụ", href: "\/services"/);
assert.doesNotMatch(header, /href: "\/#services"/);
assert.match(header, /session\.account\.role === "ADMIN" \? "\/admin\/appointments"/);
assert.match(header, /session\.account\.role === "ADVISOR" \? "\/advisor\/appointments"/);
assert.match(app, /<Route path="\/booking" element={<Booking\/>}\/>/);
// Lịch hẹn chỉ còn một trang trong khu tài khoản; URL cũ chuyển hướng về đó.
assert.match(app, /<Route path="\/appointments" element={<Navigate to="\/customer\/appointments" replace\/>}\/>/);
assert.match(app, /<Route path="\/customer\/appointments" element={<Appointments\/>}\/>/);
assert.match(app, /<Route path="\/customer\/appointments\/manage" element={<Navigate to="\/customer\/appointments" replace\/>}\/>/);
// Đặt lịch: công khai (khách điền trước), vẫn trong khung CustomerLayout; tới bước gửi mới bắt đăng nhập,
// nháp được lưu và đăng nhập xong quay lại /booking.
const protectedGroup=app.indexOf('allowedRoles={["CUSTOMER"]}><CustomerLayout/>');
const bookingAt=app.indexOf('path="/booking"');
assert.ok(protectedGroup>0 && bookingAt>0 && bookingAt<protectedGroup, 'Booking must be public (outside the customer-only guard)');
assert.match(app.slice(0, bookingAt), /<Route element={<CustomerLayout\/>}>\s*<Route $/, 'Booking keeps the customer shell');
const booking=src('pages/customer/Booking.tsx');
assert.match(booking, /navigate\("\/login", \{ state: \{ from: \{ pathname: "\/booking"/, 'Guest submit goes to login and returns to /booking');
assert.match(booking, /localStorage\.setItem\(DRAFT_KEY/, 'Booking draft is saved for after login');
// Đăng nhập xong về lại đúng trang trước đó (kể cả /booking) theo một quy tắc chung.
const authHelpers = readFileSync(new URL('../src/pages/auth/auth.ts', import.meta.url), 'utf8');
assert.match(login, /resolveReturnPath\(role, readReturnLocation\(location\.state\)\)/, 'Login returns to the page the user came from');
assert.match(authHelpers, /export const resolveReturnPath/, 'Shared return-path rule exists');
assert.match(authHelpers, /role !== "CUSTOMER" && \(pathname === "\/booking"/, 'Only customers return to /booking; staff go to their workspace');
assert.match(app, /path="\/advisor" element={<ProtectedRoute allowedRoles={\["ADVISOR"\]}/);
assert.match(app, /path="\/admin" element={<ProtectedRoute allowedRoles={\["ADMIN"\]}/);
assert.match(guard, /state={{ from: location }}/);
assert.match(auth, /path: "\/customer\/appointments"/);
assert.match(login, /resolveReturnPath\(/);
assert.match(services, /fetchApi<Service\[\] \| { data: Service\[\] }>\("\/services"\)/);
assert.match(services, /radial-gradient/); // migrated GARAGE hero uses Tailwind utilities
assert.match(services, /Không tải được dịch vụ/);
assert.doesNotMatch(services, /SERVICE_PRODUCTS/);
// Phase 5: garage-booking.css chưa từng được import (đã gỡ); kiểm tra CSS thực sự được nạp cho trang đặt lịch.
assert.match(src('pages/customer/booking/ServicePicker.tsx'), /import "\.\/servicePicker\.css"/);
assert.match(src('pages/customer/booking/servicePicker.css'), /prefers-reduced-motion/);
console.log('PASS: crash, real services API, login redirect, role-safe routes, customer GARAGE styling.');
