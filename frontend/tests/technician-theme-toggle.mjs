import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const layout = read('src/pages/technician/atelier/TechnicianLayout.tsx');
const tokens = read('src/index.css');
const context = read('src/contexts/ThemeContext.tsx');
const ui = read('src/pages/technician/atelier/TechnicianUI.tsx');
const routes = read('src/App.tsx');
assert.match(layout, /useTheme\(\)/, 'Technician must connect shared ThemeContext');
assert.match(layout, /onClick=\{toggleTheme\}/, 'Theme toggle button missing');
assert.match(layout, /data-ktv-theme=\{theme\}/, 'Theme not scoped to KTV root');
assert.match(layout, /aria-label=\{theme === "dark"/, 'Theme toggle lacks accessible label');
assert.match(layout, /bg-ktv-page/);
assert.match(ui, /bg-ktv-panel/);
assert.match(ui, /text-ktv-strong/);
assert.match(tokens, /\[data-area="technician"\]\[data-ktv-theme="dark"\]/);
assert.match(tokens, /\[data-area="technician"\]\[data-ktv-theme="light"\]/);
assert.match(tokens, /--color-ktv-panel: var\(--ktv-panel\)/);
assert.match(context, /carservice-theme/, 'Persistence key missing');
assert.match(routes, /<ThemeProvider>/);
for (const file of ['TechnicianDashboard','TechnicianOrders','TechnicianDetail','TechnicianInspection']) {
 const contents = read(`src/pages/technician/atelier/${file}.tsx`);
 assert.doesNotMatch(contents, /text-white|bg-\[#[a-f0-9]{6}\]|bg-white/, `${file}: hard-coded palette incompatible with theme`);
}
console.log('PASS KTV theme toggle: shared global state, accessible toggle, role-scoped light/dark tokens, no hardcoded dark cards.');
