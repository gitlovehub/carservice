import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(path.join(frontend, p), 'utf8');
const home = read('src/pages/Home.tsx');
const shell = read('src/components/GaragePublic.tsx');
const login = read('src/pages/auth/Login.tsx');
const register = read('src/pages/auth/Register.tsx');
const forgot = read('src/pages/auth/ForgotPassword.tsx');
const source = read('src/App.tsx');
// Phase 5: trang chủ đã làm lại bằng Tailwind + token (garage-public.css không còn được import, đã gỡ).
// Kiểm tra nội dung & cấu trúc hiện hành thay vì class cũ at-hero-car / at-feature-band.
assert.ok(existsSync(path.join(frontend, 'src/assets/car-garage.svg')), 'Car artwork should be local');
assert.match(home, /Chăm sóc xe/);
assert.match(home, /Chuẩn từng chi tiết/);
assert.match(home, /<GarageCar /, 'Hero must show the local car artwork');
assert.match(home, /\/services/, 'Home must link to the services catalogue');
assert.match(shell, /GaragePublicHeader/);
assert.match(shell, /GarageAuthLayout/);
assert.match(shell, /toggleTheme/);
assert.match(shell, /useAuthSession/);
assert.match(login, /fetchApi\("\/login"/);
assert.match(login, /fetchApi\("\/verify-email-otp"/);
assert.match(register, /fetchApi\("\/register"/);
assert.match(register, /fetchApi\("\/verify-email-otp"/);
assert.match(forgot, /fetchApi\("\/forgot-password"/);
assert.match(forgot, /fetchApi\("\/reset-password"/);
// Màu thương hiệu và responsive của header công khai: token + breakpoint thay cho CSS cũ.
assert.match(read('src/styles/tokens.css'), /--cs-brand: #cf2935/);
assert.match(shell, /min-\[821px\]:flex/, 'Desktop navigation breakpoint');
assert.match(shell, /aria-expanded=\{menuOpen\}/, 'Mobile menu exposes its state');
assert.match(source, /<Home\/>/);
assert.doesNotMatch(shell, /quick-login|123456|session_authenticated/);
for(const f of [home,login,register,forgot])assert.doesNotMatch(f, /#D6A85F|#B98B43/, 'gold must not remain in recreated public pages');
console.log('PASS: GARAGE home/auth appearance, real OTP endpoints, responsive/theme, and local artwork.');
