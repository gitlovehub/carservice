import assert from 'node:assert/strict';
import {component,nodes} from './component-harness.mjs';
const {default:Bar}=component('src/pages/showcase/ServicePicksBar.tsx',{'react-router-dom':{Link:()=>null},'../../components/ui/Icon':{Icon:()=>null},'../../services/servicePicks':{bookingLinkFor:()=>'/booking'}});
const render=(ids,services)=>Bar({picks:{ids},services,onClear:()=>{}});
const count=tree=>nodes(tree,n=>n.type==='span'&&Array.isArray(n.props.children)&&n.props.children[0]==='Đã chọn ')[0].props.children[1];
assert.equal(count(render([1,2,3],[{id:1,name:'A',base_price:100}])),3);
assert.equal(count(render([1,2],[])),2); assert.equal(render([],[]),null);
