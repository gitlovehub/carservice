import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';
const require = createRequire(resolve(process.cwd(), 'package.json'));
const ts = require('typescript');
export function load(path, mocks = {}, globals = {}) {
  const code = ts.transpileModule(readFileSync(resolve(path), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module = {exports:{}};
  vm.runInNewContext(code, {module,exports:module.exports,require: name => {if (!(name in mocks)) throw Error('Unexpected dependency: '+name); return mocks[name];}, URLSearchParams, ...globals}, {filename:path});
  return module.exports;
}
export const plain = x => JSON.parse(JSON.stringify(x));
