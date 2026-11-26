import assert from 'node:assert/strict';
import {overlay,nodes} from './overlay-harness.mjs';
let active=null,closed=false,selected=0,prevented=0,stopped=0;
const a={focus:()=>{active=a}},b={focus:()=>{active=b}},trigger={focus:()=>{active=trigger}};
let refIndex=0;const doc={body:{},get activeElement(){return active}};
const {Dropdown}=overlay('src/components/ui/Dropdown.tsx',{useState:x=>x===false?[true,v=>{closed=!v}]:[{top:8},()=>{}],useRef:x=>[{current:{querySelector:()=>trigger}},{current:{querySelectorAll:()=>[a,b]}},{current:x}][refIndex++]},{document:doc});
const t=Dropdown({items:[{label:'A',onSelect:()=>selected++},{type:'separator'},{label:'B',disabled:true,onSelect:()=>{}},{label:'C',onSelect:()=>{}}]});
const menu=nodes(t,n=>n.props?.role==='menu')[0].props;const items=nodes(t,n=>n.props?.role==='menuitem');assert.equal(items.length,3);assert.equal(items[1].props.disabled,true);assert.equal(nodes(t,n=>n.props?.role==='separator').length,1);
const key=k=>menu.onKeyDown({key:k,preventDefault:()=>prevented++,stopPropagation:()=>stopped++});active=a;key('ArrowUp');assert.equal(active,b);key('ArrowDown');assert.equal(active,a);key('End');assert.equal(active,b);key('Home');assert.equal(active,a);key('Escape');assert.equal(active,trigger);assert.equal(closed,true);assert.equal(stopped,1);assert.equal(prevented,5);items[0].props.onClick();assert.equal(selected,1);
