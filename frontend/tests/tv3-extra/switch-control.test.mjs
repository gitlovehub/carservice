import assert from 'node:assert/strict';
import {component} from './component-harness.mjs';
const {Switch}=component('src/components/ui/Switch.tsx');
const changes=[];const render=props=>Switch({checked:false,label:'Nhận thông báo',onChange:x=>changes.push(x),...props});
const off=render({});assert.equal(off.props.role,'switch');assert.equal(off.props['aria-checked'],false);assert.equal(off.props['aria-label'],'Nhận thông báo');off.props.onClick();assert.deepEqual(changes,[true]);
const on=render({checked:true});assert.equal(on.props['aria-checked'],true);on.props.onClick();assert.deepEqual(changes,[true,false]);
assert.equal(render({disabled:true}).props.disabled,true);assert.match(render({size:'sm'}).props.className,/w-\[38px\]/);assert.match(on.props.className,/w-\[46px\]/);
