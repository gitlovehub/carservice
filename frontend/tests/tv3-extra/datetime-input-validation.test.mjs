import assert from 'node:assert/strict';
import {component,nodes} from './component-harness.mjs';
const {DateTimeInput,DateInput}=component('src/components/ui/DateInput.tsx',{react:{useState:x=>[x,()=>{}]},'./Icon':{Icon:()=>null},'./fieldContext':{controlClass:'',useFieldControl:()=>null}});
const changes=[];const render=(value,disabled=false)=>DateTimeInput({value,disabled,onChange:x=>changes.push(x)});
const time=t=>nodes(t,n=>n.type==='input')[0].props;const date=t=>nodes(t,n=>n.type===DateInput)[0].props;
const tree=render('2026-11-26T09:30');assert.equal(time(tree).value,'09:30');time(tree).onChange({target:{value:'2359'}});assert.equal(changes.at(-1),'2026-11-26T23:59');const count=changes.length;time(tree).onChange({target:{value:'2400'}});time(tree).onChange({target:{value:'1260'}});time(render('')).onChange({target:{value:'1200'}});assert.equal(changes.length,count);
date(render('')).onChange({target:{value:'2026-11-27'}});assert.equal(changes.at(-1),'2026-11-27T23:59');date(tree).onChange({target:{value:'2026-11-28'}});assert.equal(changes.at(-1),'2026-11-28T09:30');date(tree).onChange({target:{value:''}});assert.equal(changes.at(-1),'');assert.equal(time(render('',true)).disabled,true);assert.equal(date(render('',true)).disabled,true);
