import assert from 'node:assert/strict';
import {component,nodes} from './component-harness.mjs';
const {LoadingState}=component('src/components/ui/States.tsx',{react:{},'../../config/labels':{LABELS:{state:{loading:'Đang tải'}}},'./Button':{},'./Icon':{}});
let t=LoadingState({});assert.equal(t.props.role,'status');assert.equal(t.props['aria-live'],'polite');assert.equal(t.props.children[1],'Đang tải');assert.match(t.props.className,/min-h/);
assert.equal(nodes(t,n=>n.type==='span')[0].props['aria-hidden'],'true');
t=LoadingState({label:'Đang lấy dịch vụ',compact:true});assert.equal(t.props.children[1],'Đang lấy dịch vụ');assert.match(t.props.className,/py-6/);assert.doesNotMatch(t.props.className,/min-h/);
