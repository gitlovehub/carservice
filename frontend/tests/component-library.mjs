/** Phase 3 — hợp đồng tĩnh của thư viện component dùng chung. Không thay cho kiểm thử trên trình duyệt (Phase 6). */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const read = file => readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');

// Một điểm import, đủ thành phần đã chốt.
const barrel = read('components/ui/index.ts');
for (const name of ['Button', 'IconButton', 'buttonClass', 'Field', 'Input', 'Select', 'Textarea', 'SearchInput', 'StatusBadge', 'Badge',
  'Modal', 'Drawer', 'Dropdown', 'DataTable', 'Pagination', 'PageHeader', 'Card', 'EmptyState', 'LoadingState', 'ErrorState', 'confirmDelete', 'useAppFeedback']) {
  assert.match(barrel, new RegExp(`\\b${name}\\b`), `components/ui phải export ${name}`);
}
assert.ok(!existsSync(new URL('../src/components/ui/index.tsx', import.meta.url)), 'Chỉ giữ một barrel index.ts');

// Button: đủ biến thể, mặc định KHÔNG phải primary, loading khóa nút + aria-busy.
const button = read('components/ui/Button.tsx');
const btnClass = read('components/ui/buttonClass.ts');
for (const variant of ['primary', 'secondary', 'outline', 'ghost', 'danger']) assert.match(btnClass, new RegExp(`"${variant}"`));
assert.match(button, /variant = "secondary"/, 'Button mặc định là secondary');
assert.match(button, /disabled=\{disabled \|\| loading\}/, 'loading phải khóa nút');
assert.match(button, /aria-busy=\{loading \|\| undefined\}/);
assert.match(button, /aria-label=\{label\}/, 'IconButton phải có aria-label');
assert.match(button, /title=\{title \?\? label\}/, 'IconButton có tooltip');

// CSS nút: theo token, đủ biến thể, giữ alias cũ trong giai đoạn chuyển đổi.
const css = read('styles/buttons.css');
for (const cls of ['.cs-btn-primary', '.cs-btn-secondary', '.cs-btn-outline', '.cs-btn-ghost', '.cs-btn-danger', '.cs-btn-icon', '.cs-btn-sm', '.cs-btn-lg', '[aria-busy="true"]']) {
  assert.ok(css.includes(cls), `buttons.css thiếu ${cls}`);
}
for (const alias of ['.cs-unified-btn', '.cs-unified-primary', '.cs-unified-secondary', '.cs-unified-danger', '.cs-btn-danger-outline', '.cs-btn-success']) {
  assert.ok(css.includes(alias), `Alias tương thích ${alias} chưa được giữ`);
}
assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i, 'buttons.css chỉ dùng token, không mã màu cứng');
assert.match(css, /cursor: pointer/);

// Trạng thái nghiệp vụ tập trung, đủ luồng đặt lịch → tiếp nhận → chẩn đoán → phiếu sửa chữa.
const status = read('config/status.ts');
for (const code of ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'RECEIVED', 'INSPECTING', 'QUOTING', 'WAITING_APPROVAL', 'WAITING_FOR_PARTS', 'IN_PROGRESS', 'COMPLETED', 'HANDED_OVER', 'CLOSED']) {
  assert.match(status, new RegExp(`\\b${code}:`), `status.ts thiếu ${code}`);
}
assert.match(read('components/ui/Badge.tsx'), /getStatus\(domain, status, audience\)/);
assert.match(read('config/labels.ts'), /actions: "Thao tác"/);

// Xác nhận/thông báo: chỉ một cơ chế (useAppFeedback), ConfirmDialog do FeedbackProvider render.
const provider = read('components/ui/FeedbackProvider.tsx');
assert.match(provider, /<ConfirmDialog/);
assert.match(read('components/ui/ConfirmDialog.tsx'), /role="alertdialog"/);
const hook = read('hooks/useAsyncAction.ts');
assert.match(hook, /useAppFeedback\(\)/, 'useAsyncAction phải dùng confirm/notify sẵn có');
assert.match(hook, /if \(running\.current\) return undefined/, 'Phải chặn gửi lặp');

// Lớp phủ: Esc, khóa cuộn, giữ focus, trả focus, đúng màu vai trò khi render qua portal.
const modal = read('components/ui/Modal.tsx');
for (const needle of ['aria-modal="true"', '"Escape"', '"Tab"', 'body.style.overflow', 'previous.focus', 'data-area={area}']) {
  assert.ok(modal.includes(needle), `Modal thiếu ${needle}`);
}
const dropdown = read('components/ui/Dropdown.tsx');
for (const needle of ['role="menu"', 'role="menuitem"', '"ArrowDown"', '"Escape"', 'aria-expanded']) assert.ok(dropdown.includes(needle), `Dropdown thiếu ${needle}`);

// Bảng: thẻ trên điện thoại + trạng thái Loading/Error/Empty dựng sẵn.
const table = read('components/ui/DataTable.tsx');
for (const needle of ['md:hidden', 'max-md:hidden', '<LoadingState', '<ErrorState', '<EmptyState', 'scope="col"']) assert.ok(table.includes(needle), `DataTable thiếu ${needle}`);
assert.match(read('components/ui/Pagination.tsx'), /aria-current=\{item === page \? "page" : undefined\}/);

console.log('PASS Phase 3: component library contract (buttons, fields, status, overlays, table, states, async actions).');
