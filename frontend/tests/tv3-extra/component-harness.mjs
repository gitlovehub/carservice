import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import vm from 'node:vm';
const ts=createRequire(resolve(process.cwd(),'package.json'))('typescript');
export function component(path,mocks={}) {
 const jsx=(type,props)=>({type,props});
 const dependencies={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:Symbol('Fragment')},...mocks};
 const code=ts.transpileModule(readFileSync(resolve(path),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,require:name=>{if(!(name in dependencies))throw Error('Unexpected dependency: '+name);return dependencies[name];}},{filename:path});
 return module.exports;
}
export function nodes(tree,predicate){return !tree?[]:Array.isArray(tree)?tree.flatMap(n=>nodes(n,predicate)):typeof tree==='object'?[...(predicate(tree)?[tree]:[]),...nodes(tree.props?.children,predicate)]:[];}
