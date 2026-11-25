import ts from 'typescript';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Execute repository source against explicitly injected boundaries. Not a React DOM renderer.
export function sandbox({ initialStorage = {}, modules = {}, globals = {} } = {}) {
  const storage = new Map(Object.entries(initialStorage)), events = [], redirects = [];
  const localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,String(v)), removeItem: k => storage.delete(k) };
  const window = { dispatchEvent: e => { events.push(e.type); return true; }, location: { assign: p => redirects.push(p) }, addEventListener() {}, removeEventListener() {} };
  function load(path, overrides = {}, sourceTransform = s => s) {
    const source = sourceTransform(readFileSync(new URL('../../src/' + path, import.meta.url), 'utf8'));
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const exports = {};
    const require = name => {
      const value = { ...modules, ...overrides }[name];
      if (value === undefined) throw new Error(`Unmocked dependency ${name} in ${path}`);
      return value;
    };
    const scope = { localStorage, window, ...globals };
    new Function('require','exports', ...Object.keys(scope), js)(require, exports, ...Object.values(scope));
    return exports;
  }
  return { load, storage, events, redirects, localStorage, window };
}
export const ui = (...names) => Object.fromEntries(names.map(n => [n,n]));
export const tick = () => new Promise(resolve => setImmediate(resolve));
export function mountFinal(path, exportName, { props = {}, modules = {}, initialStorage = {}, globals = {} } = {}) {
  let cursor = 0, currentProps = props, effects = [], cleanups = [];
  const slots = [], calls = [], notifications = [], errors = {}, timers = [], nav = [];
  const react = {
    useState(initial) { const i=cursor++; if (!(i in slots)) slots[i]=typeof initial==='function'?initial():initial; return [slots[i], v => {slots[i]=typeof v==='function'?v(slots[i]):v;}]; },
    useRef(initial) { const i=cursor++; if (!(i in slots)) slots[i]={current:initial}; return slots[i]; },
    useMemo(fn) { return fn(); }, useCallback(fn) { return fn; }, useEffect(fn) { effects.push(fn); },
    useSyncExternalStore(_subscribe, snapshot) { return snapshot(); },
  };
  const jsx = (type, props) => ({type,props});
  const fieldErrors = { errors, show(problems) { for (const k of Object.keys(errors)) delete errors[k]; Object.assign(errors,problems); return Object.keys(problems).length>0; }, clear(k) {delete errors[k];}, reset() {for(const k of Object.keys(errors)) delete errors[k];}, showApi(error,mapping) {calls.push(['fieldError',error,mapping]);} };
  const feedback = { notify: (...args)=>notifications.push(args), confirm: async (...args)=>{calls.push(['confirm',...args]);return true;} };
  const common = {
    react, 'react/jsx-runtime': {jsx,jsxs:jsx,Fragment:'Fragment'},
    'react-router-dom': { Link:'Link', useNavigate:()=> (...args)=>nav.push(args) },
    '../ui/Icon':ui('Icon'), '../../components/ui/Icon':ui('Icon'), '../../../components/ui/Icon':ui('Icon'),
    '../ui':ui('Button','Field','Input','Modal','PasswordInput'), '../../components/ui':ui('Button','Modal'),
    '../ui/Button':ui('Button','IconButton'), '../../components/ui/Button':ui('Button','IconButton'), '../../components/ui/Field':ui('Field','Input','FieldError'),
    '../ui/useFieldErrors':{useFieldErrors:()=>fieldErrors}, '../../components/ui/useFieldErrors':{useFieldErrors:()=>fieldErrors},
    '../ui/feedbackContext':{useAppFeedback:()=>feedback}, '../../components/ui/feedbackContext':{useAppFeedback:()=>feedback}, '../../../components/ui/feedbackContext':{useAppFeedback:()=>feedback},
    '../ui/buttonClass':{buttonClass:()=>''}, '../ui/formValidation':{apiFieldErrors:e=>e.fields??{}},
    './authStyles':{authFieldClass:'field',authPrimaryClass:'primary',authLinkRowClass:'links'},
    '../../services/apiError':{userErrorMessage:(_e,fallback)=>fallback}, '../../../services/apiError':{userErrorMessage:(_e,fallback)=>fallback},
    '../../services/api':{API_BASE_URL:'/api',fetchApi:async (...args)=>{calls.push(['fetch',...args]);return {}; }},
    ...modules,
  };
  const env=sandbox({initialStorage,modules:common,globals:{setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},...globals}});
  const component=env.load(path)[exportName]; assert.equal(typeof component,'function',`Missing ${exportName}`);
  const render=()=>{cursor=0;effects=[];return component(currentProps);};
  function all(predicate,root=render()) {const result=[];function visit(n){if(Array.isArray(n)) n.forEach(visit);else if(n && typeof n==='object' && n.props){if(predicate(n))result.push(n);visit(n.props.children);visit(n.props.footer);}}visit(root);return result;}
  function one(predicate){const found=all(predicate);assert.equal(found.length,1,'Expected one matching JSX node');return found[0];}
  const change=(predicate,value)=>one(predicate).props.onChange({target:{value}});
  const click=async predicate=>{one(predicate).props.onClick();await tick();};
  const submit=async()=>{await one(n=>n.type==='form').props.onSubmit({preventDefault(){}});await tick();};
  return {...env,render,all,one,change,click,submit,calls,notifications,errors,timers,nav,feedback,fieldErrors,
    props(next){currentProps=next;},runEffects(){const batch=effects;effects=[];for(const f of batch){const cleanup=f();if(typeof cleanup==='function')cleanups.push(cleanup);}},cleanup(){for(const f of cleanups.splice(0))f();}};
}
