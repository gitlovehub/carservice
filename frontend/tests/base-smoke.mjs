/** Static contract checks for Task 01. Not a replacement for build or browser E2E. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (name) => readFileSync(path.join(root, 'src', name), 'utf8');
const routes = src('App.tsx');
const shell = src('layouts/AppShell.tsx');
const nav = src('layouts/navigation.ts');
const auth = src('contexts/AuthContext.tsx');
const client = src('services/api.ts');
const guard = src('pages/auth/ProtectedRoute.tsx');
const theme = src('contexts/ThemeContext.tsx');
for (const layout of ['CustomerLayout', 'AdvisorLayout', 'AdminLayout']) {
  assert.match(routes, new RegExp(layout), `${layout} must be part of the router`);
}
for (const route of ['customer/dashboard', 'advisor', 'admin', 'customer/appointments', 'path="appointments"', 'working-hours']) {
  assert.ok(routes.includes(route), `Route ${route} missing`);
}
// Màu thương hiệu và màu nhấn theo vai trò nằm tập trung ở tokens.css (Design System, Phase 2).
const tokens = src('styles/tokens.css');
for (const needle of ['--cs-brand: #cf2935', '[data-area="advisor"]', '[data-area="admin"]', 'html[data-theme="dark"]']) {
  assert.ok(tokens.includes(needle), `Design token ${needle} missing`);
}
assert.match(src('index.css'), /@import "\.\/styles\/tokens\.css"/, 'tokens.css must be loaded globally');
for (const neon of ['#c5ff64', '#c6ff68', '#507b2c']) {
  assert.ok(!tokens.includes(neon) && !src('layouts/shell.css').includes(neon), `Admin neon ${neon} must be gone`);
}
assert.match(nav, /customer:[\s\S]+advisor:[\s\S]+admin:/);
assert.match(shell, /aria-expanded=\{\w*open\}/i, 'Mobile menu button must expose its open state');
assert.match(shell, /ShellContext.Provider/);
assert.match(theme, /localStorage\.setItem\(THEME_KEY/);
assert.match(auth, /fetchApi\("\/me"\)/, 'must check the real backend before granting a role');
assert.match(guard, /session\.status === "checking"/);
assert.match(guard, /allowedRoles\.includes/);
assert.match(client, /axios\.create/);
assert.match(client, /Authorization/);
assert.match(client, /withCredentials: true/);
assert.doesNotMatch(client, /carservice-vn\.up\.railway/);
for (const name of ['Header','CustomerHeader', 'CustomerTopbar', 'Footer']) {
  assert.match(src(`components/${name}.tsx`), /if \(inShell\) return null;/,
    `Old ${name} must hide inside the new shell`);
}
console.log('PASS: Task 01 route/layout, theme, token, API and legacy-component contract checks.');
