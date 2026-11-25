import ts from 'typescript';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Executes the real TSX component with lightweight hook and JSX doubles.
// Not a React DOM renderer: effects, browser layout and child components are not exercised.
export function mount(path, { props = {}, api = async () => ({}), modules = {}, search = '' } = {}) {
  const state = [], calls = [], navigation = [], timers = [], storage = new Map();
  let cursor = 0;
  const react = {
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], v => { state[i] = typeof v === 'function' ? v(state[i]) : v; }]; },
    useRef(initial) { return { current: initial }; }, useEffect() {}, useMemo(fn) { return fn(); },
  };
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-router-dom': { useLocation: () => ({ state: null }), useNavigate: () => (...args) => navigation.push(args), useSearchParams: () => [new URLSearchParams(search)], Link: 'Link' },
    '../../services/api': { fetchApi: async (url, opts) => { calls.push({ url, ...opts }); return api(url, opts); } },
    './auth': { readReturnLocation: () => null, resolveReturnPath: role => `/${role.toLowerCase()}`, setUserRole() {} },
    '../../services/authPersistence': { markAuthSession() {} },
    '../../components/ui/formValidation': { API_ERROR_MARK: 'invalid', splitApiErrors: () => ({ fields: {}, toast: '' }) },
    '../../components/ui/focusInvalid': { focusFirstInvalid() {} },
    '../../components/ui/feedbackContext': { useAppFeedback: () => ({ notify() {} }) }, ...modules,
  };
  const require = name => mocks[name] ?? new Proxy({}, { get: (_, key) => key === '__esModule' ? true : key === 'default' ? name.split('/').at(-1) : String(key) });
  const source = readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) };
  new Function('require','exports','localStorage','window','setTimeout','clearTimeout', js)(require, exports, localStorage, {}, fn => { timers.push(fn); return timers.length; }, () => {});
  const render = () => { cursor = 0; return exports.default(props); };
  function all(predicate, root = render()) { const result = []; function visit(n) { if (Array.isArray(n)) n.forEach(visit); else if (n && typeof n === 'object' && n.props) { if (predicate(n)) result.push(n); visit(n.props.children); } } visit(root); return result; }
  function one(predicate) { const result = all(predicate); assert.equal(result.length, 1, 'expected one matching element'); return result[0]; }
  return { render, all, one, calls, navigation, timers, storage,
    input(id, value, extra = {}) { const n = one(n => n.props.id === id); n.props.onChange({ target: { name: n.props.name, value, type: n.props.type ?? 'text', ...extra } }); },
    submit() { return one(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); },
    error(id) { return one(n => n.props.htmlFor === id).props.error; },
  };
}
