import assert from 'node:assert/strict';
import {component,nodes} from './component-harness.mjs';
const {PageHeader}=component('src/components/ui/PageHeader.tsx');
const t=PageHeader({title:'Dịch vụ',eyebrow:'Garage',description:'Mô tả',actions:'Thêm',children:'Bộ lọc',className:'custom'});
assert.equal(t.type,'header');assert.match(t.props.className,/custom/);
assert.deepEqual(nodes(t,n=>n.type==='h1').map(n=>n.props.children),['Dịch vụ']);
for(const value of ['Garage','Mô tả','Thêm','Bộ lọc']) assert.equal(nodes(t,n=>n.props.children===value).length,1);
const minimal=PageHeader({title:'Trang chủ'});assert.equal(nodes(minimal,n=>n.type==='p').length,0);assert.equal(nodes(minimal,n=>n.props.className?.includes('cs-btn-row')).length,0);
