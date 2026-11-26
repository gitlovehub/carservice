/** Khu Admin dùng dữ liệu thật từ Laravel API — không còn dữ liệu giả trong frontend. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');

assert.ok(!existsSync(new URL('../src/mocks/admin', import.meta.url)), 'src/mocks/admin đã được gỡ');

const pages = readdirSync(new URL('../src/pages/admin', import.meta.url)).filter(f => f.endsWith('.tsx'));
for (const page of pages) {
  const source = read(`src/pages/admin/${page}`);
  assert.doesNotMatch(source, /mocks\/admin/, `${page} không import dữ liệu giả`);
  if (source.includes('<AdminPage ')) assert.match(source, /demo=\{false\}/, `${page} không gắn nhãn "Dữ liệu demo"`);