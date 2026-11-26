import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import vm from 'node:vm';
const ts=createRequire(resolve(process.cwd(),'package.json'))('typescript');
export {nodes} from './component-harness.mjs';
export function overlay(path,react,globals={}){
 const jsx=(type,props)=>({type,props});
 const Button=()=>null,IconButton=()=>null,Icon=()=>null;
 const deps={'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:Symbol('Fragment')},react:{useEffect:()=>{},useCallback:f=>f,useId:()=> 'dialog-id',useRef:()=>({current:null}),...react},'react-dom':{createPortal:t=>t},'../../config/labels':{LABELS:{action:{close:'Đóng',back:'Quay lại',confirm:'Xác nhận',more:'Thêm'}}},'./Button':{Button,IconButton},'./Icon':{Icon},'./buttonClass':{buttonClass:()=>''},'./useOverlayArea':{useOverlayArea:()=> 'admin'},'./overlay.css':{}};
 const code=ts.transpileModule(readFileSync(resolve(path),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};vm.runInNewContext(code,{module,exports:module.exports,require:n=>{if(!(n in deps))throw Error(n);return deps[n];},document:{body:{}},...globals},{filename:path});return {...module.exports,Button,IconButton};
}
