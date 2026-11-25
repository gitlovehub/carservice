import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

export function sourceUrl(path, replacements = []) {
  let source = readFileSync(new URL(`../../src/${path}`, import.meta.url), 'utf8');
  for (const [original, replacement] of replacements) {
    assert.ok(source.includes(original), `Expected import not found in ${path}: ${original}`);
    source = source.replace(original, replacement);
  }
  return 'data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64');
}

// Replaces only the network boundary; executes the actual TypeScript adapter.
export const fetchStub = `
export const calls = [];
let response;
let failure;
export function reply(value) { response = value; failure = undefined; calls.length = 0; }
export function rejectWith(error) { failure = error; calls.length = 0; }
const fetchApi = async (...args) => { calls.push(args); if (failure) throw failure; return response; };
`;
